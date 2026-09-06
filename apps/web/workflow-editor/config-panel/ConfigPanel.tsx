import React from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { X, Settings, HelpCircle, ShieldAlert, RefreshCw } from 'lucide-react'

export default function ConfigPanel() {
  const { 
    nodes, 
    selectedNodeId, 
    selectNode, 
    updateNodeConfig,
    setNodes,
    credentialsList,
    loadCredentials,
    workflowsList,
    loadWorkflows
  } = useWorkflowStore()

  React.useEffect(() => {
    const token = localStorage.getItem('token')
    const workspaceId = localStorage.getItem('workspace_id')
    if (token && workspaceId) {
      loadCredentials(token, workspaceId)
      loadWorkflows(token, workspaceId)
    }
  }, [loadCredentials, loadWorkflows, selectedNodeId])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  if (!selectedNode) {
    return (
      <aside className="w-80 border-l border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 h-full p-6 flex flex-col items-center justify-center text-center select-none">
        <div className="p-3 bg-slate-100 dark:bg-slate-950/50 rounded-full text-slate-400 dark:text-slate-500 mb-3 border border-slate-200 dark:border-slate-800">
          <Settings size={22} />
        </div>
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-[14px]">No Node Selected</h3>
        <p className="text-[11px] text-slate-400 max-w-[200px] mt-1">
          Click any trigger or action node on the canvas to configure its parameters.
        </p>
      </aside>
    )
  }

  const { type, data } = selectedNode
  const config = (data.config as any) || {}

  const handleUpdate = (field: string, value: any) => {
    updateNodeConfig(selectedNode.id, { [field]: value })
  }

  const handleRenameLabel = (newName: string) => {
    const nextNodes = nodes.map((n) => {
      if (n.id === selectedNode.id) {
        const currentData = n.data as any
        return {
          ...n,
          data: {
            ...currentData,
            label: newName
          }
        }
      }
      return n
    })
    setNodes(nextNodes)
  }

  const handleSelectCredential = (credId: string | null) => {
    const nextNodes = nodes.map((n) => {
      if (n.id === selectedNode.id) {
        const currentData = n.data as any
        return {
          ...n,
          data: {
            ...currentData,
            credentialId: credId || null
          }
        }
      }
      return n
    })
    setNodes(nextNodes)
    useWorkflowStore.getState().pushHistory(nextNodes, useWorkflowStore.getState().edges)
  }

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 h-full flex flex-col z-10 relative shadow-sm text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-slate-500 dark:text-slate-400" />
          <h2 className="font-bold text-slate-700 dark:text-slate-200 text-[14px]">Node Properties</h2>
        </div>
        <button 
          onClick={() => selectNode(null)} 
          className="text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition"
        >
          <X size={15} />
        </button>
      </div>

      {/* Scrollable Form Area */}
      <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
        {/* Node Name Rename */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Display Label
          </label>
          <input
            type="text"
            value={(data.label as string) || ''}
            onChange={(e) => handleRenameLabel(e.target.value)}
            className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="border-b border-slate-100 dark:border-slate-850 my-1" />

        {/* HTTP Request Form */}
        {type === 'http-request' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Authentication Credential
              </label>
              <select
                value={(selectedNode.data as any).credentialId || ''}
                onChange={(e) => handleSelectCredential(e.target.value || null)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">None (No Authentication)</option>
                {credentialsList.map((cred: any) => (
                  <option key={cred.id} value={cred.id}>
                    {cred.name} ({cred.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Request Method
              </label>
              <select
                value={config.method || 'GET'}
                onChange={(e) => handleUpdate('method', e.target.value)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Endpoint URL
              </label>
              <input
                type="text"
                value={config.url || ''}
                placeholder="https://api.example.com/data"
                onChange={(e) => handleUpdate('url', e.target.value)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1 leading-normal">
                <HelpCircle size={10} className="shrink-0" />
                <span>Supports template tags: <code>{"{{ $json.email }}"}</code></span>
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Headers (JSON)
              </label>
              <textarea
                value={config.headers ? JSON.stringify(config.headers, null, 2) : '{}'}
                rows={3}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    handleUpdate('headers', parsed)
                  } catch (err) {}
                }}
                className="w-full text-[12px] font-mono px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                JSON Body
              </label>
              <textarea
                value={config.body ? JSON.stringify(config.body, null, 2) : ''}
                rows={4}
                placeholder='{ "key": "value" }'
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    handleUpdate('body', parsed)
                  } catch (err) {
                    handleUpdate('body', e.target.value)
                  }
                }}
                className="w-full text-[12px] font-mono px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Set Variable Form */}
        {type === 'set' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Variable Target
              </label>
              <input
                type="text"
                value={config.variable || ''}
                placeholder="e.g. lead_score"
                onChange={(e) => handleUpdate('variable', e.target.value)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Assigned Value
              </label>
              <input
                type="text"
                value={config.value || ''}
                placeholder="e.g. 100"
                onChange={(e) => handleUpdate('value', e.target.value)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* IF Condition Form */}
        {type === 'if' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Value 1
              </label>
              <input
                type="text"
                value={config.value1 || ''}
                placeholder="{{ $json.status }}"
                onChange={(e) => handleUpdate('value1', e.target.value)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Operator
              </label>
              <select
                value={config.condition || 'equals'}
                onChange={(e) => handleUpdate('condition', e.target.value)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-950"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Does Not Equal</option>
                <option value="contains">Contains</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Value 2
              </label>
              <input
                type="text"
                value={config.value2 || ''}
                placeholder="e.g. success"
                onChange={(e) => handleUpdate('value2', e.target.value)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Delay Waiter Form */}
        {type === 'delay' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Duration (Seconds)
              </label>
              <input
                type="number"
                value={config.duration || 5}
                onChange={(e) => handleUpdate('duration', parseInt(e.target.value) || 0)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* AI Prompt / LLM Form */}
        {type === 'ai-prompt' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                API Key Credential
              </label>
              <select
                value={(selectedNode.data as any).credentialId || ''}
                onChange={(e) => handleSelectCredential(e.target.value || null)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">Simulation Mode (No Key)</option>
                {credentialsList.map((cred: any) => (
                  <option key={cred.id} value={cred.id}>
                    {cred.name} ({cred.type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                AI Model
              </label>
              <select
                value={config.model || 'gpt-4o'}
                onChange={(e) => handleUpdate('model', e.target.value)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="gpt-4o">OpenAI GPT-4o</option>
                <option value="gpt-3.5-turbo">OpenAI GPT-3.5 Turbo</option>
                <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                System Persona Prompt
              </label>
              <textarea
                value={config.system_prompt || ''}
                rows={2}
                placeholder="You are a helpful AI assistant."
                onChange={(e) => handleUpdate('system_prompt', e.target.value)}
                className="w-full text-[12px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                User Prompt Template
              </label>
              <textarea
                value={config.user_prompt || ''}
                rows={4}
                placeholder="Summarize the following: {{ $json.body.message }}"
                onChange={(e) => handleUpdate('user_prompt', e.target.value)}
                className="w-full text-[12px] font-mono px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1 leading-normal">
                <HelpCircle size={10} className="shrink-0" />
                <span>Supports template tags: <code>{"{{ $json.key }}"}</code></span>
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Temperature ({config.temperature ?? 0.7})
              </label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={config.temperature ?? 0.7}
                onChange={(e) => handleUpdate('temperature', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>
        )}

        {/* Webhook Form */}
        {type === 'webhook' && (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg text-blue-750 dark:text-blue-300 text-[12px] leading-relaxed">
              <span className="font-semibold text-blue-700 dark:text-blue-450">Inbound trigger:</span> This node automatically creates a unique webhook URL on publishing. Send POST requests to invoke this workflow flow.
            </div>
          </div>
        )}

        {/* Sub-Workflow Form */}
        {type === 'execute-workflow' && (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 rounded-lg text-teal-750 dark:text-teal-300 text-[12px] leading-relaxed">
              <span className="font-semibold text-teal-700 dark:text-teal-400">Sub-Workflow:</span> Select a published workflow snapshot from your active workspace to execute inline as a nested child node.
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Select Target Sub-Workflow
              </label>
              <select
                value={config.target_workflow_id || ''}
                onChange={(e) => handleUpdate('target_workflow_id', e.target.value)}
                className="w-full text-[13px] px-3 py-2 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500 font-medium"
              >
                <option value="">-- Choose Published Workflow --</option>
                {workflowsList
                  .filter((wf: any) => wf.id !== useWorkflowStore.getState().workflowId)
                  .map((wf: any) => (
                    <option key={wf.id} value={wf.id}>
                      {wf.name} {wf.active_version_id ? '(Published)' : '(Draft)'}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Or Workflow ID / Tag Template
              </label>
              <input
                type="text"
                value={config.target_workflow_id || ''}
                placeholder="e.g. wfs_123456789 or {{ $json.child_id }}"
                onChange={(e) => handleUpdate('target_workflow_id', e.target.value)}
                className="w-full text-[12px] font-mono px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        )}

        {/* Loop Items Form */}
        {type === 'loop-items' && (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/40 rounded-lg text-violet-750 dark:text-violet-300 text-[12px] leading-relaxed">
              <span className="font-semibold text-violet-700 dark:text-violet-400">Loop Items:</span> Iterates through an array expression and passes each item downstream, aggregating processed results.
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Items Array Expression
              </label>
              <input
                type="text"
                value={config.items_path || '{{ $json.items }}'}
                placeholder="e.g. {{ $json.items }} or $json.data"
                onChange={(e) => handleUpdate('items_path', e.target.value)}
                className="w-full text-[12px] font-mono px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-500"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1 leading-normal">
                <HelpCircle size={10} className="shrink-0" />
                <span>Specify variable path resolving to array list</span>
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Max Iterations Limit ({config.max_iterations ?? 100})
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={config.max_iterations ?? 100}
                onChange={(e) => handleUpdate('max_iterations', parseInt(e.target.value) || 100)}
                className="w-full text-[12px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-violet-500 font-medium"
              />
            </div>
          </div>
        )}

        {/* Error Handling & Retries Section (All non-webhook nodes) */}
        {type !== 'webhook' && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-bold text-[12px]">
              <ShieldAlert size={14} className="text-amber-500" />
              <span>Error Handling & Retries</span>
            </div>

            {/* Retry on Failure */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col">
                <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Retry on Failure</span>
                <span className="text-[10px] text-slate-400">Retry node on transient errors</span>
              </div>
              <input
                type="checkbox"
                checked={!!config.retry_on_fail}
                onChange={(e) => handleUpdate('retry_on_fail', e.target.checked)}
                className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            {config.retry_on_fail && (
              <div className="grid grid-cols-2 gap-2 pl-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Max Retries</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={config.max_retries ?? 3}
                    onChange={(e) => handleUpdate('max_retries', parseInt(e.target.value) || 1)}
                    className="w-full text-[12px] px-2.5 py-1 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Delay (s)</label>
                  <input
                    type="number"
                    min={0.1}
                    max={60}
                    step={0.5}
                    value={config.retry_delay ?? 2}
                    onChange={(e) => handleUpdate('retry_delay', parseFloat(e.target.value) || 1)}
                    className="w-full text-[12px] px-2.5 py-1 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            )}

            {/* Continue on Fail */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col">
                <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">Continue on Error</span>
                <span className="text-[10px] text-slate-400">Do not fail workflow on error</span>
              </div>
              <input
                type="checkbox"
                checked={!!config.continue_on_fail}
                onChange={(e) => handleUpdate('continue_on_fail', e.target.checked)}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Custom Code Script Form */}
        {type === 'code-script' && (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-lg text-indigo-750 dark:text-indigo-300 text-[12px] leading-relaxed">
              <span className="font-semibold text-indigo-700 dark:text-indigo-400">Custom Code Script:</span> Write Python expressions to process, map, or filter data. Available variables: <code>$json</code>, <code>$input</code>, <code>$node</code>. Assign output object to <code>output</code> or <code>result</code>.
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Script Engine / Language
              </label>
              <select
                value={config.language || 'python'}
                onChange={(e) => handleUpdate('language', e.target.value)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="python">Python 3 (Sandboxed)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Python Code Editor
                </label>
              </div>
              <textarea
                value={config.code || ''}
                rows={10}
                placeholder="# Write Python transformation code here&#10;output = { 'summary': sum($json.get('items', [])) }"
                onChange={(e) => handleUpdate('code', e.target.value)}
                className="w-full text-[12px] font-mono px-3.5 py-2 border border-slate-300 dark:border-slate-800 bg-slate-900 text-emerald-400 rounded-lg focus:outline-none focus:border-indigo-500 leading-relaxed shadow-inner"
              />
              <div className="mt-2 flex flex-col gap-1 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950/50 p-2 rounded border border-slate-200 dark:border-slate-800">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Quick Insert Snippets:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => handleUpdate('code', '# Array Map & Filter\noutput = [x for x in $json.get("items", []) if x.get("active")]')}
                    className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-[10px] font-mono"
                  >
                    Filter Array
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate('code', '# Calculate Totals\noutput = {"total": sum($json.get("values", [])), "count": len($json.get("values", []))}')}
                    className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-[10px] font-mono"
                  >
                    Calculate Sum
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate('code', '# Merge Node Data\noutput = {**$json, **$node.get("node_1", {})}')}
                    className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-[10px] font-mono"
                  >
                    Merge Node Payload
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Respond to Webhook Form */}
        {type === 'respond-to-webhook' && (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg text-emerald-750 dark:text-emerald-300 text-[12px] leading-relaxed">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Sync Response:</span> Configures the HTTP status code, headers, and body returned when this workflow is called via <code>?sync=true</code> webhook requests.
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                HTTP Response Code
              </label>
              <select
                value={config.status_code ?? 200}
                onChange={(e) => handleUpdate('status_code', parseInt(e.target.value) || 200)}
                className="w-full text-[13px] px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value={200}>200 OK</option>
                <option value={201}>201 Created</option>
                <option value={202}>202 Accepted</option>
                <option value={204}>204 No Content</option>
                <option value={400}>400 Bad Request</option>
                <option value={401}>401 Unauthorized</option>
                <option value={403}>403 Forbidden</option>
                <option value={404}>404 Not Found</option>
                <option value={500}>500 Internal Server Error</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Response Body Template
              </label>
              <textarea
                value={config.response_body || '{{ $json }}'}
                rows={4}
                placeholder="e.g. {{ $json }} or { &quot;success&quot;: true }"
                onChange={(e) => handleUpdate('response_body', e.target.value)}
                className="w-full text-[12px] font-mono px-3.5 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1 leading-normal">
                <HelpCircle size={10} className="shrink-0" />
                <span>Supports template tags like <code>{"{{ $json }}"}</code></span>
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
