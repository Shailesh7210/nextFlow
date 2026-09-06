import { create } from 'zustand'
import { 
  Connection, 
  Edge, 
  Node, 
  addEdge, 
  applyNodeChanges, 
  applyEdgeChanges, 
  NodeChange, 
  EdgeChange 
} from '@xyflow/react'

const BACKEND_URL = 'http://localhost:8000'

interface HistoryState {
  nodes: Node[]
  edges: Edge[]
}

interface WorkflowState {
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  workflowId: string | null
  workflowName: string
  workflowDescription: string
  isActive: boolean
  activeVersionId: string | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  isCredentialsModalOpen: boolean
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void

  // Undo/Redo Stacks
  history: HistoryState[]
  historyIndex: number

  // Actions
  initWorkflow: (id: string, name: string) => void
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (type: string) => void
  selectNode: (id: string | null) => void
  updateNodeConfig: (id: string, config: any) => void
  
  // History Actions
  pushHistory: (nodes: Node[], edges: Edge[]) => void
  undo: () => void
  redo: () => void
  setCredentialsModalOpen: (open: boolean) => void

  credentialsList: any[]
  workflowsList: any[]
  executionsList: any[]
  selectedExecution: any | null
  activeExecutionId: string | null
  nodeExecutionStates: Record<string, 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED'>
  isExecutionsDrawerOpen: boolean
  isExecuting: boolean

