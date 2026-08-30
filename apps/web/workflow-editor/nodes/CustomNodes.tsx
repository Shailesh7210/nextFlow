import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Webhook, Globe, Sliders, GitFork, GitMerge, Clock } from 'lucide-react'

// Webhook Node (Trigger)
export const WebhookNode = ({ data, selected }: any) => {
  return (
    <div className={`px-4 py-3 rounded-lg border bg-white min-w-[150px] ${selected ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-slate-300'}`}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
          <Webhook size={16} />
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-[13px]">Webhook Trigger</div>
          <div className="text-[10px] text-slate-400">Waiting for requests...</div>
        </div>
      </div>
      {/* Trigger only outputs data */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output" 
        style={{ top: '50%', background: '#3b82f6' }} 
      />
    </div>
  )
}

// HTTP Request Node (Action)
export const HttpRequestNode = ({ data, selected }: any) => {
  const method = data?.config?.method || 'GET'
  const url = data?.config?.url || 'Configure URL'
  
  return (
    <div className={`px-4 py-3 rounded-lg border bg-white min-w-[180px] ${selected ? 'border-green-500 shadow-md ring-1 ring-green-500' : 'border-slate-300'}`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{ top: '50%', background: '#64748b' }} 
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-green-100 text-green-600 rounded-md">
          <Globe size={16} />
        </div>
        <div className="w-full overflow-hidden">
          <div className="font-semibold text-slate-800 text-[13px] flex items-center justify-between">
            <span>HTTP Request</span>
            <span className="text-[9px] bg-green-50 text-green-700 border border-green-200 px-1 rounded font-bold uppercase">{method}</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{url}</div>
        </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output" 
        style={{ top: '50%', background: '#22c55e' }} 
      />
    </div>
  )
}

// Set Node (Logic)
export const SetNode = ({ data, selected }: any) => {
  const variable = data?.config?.variable || 'key'
  const value = data?.config?.value || 'value'

  return (
    <div className={`px-4 py-3 rounded-lg border bg-white min-w-[150px] ${selected ? 'border-purple-500 shadow-md ring-1 ring-purple-500' : 'border-slate-300'}`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{ top: '50%', background: '#64748b' }} 
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-purple-100 text-purple-600 rounded-md">
          <Sliders size={16} />
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-[13px]">Set Variable</div>
          <div className="text-[10px] text-slate-400 truncate max-w-[100px]">{variable} = {value}</div>
        </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output" 
        style={{ top: '50%', background: '#a855f7' }} 
      />
    </div>
  )
}

// IF Node (Logic Splitter)
export const IfNode = ({ data, selected }: any) => {
  return (
    <div className={`px-4 py-3 rounded-lg border bg-white min-w-[160px] ${selected ? 'border-amber-500 shadow-md ring-1 ring-amber-500' : 'border-slate-300'}`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{ top: '50%', background: '#64748b' }} 
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-amber-100 text-amber-600 rounded-md">
          <GitFork size={16} />
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-[13px]">IF Condition</div>
          <div className="text-[10px] text-slate-400">Evaluate branching</div>
        </div>
      </div>
      
      {/* Two outputs: True (top right) and False (bottom right) */}
      <div className="absolute right-[-10px] top-[25%] flex items-center justify-end">
        <span className="text-[9px] text-slate-400 mr-2 select-none font-bold">TRUE</span>
        <Handle 
          type="source" 
          position={Position.Right} 
          id="true" 
          style={{ top: '25%', background: '#22c55e' }} 
        />
      </div>
      <div className="absolute right-[-10px] top-[75%] flex items-center justify-end">
        <span className="text-[9px] text-slate-400 mr-2 select-none font-bold">FALSE</span>
        <Handle 
          type="source" 
          position={Position.Right} 
          id="false" 
          style={{ top: '75%', background: '#ef4444' }} 
        />
      </div>
    </div>
  )
}

// Switch Node (Logic Router)
export const SwitchNode = ({ data, selected }: any) => {
  return (
    <div className={`px-4 py-3 rounded-lg border bg-white min-w-[160px] ${selected ? 'border-orange-500 shadow-md ring-1 ring-orange-500' : 'border-slate-300'}`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{ top: '50%', background: '#64748b' }} 
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-orange-100 text-orange-600 rounded-md">
          <GitMerge size={16} />
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-[13px]">Switch Router</div>
          <div className="text-[10px] text-slate-400">Evaluate multi-routes</div>
        </div>
      </div>
      
      <div className="absolute right-[-10px] top-[25%] flex items-center justify-end">
        <span className="text-[9px] text-slate-400 mr-2 select-none font-bold">Route 1</span>
        <Handle 
          type="source" 
          position={Position.Right} 
          id="route1" 
          style={{ top: '25%', background: '#f97316' }} 
        />
      </div>
      <div className="absolute right-[-10px] top-[75%] flex items-center justify-end">
        <span className="text-[9px] text-slate-400 mr-2 select-none font-bold">Route 2</span>
        <Handle 
          type="source" 
          position={Position.Right} 
          id="route2" 
          style={{ top: '75%', background: '#f97316' }} 
        />
      </div>
    </div>
  )
}

// Delay Node (Logic Waiter)
export const DelayNode = ({ data, selected }: any) => {
  const duration = data?.config?.duration || 5

  return (
    <div className={`px-4 py-3 rounded-lg border bg-white min-w-[150px] ${selected ? 'border-sky-500 shadow-md ring-1 ring-sky-500' : 'border-slate-300'}`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{ top: '50%', background: '#64748b' }} 
      />
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-sky-100 text-sky-600 rounded-md">
          <Clock size={16} />
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-[13px]">Delay Waiter</div>
          <div className="text-[10px] text-slate-400">{duration} seconds</div>
        </div>
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output" 
        style={{ top: '50%', background: '#0ea5e9' }} 
      />
    </div>
  )
}

export const nodeTypes = {
  'webhook': WebhookNode,
  'http-request': HttpRequestNode,
  'set': SetNode,
  'if': IfNode,
  'switch': SwitchNode,
  'delay': DelayNode,
}
