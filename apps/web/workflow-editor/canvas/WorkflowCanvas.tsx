import React, { useCallback } from 'react'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  Node, 
  Edge,
  NodeChange,
  EdgeChange,
  Connection
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { nodeTypes } from '../nodes/CustomNodes'

export default function WorkflowCanvas() {
  const {
    nodes,
    edges,
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

  return (
    <div className="w-full h-full relative" style={{ height: 'calc(100vh - 64px)' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