  setExecutionsDrawerOpen: (open: boolean) => void
  setSelectedExecution: (exec: any | null) => void
  setActiveExecutionId: (id: string | null) => void
  setNodeExecutionState: (nodeId: string, state: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED') => void
  resetNodeExecutionStates: () => void
  
  // API Integration Actions
  loadWorkflow: (id: string, token: string, workspaceId: string) => Promise<void>
  saveWorkflow: (token: string, workspaceId: string) => Promise<void>
  publishWorkflow: (token: string, workspaceId: string) => Promise<void>
  toggleActivation: (token: string, workspaceId: string) => Promise<void>
  loadCredentials: (token: string, workspaceId: string) => Promise<void>
  loadWorkflows: (token: string, workspaceId: string) => Promise<void>
  loadExecutions: (token: string, workspaceId: string) => Promise<void>
  executeWorkflow: (token: string, workspaceId: string, inputData?: any) => Promise<void>
  importWorkflowJson: (jsonString: string) => boolean
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  workflowId: null,
  workflowName: 'New Workflow',
  workflowDescription: '',
  isActive: false,
  activeVersionId: null,
  isLoading: false,
  isSaving: false,
  error: null,
  credentialsList: [],
  workflowsList: [],
  executionsList: [],
  selectedExecution: null,
  activeExecutionId: null,
  nodeExecutionStates: {},
  isCredentialsModalOpen: false,
  isExecutionsDrawerOpen: false,
  isExecuting: false,
  theme: 'dark',

  setExecutionsDrawerOpen: (open) => set({ isExecutionsDrawerOpen: open }),
  setSelectedExecution: (exec) => set({ selectedExecution: exec }),
  setActiveExecutionId: (id) => set({ activeExecutionId: id }),
  setNodeExecutionState: (nodeId, state) => set((prev) => ({
    nodeExecutionStates: {
      ...prev.nodeExecutionStates,
      [nodeId]: state
    }
  })),
  resetNodeExecutionStates: () => set({ nodeExecutionStates: {} }),
  
  history: [],
  historyIndex: -1,

  initWorkflow: (id, name) => {
    const initialNodes: Node[] = []
    const initialEdges: Edge[] = []
    set({
      workflowId: id,
      workflowName: name,
      nodes: initialNodes,
      edges: initialEdges,
      selectedNodeId: null,
      history: [{ nodes: initialNodes, edges: initialEdges }],
      historyIndex: 0,
      error: null
    })
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setCredentialsModalOpen: (open) => set({ isCredentialsModalOpen: open }),
  setTheme: (theme) => set({ theme }),

  onNodesChange: (changes) => {
    const nextNodes = applyNodeChanges(changes, get().nodes)
    set({ nodes: nextNodes })
    
    // Check if changes include operations like deleting nodes
    const hasStructureChange = changes.some(
      (c) => c.type === 'remove' || c.type === 'add'
    )
    if (hasStructureChange) {
      get().pushHistory(nextNodes, get().edges)
    }
  },

  onEdgesChange: (changes) => {
    const nextEdges = applyEdgeChanges(changes, get().edges)
    set({ edges: nextEdges })

    const hasRemove = changes.some((c) => c.type === 'remove')
    if (hasRemove) {
      get().pushHistory(get().nodes, nextEdges)
    }
  },

  onConnect: (connection) => {
    // Prevent connecting input to input or output to output
    if (
      (connection.sourceHandle === 'input' && connection.targetHandle === 'input') ||
      (connection.sourceHandle === 'output' && connection.targetHandle === 'output')
    ) {
      return
    }

    const nextEdges = addEdge(
      { 
        ...connection, 
        id: `edge-${connection.source}-${connection.target}`,
        // Styling edges
        style: { stroke: '#94a3b8', strokeWidth: 2 }
      }, 
      get().edges
    )
    set({ edges: nextEdges })
    get().pushHistory(get().nodes, nextEdges)
  },

  addNode: (type) => {
    const id = `${type}_${Math.random().toString(36).substr(2, 9)}`
    
    // Default node configs
    let config = {}
    if (type === 'http-request') {
      config = { method: 'GET', url: '', headers: {}, body: null }
    } else if (type === 'set') {
      config = { value: '', variable: '' }
    } else if (type === 'if') {
      config = { condition: 'equals', value1: '', value2: '' }
    } else if (type === 'delay') {
      config = { duration: 5 }
    } else if (type === 'switch') {
      config = { rules: [] }
    } else if (type === 'ai-prompt') {
      config = { model: 'gpt-4o', system_prompt: 'You are a helpful AI assistant.', user_prompt: 'Summarize: {{ $json.text }}', temperature: 0.7 }
    } else if (type === 'execute-workflow') {
      config = { target_workflow_id: '' }
    } else if (type === 'loop-items') {
      config = { items_path: '{{ $json.items }}', max_iterations: 100 }
    } else if (type === 'respond-to-webhook') {
      config = { status_code: 200, response_body: '{{ $json }}', response_headers: {} }
    } else if (type === 'code-script') {
      config = { language: 'python', code: '# Custom Python script\n# Variable reference: $json, $input, $node\noutput = {"processed": True, "count": len($json.get("items", []) if isinstance($json, dict) else [])}' }
    } else if (type === 'human-approval') {
      config = { approver_email: 'admin@company.com', message: 'Please review and approve this workflow step.' }
    }

    const newNode: Node = {
      id,
      type,
      position: { x: 200 + Math.random() * 100, y: 150 + Math.random() * 100 },
      data: { 
        label: type.charAt(0).toUpperCase() + type.slice(1), 
        config,
        credentialId: null
      }
    }

    const nextNodes = [...get().nodes, newNode]
    set({ nodes: nextNodes })
    get().pushHistory(nextNodes, get().edges)
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  updateNodeConfig: (id, configValues) => {
    const nextNodes = get().nodes.map((n) => {
      if (n.id === id) {
        const currentData = n.data as any
        return {
          ...n,
          data: {
            ...currentData,
            config: {
              ...(currentData.config || {}),
              ...configValues
            }
          }
        }
      }
      return n
    })
    set({ nodes: nextNodes })
    get().pushHistory(nextNodes, get().edges)
  },

  // History system
  pushHistory: (nodes, edges) => {
    const { history, historyIndex } = get()
    // Strip future history if we were in middle of undo stack
    const cleanHistory = history.slice(0, historyIndex + 1)
    
    // Clone nodes and edges to prevent reference mutations
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    }

    set({
      history: [...cleanHistory, snapshot],
      historyIndex: cleanHistory.length
    })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1
      const prevState = history[prevIndex]
      set({
        nodes: JSON.parse(JSON.stringify(prevState.nodes)),
        edges: JSON.parse(JSON.stringify(prevState.edges)),
        historyIndex: prevIndex,
        selectedNodeId: null
      })
    }
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      const nextState = history[nextIndex]
      set({
        nodes: JSON.parse(JSON.stringify(nextState.nodes)),
        edges: JSON.parse(JSON.stringify(nextState.edges)),
        historyIndex: nextIndex,
        selectedNodeId: null
      })
    }
  },

