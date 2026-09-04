import asyncio
import httpx
import base64
import json
import re
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.credential import Credential
from app.models.execution_log import ExecutionLog
from app.models.workflow_version import WorkflowVersion
from app.core.crypto import decrypt_data
from app.db.redis import redis_client

logger = logging.getLogger(__name__)

class WorkflowExecutor:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def publish_event(self, execution_id: str, payload: dict):
        """
        Publishes real-time execution step events to Redis Pub/Sub channel for WebSocket relay.
        """
        try:
            channel_name = f"execution:{execution_id}"
            await redis_client.publish(channel_name, json.dumps(payload))
        except Exception as e:
            logger.warning(f"Failed to publish execution event to Redis channel execution:{execution_id}: {e}")

    def resolve_value(self, val: Any, context: Dict[str, Any]) -> Any:
        """
        Recursively evaluates values, resolving template tags like {{ $json.key }}.
        """
        if isinstance(val, str):
            # 1. Check if it's an exact single-tag expression, e.g. "{{ $json.count }}"
            # In this case we want to return the raw datatype (e.g. int, bool, dict) rather than stringifying it.
            exact_match = re.match(r"^\s*\{\{\s*([a-zA-Z0-9_\.\$\[\]\'\"]+)\s*\}\}\s*$", val)
            if exact_match:
                path = exact_match.group(1)
                return self.get_value_by_path(path, context)
            
            # 2. General string interpolation for mixed strings, e.g. "User id is {{ $json.id }}"
            def replace_tag(match):
                path = match.group(1)
                resolved = self.get_value_by_path(path, context)
                if resolved is None:
                    return ""
                if isinstance(resolved, (dict, list)):
                    return json.dumps(resolved)
                return str(resolved)

            return re.sub(r"\{\{\s*([a-zA-Z0-9_\.\$\[\]\'\"]+)\s*\}\}", replace_tag, val)

        elif isinstance(val, dict):
            return {k: self.resolve_value(v, context) for k, v in val.items()}
        elif isinstance(val, list):
            return [self.resolve_value(item, context) for item in val]
        return val

    def get_value_by_path(self, path: str, context: Dict[str, Any]) -> Any:
        """
        Retrieves a nested value from the context by path, e.g. "$json.user.email" or "$node.node-1.status"
        """
        parts = path.strip().split(".")
        if not parts:
            return None
        
        # Determine the root namespace
        root_key = parts[0]
        if root_key not in context:
            return None
        
        current = context[root_key]
        for part in parts[1:]:
            if isinstance(current, dict):
                # Support bracket indices or simple keys
                if "[" in part and part.endswith("]"):
                    key_part, idx_part = part.split("[", 1)
                    idx = int(idx_part[:-1])
                    current = current.get(key_part)
                    if isinstance(current, list) and idx < len(current):
                        current = current[idx]
                    else:
                        return None
                else:
                    current = current.get(part)
            elif isinstance(current, list):
                try:
                    idx = int(part)
                    if idx < len(current):
                        current = current[idx]
                    else:
                        return None
                except ValueError:
                    return None
            else:
                return None
        return current

    async def execute_node(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a single node's operation and returns the node execution output data.
        """
        node_type = node.get("type")
        config = node.get("data", {}).get("config", {})

        if node_type == "webhook":
            # Webhook triggers just pass their trigger inputs downstream
            return context.get("$json", {})

        elif node_type == "set":
            variable = config.get("variable", "key")
            raw_value = config.get("value", "")
            resolved_value = self.resolve_value(raw_value, context)
            
            # Update the context namespace for the set variable
            if "$json" not in context:
                context["$json"] = {}
            context["$json"][variable] = resolved_value
            return {variable: resolved_value}

        elif node_type == "delay":
            duration = int(config.get("duration", 5))
            logger.info(f"Node {node.get('id')} pausing execution for {duration}s...")
            await asyncio.sleep(duration)
            return {"slept": duration}

        elif node_type == "if":
            val1 = self.resolve_value(config.get("value1", ""), context)
            val2 = self.resolve_value(config.get("value2", ""), context)
            op = config.get("condition", "equals")

            result = False
            if op == "equals":
                result = str(val1) == str(val2)
            elif op == "not_equals":
                result = str(val1) != str(val2)
            elif op == "contains":
                result = str(val2) in str(val1)

            # Store selection branch in context so graph traversal can read it
            node["_active_branch"] = "true" if result else "false"
            return {"result": result, "branch": node["_active_branch"]}

        elif node_type == "switch":
            val = self.resolve_value(config.get("value", ""), context)
            # Route matches, default to route1
            branch = "route1"
            if str(val) == "2":
                branch = "route2"
            node["_active_branch"] = branch
            return {"branch": branch}

        elif node_type == "http-request":
            method = config.get("method", "GET").upper()
            url = self.resolve_value(config.get("url", ""), context)
            headers = self.resolve_value(config.get("headers", {}), context)
            body = self.resolve_value(config.get("body", {}), context)
            
            # Resolve Credentials (if bound)
            credential_id = node.get("data", {}).get("credentialId")
            if credential_id:
                logger.info(f"Retrieving credential {credential_id} for node {node.get('id')}")
                stmt = select(Credential).filter(Credential.id == credential_id)
                res = await self.db.execute(stmt)
                cred = res.scalars().first()
                if cred:
                    decrypted_str = decrypt_data(cred.encrypted_data)
                    cred_payload = json.loads(decrypted_str)
                    
                    if cred.type == "basic-auth":
                        username = cred_payload.get("username", "")
                        password = cred_payload.get("password", "")
                        auth_str = f"{username}:{password}"
                        auth_b64 = base64.b64encode(auth_str.encode()).decode()
                        headers["Authorization"] = f"Basic {auth_b64}"
                    elif cred.type == "api-key":
                        api_key = cred_payload.get("api_key", "")
                        # If key has spaces (e.g. "Bearer token"), use directly
                        if " " in api_key:
                            headers["Authorization"] = api_key
                        else:
                            headers["Authorization"] = f"Bearer {api_key}"

            logger.info(f"Performing HTTP Request: {method} {url}")
            async with httpx.AsyncClient(timeout=30.0) as client:
                req_kwargs: Dict[str, Any] = {"headers": headers}
                if method in ("POST", "PUT", "PATCH") and body:
                    req_kwargs["json"] = body
                
                response = await client.request(method, url, **req_kwargs)
                
                # Process response payload
                try:
                    resp_data = response.json()
                except ValueError:
                    resp_data = response.text

                return {
                    "status": response.status_code,
                    "headers": dict(response.headers),
                    "body": resp_data
                }

        elif node_type == "ai-prompt":
            model = config.get("model", "gpt-4o")
            system_prompt = self.resolve_value(config.get("system_prompt", "You are a helpful AI assistant."), context)
            user_prompt = self.resolve_value(config.get("user_prompt", "Hello!"), context)
            temperature = float(config.get("temperature", 0.7))

            headers = {"Content-Type": "application/json"}
            api_key = None

            # Resolve bound credential if present
            credential_id = node.get("data", {}).get("credentialId")
            if credential_id:
                stmt = select(Credential).filter(Credential.id == credential_id)
                res = await self.db.execute(stmt)
                cred = res.scalars().first()
                if cred:
                    decrypted_payload = json.loads(decrypt_data(cred.encrypted_data))
                    api_key = decrypted_payload.get("api_key") or decrypted_payload.get("token") or decrypted_payload.get("secret")

            if api_key:
                if " " in api_key:
                    headers["Authorization"] = api_key
                else:
                    headers["Authorization"] = f"Bearer {api_key}"

            logger.info(f"Executing AI Prompt node {node.get('id')} (model={model})...")

            # Fallback/simulation response if no credential attached
            if not headers.get("Authorization"):
                simulated_response = f"[NexFlow AI ({model})]: Processed prompt: '{user_prompt}'"
                return {
                    "model": model,
                    "response": simulated_response,
                    "usage": {"prompt_tokens": len(str(user_prompt).split()), "completion_tokens": len(simulated_response.split())}
                }

            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json={
                        "model": model,
                        "messages": [
                            {"role": "system", "content": str(system_prompt)},
                            {"role": "user", "content": str(user_prompt)}
                        ],
                        "temperature": temperature
                    }
                )
                if resp.status_code == 200:
                    resp_json = resp.json()
                    choices = resp_json.get("choices", [])
                    content = choices[0].get("message", {}).get("content", "") if choices else ""
                    return {
                        "model": model,
                        "response": content,
                        "usage": resp_json.get("usage", {})
                    }
                else:
                    return {
                        "model": model,
                        "response": f"AI API response {resp.status_code}: {resp.text}",
                        "error": resp.text
                    }

        raise ValueError(f"Unknown node type: {node_type}")

    async def execute_workflow(self, execution_log_id: str) -> None:
        """
        Executes a workflow graph traversal asynchronously, logging node trace events.
        """
        # 1. Fetch Execution Log
        stmt = select(ExecutionLog).filter(ExecutionLog.id == execution_log_id)
        res = await self.db.execute(stmt)
        exec_log = res.scalars().first()
        if not exec_log:
            logger.error(f"Execution log {execution_log_id} not found.")
            return

        exec_log.status = "RUNNING"
        exec_log.started_at = datetime.now(timezone.utc)
        await self.db.commit()

        # 2. Fetch Workflow Version
        stmt = select(WorkflowVersion).filter(WorkflowVersion.id == exec_log.version_id)
        res = await self.db.execute(stmt)
        version = res.scalars().first()
        if not version:
            exec_log.status = "FAILED"
            exec_log.error_message = "Associated workflow version snapshot not found."
            exec_log.finished_at = datetime.now(timezone.utc)
            await self.db.commit()
            return

        nodes = version.nodes
        connections = version.connections

        # Index nodes
        nodes_by_id = {n["id"]: n for n in nodes}
        
        # Build graph edges
        outgoing_edges: Dict[str, List[Dict[str, Any]]] = {}
        incoming_counts: Dict[str, int] = {n["id"]: 0 for n in nodes}
        for conn in connections:
            source = conn.get("source")
            target = conn.get("target")
            if source and target:
                if source not in outgoing_edges:
                    outgoing_edges[source] = []
                outgoing_edges[source].append(conn)
                incoming_counts[target] += 1

        # 3. Locate start nodes
        # Primary: find trigger node (type = 'webhook'). Secondary: nodes with 0 incoming edges.
        start_node_id = None
        for n in nodes:
            if n.get("type") == "webhook":
                start_node_id = n["id"]
                break
        
        if not start_node_id:
            # Fallback to first node with no incoming edges
            for n_id, count in incoming_counts.items():
                if count == 0:
                    start_node_id = n_id
                    break

        if not start_node_id and nodes:
            # Fallback to any node
            start_node_id = nodes[0]["id"]

        if not start_node_id:
            exec_log.status = "SUCCESS"
            exec_log.finished_at = datetime.now(timezone.utc)
            await self.db.commit()
            return

        # Initialize context namespaces
        context = {
            "$json": exec_log.input_data or {},
            "$node": {}
        }
        node_executions = []
        visited = set()
        queue = [start_node_id]
        overall_status = "SUCCESS"
        error_msg = None

        # 4. Traversal Loop
        while queue:
            node_id = queue.pop(0)
            if node_id in visited:
                continue
            visited.add(node_id)

            node = nodes_by_id.get(node_id)
            if not node:
                continue

            node_started = datetime.now(timezone.utc)
            node_type = node.get("type", "")
            logger.info(f"Executing node {node_id} ({node_type})...")

            await self.publish_event(execution_log_id, {
                "event": "NODE_STARTED",
                "execution_id": execution_log_id,
                "node_id": node_id,
                "node_type": node_type,
                "started_at": node_started.isoformat()
            })

            try:
                # Capture inputs passed into node
                node_inputs = {
                    "$json": context["$json"].copy(),
                    "$node": {k: v.copy() for k, v in context["$node"].items()}
                }

                # Run node
                node_output = await self.execute_node(node, context)

                # Record results
                context["$json"] = node_output
                context["$node"][node_id] = node_output
                finished_at_iso = datetime.now(timezone.utc).isoformat()

                node_executions.append({
                    "node_id": node_id,
                    "node_type": node_type,
                    "status": "SUCCESS",
                    "started_at": node_started.isoformat(),
                    "finished_at": finished_at_iso,
                    "inputs": node_inputs,
                    "outputs": node_output
                })

                await self.publish_event(execution_log_id, {
                    "event": "NODE_COMPLETED",
                    "execution_id": execution_log_id,
                    "node_id": node_id,
                    "node_type": node_type,
                    "outputs": node_output,
                    "finished_at": finished_at_iso
                })

                # Determine next branches to visit
                edges = outgoing_edges.get(node_id, [])
                active_branch = node.get("_active_branch")
                
                for edge in edges:
                    target = edge.get("target")
                    # If this is a conditional node, only follow matching active branch
                    if active_branch:
                        source_handle = edge.get("sourceHandle")
                        if source_handle != active_branch:
                            continue
                    
                    if target and target not in visited:
                        queue.append(target)

            except Exception as e:
                logger.exception(f"Node {node_id} execution failed.")
                overall_status = "FAILED"
                error_msg = str(e)
                finished_at_iso = datetime.now(timezone.utc).isoformat()
                
                node_executions.append({
                    "node_id": node_id,
                    "node_type": node_type,
                    "status": "FAILED",
                    "started_at": node_started.isoformat(),
                    "finished_at": finished_at_iso,
                    "inputs": {},
                    "outputs": {},
                    "error": error_msg
                })

                await self.publish_event(execution_log_id, {
                    "event": "NODE_FAILED",
                    "execution_id": execution_log_id,
                    "node_id": node_id,
                    "node_type": node_type,
                    "error": error_msg,
                    "finished_at": finished_at_iso
                })
                break # Halt executing remainder of the graph

        # 5. Finalize execution status
        exec_log.status = overall_status
        exec_log.output_data = context["$json"]
        exec_log.node_executions = node_executions
        exec_log.error_message = error_msg
        exec_log.finished_at = datetime.now(timezone.utc)
        await self.db.commit()

        await self.publish_event(execution_log_id, {
            "event": "WORKFLOW_FINISHED",
            "execution_id": execution_log_id,
            "status": overall_status,
            "error_message": error_msg,
            "finished_at": exec_log.finished_at.isoformat()
        })
