import React from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { X, Settings, HelpCircle } from 'lucide-react'

export default function ConfigPanel() {
  const { 
    nodes, 
    selectedNodeId, 
    selectNode, 
    updateNodeConfig,
    setNodes
  } = useWorkflowStore()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  if (!selectedNode) {
    return (
      <aside className="w-80 border-l border-slate-200 bg-slate-50 h-full p-6 flex flex-col items-center justify-center text-center select-none">
        <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-3 border border-slate-200">
          <Settings size={22} />
        </div>
        <h3 className="font-semibold text-slate-700 text-[14px]">No Node Selected</h3>
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

  return (
    <aside className="w-80 border-l border-slate-200 bg-white h-full flex flex-col z-10 relative shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-slate-600" />
          <h2 className="font-bold text-slate-700 text-[14px]">Node Properties</h2>
        </div>
        <button 
          onClick={() => selectNode(null)} 
          className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded"
        >
          <X size={15} />
        </button>
      </div>

      {/* Scrollable Form Area */}
      <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
        {/* Node Name Rename */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Display Label
          </label>
          <input
            type="text"
            value={(data.label as string) || ''}
            onChange={(e) => handleRenameLabel(e.target.value)}
            className="w-full text-[13px] px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="border-b border-slate-100 my-1" />

        {/* HTTP Request Form */}
        {type === 'http-request' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Request Method
              </label>
              <select
                value={config.method || 'GET'}
                onChange={(e) => handleUpdate('method', e.target.value)}
                className="w-full text-[13px] px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Endpoint URL
              </label>
              <input
                type="text"
                value={config.url || ''}
                placeholder="https://api.example.com/data"
                onChange={(e) => handleUpdate('url', e.target.value)}
                className="w-full text-[13px] px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <HelpCircle size={10} />
                Supports expression template outputs: <code>{"{{ $json.email }}"}</code>
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
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
                className="w-full text-[12px] font-mono px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
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
                    // Update raw value if unparsed, clean up on blur/valid JSON
                    handleUpdate('body', e.target.value)
                  }
                }}
                className="w-full text-[12px] font-mono px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Set Variable Form */}
        {type === 'set' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Variable Target
              </label>
              <input
                type="text"
                value={config.variable || ''}
                placeholder="e.g. lead_score"
                onChange={(e) => handleUpdate('variable', e.target.value)}
                className="w-full text-[13px] px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Assigned Value
              </label>
              <input
                type="text"
                value={config.value || ''}
                placeholder="e.g. 100"
                onChange={(e) => handleUpdate('value', e.target.value)}
                className="w-full text-[13px] px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* IF Condition Form */}
        {type === 'if' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Value 1
              </label>
              <input
                type="text"
                value={config.value1 || ''}
                placeholder="{{ $json.status }}"
                onChange={(e) => handleUpdate('value1', e.target.value)}
                className="w-full text-[13px] px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Operator
              </label>
              <select
                value={config.condition || 'equals'}
                onChange={(e) => handleUpdate('condition', e.target.value)}
                className="w-full text-[13px] px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Does Not Equal</option>
                <option value="contains">Contains</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Value 2
              </label>
              <input
                type="text"
                value={config.value2 || ''}
                placeholder="e.g. success"
                onChange={(e) => handleUpdate('value2', e.target.value)}
                className="w-full text-[13px] px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Delay Waiter Form */}
        {type === 'delay' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Duration (Seconds)
              </label>
              <input
                type="number"
                value={config.duration || 5}
                onChange={(e) => handleUpdate('duration', parseInt(e.target.value) || 0)}
                className="w-full text-[13px] px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Webhook Form */}
        {type === 'webhook' && (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-slate-700 text-[12px] leading-relaxed">
              <span className="font-semibold text-blue-800">Inbound trigger:</span> This node automatically creates a unique webhook URL on publishing. Send POST requests to invoke this workflow flow.
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
