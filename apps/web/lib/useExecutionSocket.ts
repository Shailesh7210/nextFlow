import { useEffect, useRef } from 'react'
import { useWorkflowStore } from '../store/useWorkflowStore'
import { WS_BACKEND_URL } from './config'


export function useExecutionSocket(token?: string, workspaceId?: string) {
  const activeExecutionId = useWorkflowStore((s) => s.activeExecutionId)
  const selectedExecution = useWorkflowStore((s) => s.selectedExecution)
  const setNodeExecutionState = useWorkflowStore((s) => s.setNodeExecutionState)
  const loadExecutions = useWorkflowStore((s) => s.loadExecutions)
  const socketRef = useRef<WebSocket | null>(null)

  const targetExecutionId = activeExecutionId || selectedExecution?.id

  useEffect(() => {
    if (!targetExecutionId) {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      return
    }

    const wsUrl = `${WS_BACKEND_URL}/api/v1/ws/executions/${targetExecutionId}`
    console.log(`[WebSocket] Connecting to ${wsUrl}...`)
    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
      console.log(`[WebSocket] Connected for execution ${targetExecutionId}`)
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        const { event: eventType, node_id, status } = payload

        if (eventType === 'NODE_STARTED' && node_id) {
          setNodeExecutionState(node_id, 'RUNNING')
        } else if (eventType === 'NODE_COMPLETED' && node_id) {
          setNodeExecutionState(node_id, 'SUCCESS')
        } else if (eventType === 'NODE_FAILED' && node_id) {
          setNodeExecutionState(node_id, 'FAILED')
        } else if (eventType === 'WORKFLOW_FINISHED') {
          if (token && workspaceId) {
            loadExecutions(token, workspaceId)
          }
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message frame:', err)
      }
    }

    ws.onerror = (err) => {
      console.warn('[WebSocket] Error event:', err)
    }

    ws.onclose = () => {
      console.log(`[WebSocket] Disconnected from execution ${targetExecutionId}`)
    }

    return () => {
      ws.close()
      socketRef.current = null
    }
  }, [targetExecutionId, setNodeExecutionState, loadExecutions, token, workspaceId])
}
