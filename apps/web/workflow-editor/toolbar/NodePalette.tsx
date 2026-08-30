import React from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { Webhook, Globe, Sliders, GitFork, GitMerge, Clock } from 'lucide-react'

export default function NodePalette() {
  const { addNode } = useWorkflowStore()

  const nodeTypesList = [
    {
      category: 'Triggers',
      nodes: [
        { type: 'webhook', label: 'Webhook Trigger', icon: <Webhook size={16} />, color: 'bg-blue-950/30 text-blue-400 border-blue-900/60 hover:bg-blue-900/30' }
      ]
    },
    {
      category: 'Logic Nodes',
      nodes: [
        { type: 'set', label: 'Set Variable', icon: <Sliders size={16} />, color: 'bg-purple-950/30 text-purple-400 border-purple-900/60 hover:bg-purple-900/30' },
        { type: 'if', label: 'IF Condition', icon: <GitFork size={16} />, color: 'bg-amber-950/30 text-amber-400 border-amber-900/60 hover:bg-amber-900/30' },
        { type: 'switch', label: 'Switch Router', icon: <GitMerge size={16} />, color: 'bg-orange-950/30 text-orange-400 border-orange-900/60 hover:bg-orange-900/30' },
        { type: 'delay', label: 'Delay Waiter', icon: <Clock size={16} />, color: 'bg-sky-950/30 text-sky-400 border-sky-900/60 hover:bg-sky-900/30' }
      ]
    },
    {
      category: 'Action Nodes',
      nodes: [
        { type: 'http-request', label: 'HTTP Request', icon: <Globe size={16} />, color: 'bg-green-950/30 text-green-400 border-green-900/60 hover:bg-green-900/30' }
      ]
    }
  ]

  return (
    <aside className="w-64 border-r border-slate-850 bg-slate-900 h-full p-4 flex flex-col gap-5 overflow-y-auto select-none">
      <div>
        <h2 className="font-bold text-slate-100 text-[14px] uppercase tracking-wider mb-1">Node Palette</h2>
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
                <div className="p-1 rounded bg-slate-950/50 shadow-sm border border-slate-800">
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
