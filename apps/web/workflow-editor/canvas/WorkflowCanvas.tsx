import React, { useCallback, useMemo } from 'react'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { nodeTypes } from '../nodes/CustomNodes'
import { useExecutionSocket } from '@/lib/useExecutionSocket'

export default function WorkflowCanvas() {
  // Activate real-time execution socket
  useExecutionSocket()

  const {
    nodes,
    edges,
    nodeExecutionStates,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode
  } = useWorkflowStore()

  // Track node selection for side panel config editing
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    selectNode(node.id)
  }, [selectNode])

  // Deselect node if user clicks on the canvas background
  const onPaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  // Dynamically compute edge animations & glow colors during active executions
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const sourceState = nodeExecutionStates[edge.source]
      const targetState = nodeExecutionStates[edge.target]

      const isRunning = sourceState === 'RUNNING' || targetState === 'RUNNING'
      const isPassed = sourceState === 'SUCCESS' && targetState === 'SUCCESS'
      const isFailed = sourceState === 'FAILED' || targetState === 'FAILED'

      if (isRunning) {
        return {
          ...edge,
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 3 }
        }
      }
      if (isPassed) {
        return {
          ...edge,
          animated: false,
          style: { stroke: '#10b981', strokeWidth: 2.5 }
        }
      }
      if (isFailed) {
        return {
          ...edge,
          animated: false,
          style: { stroke: '#f43f5e', strokeWidth: 2 }
        }
      }

      return edge
    })
  }, [edges, nodeExecutionStates])

  return (
    <div className="w-full h-full relative" style={{ height: 'calc(100vh - 64px)' }}>
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#334155" gap={16} size={1.5} />
        <Controls position="bottom-left" />
        <MiniMap 
          position="bottom-right" 
          nodeColor={(n) => {
            if (n.type === 'webhook') return '#dbeafe'
            if (n.type === 'http-request') return '#dcfce7'
            return '#f1f5f9'
          }} 
          style={{ height: 100, width: 150 }}
        />
      </ReactFlow>
    </div>
  )
}
