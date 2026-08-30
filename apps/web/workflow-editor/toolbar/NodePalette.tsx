import React from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { Webhook, Globe, Sliders, GitFork, GitMerge, Clock } from 'lucide-react'

export default function NodePalette() {
  const { addNode } = useWorkflowStore()

  const nodeTypesList = [
    {
      category: 'Triggers',
      nodes: [
        { type: 'webhook', label: 'Webhook Trigger', icon: <Webhook size={16} />, color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' }
      ]
    },
    {
      category: 'Logic Nodes',
      nodes: [
        { type: 'set', label: 'Set Variable', icon: <Sliders size={16} />, color: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100' },
        { type: 'if', label: 'IF Condition', icon: <GitFork size={16} />, color: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' },
        { type: 'switch', label: 'Switch Router', icon: <GitMerge size={16} />, color: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' },
        { type: 'delay', label: 'Delay Waiter', icon: <Clock size={16} />, color: 'bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100' }
      ]
    },
    {
      category: 'Action Nodes',
      nodes: [
        { type: 'http-request', label: 'HTTP Request', icon: <Globe size={16} />, color: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' }
      ]
    }
  ]

  return (
    <aside className="w-64 border-r border-slate-200 bg-slate-50 h-full p-4 flex flex-col gap-5 overflow-y-auto select-none">
      <div>
        <h2 className="font-bold text-slate-800 text-[14px] uppercase tracking-wider mb-1">Node Palette</h2>
        <p className="text-[11px] text-slate-400">Click a node below to add it onto the workflow canvas workspace.</p>
      </div>

      {nodeTypesList.map((cat, catIdx) => (
        <div key={catIdx} className="flex flex-col gap-2">
          <h3 className="font-semibold text-slate-500 text-[11px] uppercase tracking-wide px-1">
            {cat.category}
          </h3>
          <div className="flex flex-col gap-1.5">
            {cat.nodes.map((node) => (
              <button
                key={node.type}
                onClick={() => addNode(node.type)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded border text-[13px] font-medium transition ${node.color}`}
              >
                <div className="p-1 rounded bg-white/80 shadow-sm border border-slate-100">
                  {node.icon}
                </div>
                <span>{node.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  )
}