  // API Integrations
  loadWorkflow: async (id, token, workspaceId) => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/workflows/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        }
      })

      if (!res.ok) {
        throw new Error('Failed to load workflow')
      }

      const workflow = await res.json()

      // Map backend node objects to React Flow node format
      const loadedNodes: Node[] = (workflow.nodes || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        position: n.position || { x: 100, y: 100 },
        data: {
          label: n.name || n.type.charAt(0).toUpperCase() + n.type.slice(1),
          config: n.config || {},
          credentialId: n.credentialId || null
        }
      }))

      // Map backend connection objects to React Flow edge format
      const loadedEdges: Edge[] = (workflow.connections || []).map((c: any, index: number) => ({
        id: `edge-${c.source}-${c.target}`,
        source: c.source,
        target: c.target,
        sourceHandle: c.sourcePort || 'main',
        targetHandle: c.targetPort || 'main',
        style: { stroke: '#94a3b8', strokeWidth: 2 }
      }))

      set({
        workflowId: workflow.id,
        workflowName: workflow.name,
        workflowDescription: workflow.description || '',
        isActive: workflow.is_active,
        activeVersionId: workflow.active_version_id,
        nodes: loadedNodes,
        edges: loadedEdges,
        history: [{ nodes: loadedNodes, edges: loadedEdges }],
        historyIndex: 0,
        isLoading: false
      })
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  saveWorkflow: async (token, workspaceId) => {
    const { workflowId, workflowName, workflowDescription, nodes, edges } = get()
    if (!workflowId) return

    set({ isSaving: true, error: null })
    try {
      // Map React Flow nodes back to db format
      const apiNodes = nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        name: n.data.label,
        config: n.data.config || {},
        credentialId: n.data.credentialId || null
      }))

      // Map React Flow edges back to db connection format
      const apiConnections = edges.map((e) => ({
        source: e.source,
        sourcePort: e.sourceHandle || 'main',
        target: e.target,
        targetPort: e.targetHandle || 'main'
      }))

      const res = await fetch(`${BACKEND_URL}/api/v1/workflows/${workflowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        },
        body: JSON.stringify({
          name: workflowName,
          description: workflowDescription,
          nodes: apiNodes,
          connections: apiConnections
        })
      })

      if (!res.ok) {
        throw new Error('Failed to save workflow')
      }

      set({ isSaving: false })
    } catch (err: any) {
      set({ error: err.message, isSaving: false })
    }
  },

  publishWorkflow: async (token, workspaceId) => {
    const { workflowId } = get()
    if (!workflowId) return

    set({ isSaving: true, error: null })
    try {
      // Save current draft first
      await get().saveWorkflow(token, workspaceId)

      // Hit publish endpoint
      const res = await fetch(`${BACKEND_URL}/api/v1/workflows/${workflowId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        }
      })

      if (!res.ok) {
        throw new Error('Failed to publish version')
      }

      const version = await res.json()
      set({ 
        activeVersionId: version.id, 
        isSaving: false 
      })
    } catch (err: any) {
      set({ error: err.message, isSaving: false })
    }
  },

  toggleActivation: async (token, workspaceId) => {
    const { workflowId, isActive } = get()
    if (!workflowId) return

    const endpoint = isActive ? 'deactivate' : 'activate'
    set({ isSaving: true, error: null })
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/workflows/${workflowId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        }
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || `Failed to ${endpoint} workflow`)
      }

      const workflow = await res.json()
      set({ isActive: workflow.is_active, isSaving: false })
    } catch (err: any) {
      set({ error: err.message, isSaving: false })
    }
  },
  
  loadCredentials: async (token, workspaceId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/credentials`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        }
      })
      if (res.ok) {
        const creds = await res.json()
        set({ credentialsList: creds })
      }
    } catch (err) {}
  },

  loadWorkflows: async (token, workspaceId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/workflows`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        }
      })
      if (res.ok) {
        const wfs = await res.json()
        set({ workflowsList: wfs })
      }
    } catch (err) {}
  },

  loadExecutions: async (token, workspaceId) => {
    const { workflowId } = get()
    if (!workflowId) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/workflows/${workflowId}/executions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        }
      })
      if (res.ok) {
        const execs = await res.json()
        set({ executionsList: execs })
      }
    } catch (err) {}
  },

  executeWorkflow: async (token, workspaceId, inputData = {}) => {
    const { workflowId, loadExecutions } = get()
    if (!workflowId) return
    set({ isExecuting: true, error: null })
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        },
        body: JSON.stringify(inputData)
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Execution trigger failed')
      }

      const execLog = await res.json()
      get().resetNodeExecutionStates()
      set({ 
        isExecuting: false,
        activeExecutionId: execLog.id,
        isExecutionsDrawerOpen: true,
        selectedExecution: execLog
      })

      // Refresh executions list
      await loadExecutions(token, workspaceId)
    } catch (err: any) {
      set({ error: err.message, isExecuting: false })
    }
  },

  importWorkflowJson: (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString)
      const importedNodes = Array.isArray(parsed.nodes) ? parsed.nodes : []
      const importedEdges = Array.isArray(parsed.edges) ? parsed.edges : []

      set({
        nodes: importedNodes,
        edges: importedEdges,
        selectedNodeId: null,
        history: [{ nodes: importedNodes, edges: importedEdges }],
        historyIndex: 0
      })
      return true
    } catch (err) {
      console.error('Failed to import workflow JSON:', err)
      return false
    }
  }
}))
