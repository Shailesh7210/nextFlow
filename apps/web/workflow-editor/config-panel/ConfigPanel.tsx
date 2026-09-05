import React from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { X, Settings, HelpCircle } from 'lucide-react'

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
      </div>
    </aside>
  )
}
