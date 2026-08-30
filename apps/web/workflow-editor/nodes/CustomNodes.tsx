import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Webhook, Globe, Sliders, GitFork, GitMerge, Clock, Key } from 'lucide-react'

interface NodeHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  colorClass: string // Tailwind bg class for header tag
  selected?: boolean
}

// A reusable, premium header component for custom nodes
const NodeHeader = ({ icon, title, subtitle, colorClass, selected }: NodeHeaderProps) => {
  return (
    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
      <div className={`p-2 rounded-lg text-white shadow-sm flex items-center justify-center shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div className="overflow-hidden flex-1">
        <div className="font-bold text-slate-800 text-[13px] leading-tight truncate">{title}</div>
        {subtitle && (
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5 leading-none">{subtitle}</div>
        )}
      </div>
    </div>
  )
}

// Webhook Node (Trigger)
export const WebhookNode = ({ data, selected }: any) => {
  const credentialId = data?.credentialId
  return (
    <div className={`w-[220px] bg-white rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${
      selected ? 'border-blue-500 shadow-md ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <NodeHeader
        icon={<Webhook size={16} />}
        title={data.label || "Webhook Trigger"}
        subtitle="Inbound Webhook"
        colorClass="bg-blue-600"
        selected={selected}
      />
      <div className="mt-3 flex flex-col gap-1 text-[10px] text-slate-500 leading-normal">
        <div className="flex items-center gap-1.5 font-medium text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          <span>Waiting for POST requests</span>
        </div>
        {credentialId && (
          <div className="flex items-center gap-1 mt-1 text-slate-400">
            <Key size={10} />
            <span className="truncate">Secured</span>
          </div>
        )}
      </div>
      {/* Output Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output" 
        style={{
          top: '50%',
          right: '-6px',
          width: '10px',
          height: '10px',
          background: '#2563eb',
          border: '2.5px solid #ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
    </div>
  )
}

// HTTP Request Node (Action)
export const HttpRequestNode = ({ data, selected }: any) => {
  const method = data?.config?.method || 'GET'
  const url = data?.config?.url || 'Configure endpoint url...'
  const credentialId = data?.credentialId
  
  return (
    <div className={`w-[240px] bg-white rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${
      selected ? 'border-green-600 shadow-md ring-2 ring-green-100' : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* Input Handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#64748b',
          border: '2.5px solid #ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      
      <NodeHeader
        icon={<Globe size={16} />}
        title={data.label || "HTTP Request"}
        subtitle="API Integrator"
        colorClass="bg-green-600"
        selected={selected}
      />

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border leading-none tracking-wide ${
            method === 'GET' ? 'bg-blue-50 text-blue-700 border-blue-200' :
            method === 'POST' ? 'bg-green-50 text-green-700 border-green-200' :
            'bg-amber-50 text-amber-700 border-amber-200'
          }`}>{method}</span>
          <span className="text-[10px] text-slate-500 truncate max-w-[150px] font-mono">{url}</span>
        </div>
        {credentialId && (
          <div className="flex items-center gap-1 text-[9px] font-semibold text-green-600 bg-green-50/50 border border-green-100 py-0.5 px-2 rounded-md w-fit">
            <Key size={10} />
            <span>Authorized</span>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="output" 
        style={{
          top: '50%',
          right: '-6px',
          width: '10px',
          height: '10px',
          background: '#16a34a',
          border: '2.5px solid #ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
    </div>
  )
}

// Set Node (Logic)
export const SetNode = ({ data, selected }: any) => {
  const variable = data?.config?.variable || 'key'
  const value = data?.config?.value || 'value'

  return (
    <div className={`w-[220px] bg-white rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${
      selected ? 'border-purple-500 shadow-md ring-2 ring-purple-100' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#64748b',
          border: '2.5px solid #ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      
      <NodeHeader
        icon={<Sliders size={16} />}
        title={data.label || "Set Variable"}
        subtitle="Data Mutator"
        colorClass="bg-purple-600"
        selected={selected}
      />

      <div className="mt-3 flex items-center justify-between text-[11px] bg-slate-50 border border-slate-100 p-2 rounded-lg font-mono">
        <span className="text-purple-600 font-semibold truncate max-w-[80px]">{variable}</span>
        <span className="text-slate-400 font-bold select-none">=</span>
        <span className="text-slate-600 truncate max-w-[80px]">{value}</span>
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        id="output" 
        style={{
          top: '50%',
          right: '-6px',
          width: '10px',
          height: '10px',
          background: '#7c3aed',
          border: '2.5px solid #ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
    </div>
  )
}

// IF Node (Logic Splitter)
export const IfNode = ({ data, selected }: any) => {
  const value1 = data?.config?.value1 || 'value1'
  const condition = data?.config?.condition || 'equals'
  const value2 = data?.config?.value2 || 'value2'

  return (
    <div className={`w-[230px] bg-white rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${
      selected ? 'border-amber-500 shadow-md ring-2 ring-amber-100' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#64748b',
          border: '2.5px solid #ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      
      <NodeHeader
        icon={<GitFork size={16} />}
        title={data.label || "IF Condition"}
        subtitle="Logical Splitter"
        colorClass="bg-amber-500"
        selected={selected}
      />

      <div className="mt-3 flex flex-col gap-2">
        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide leading-none">Condition</div>
        <div className="text-[11px] bg-amber-50/50 border border-amber-100 rounded-lg p-2 font-mono flex items-center justify-between gap-1 text-slate-700">
          <span className="truncate max-w-[50px]">{value1}</span>
          <span className="text-[9px] font-bold text-amber-700 uppercase bg-amber-100 px-1 rounded">{condition.replace('_', ' ')}</span>
          <span className="truncate max-w-[50px]">{value2}</span>
        </div>

        {/* Aligned outputs inside node card */}
        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-500">
          <div className="flex items-center justify-between h-5 relative">
            <span className="text-green-600 flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span>TRUE BRANCH</span>
            </span>
            <Handle 
              type="source" 
              position={Position.Right} 
              id="true" 
              style={{
                top: '50%',
                right: '-20px',
                width: '10px',
                height: '10px',
                background: '#16a34a',
                border: '2.5px solid #ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} 
            />
          </div>
          <div className="flex items-center justify-between h-5 relative">
            <span className="text-red-500 flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              <span>FALSE BRANCH</span>
            </span>
            <Handle 
              type="source" 
              position={Position.Right} 
              id="false" 
              style={{
                top: '50%',
                right: '-20px',
                width: '10px',
                height: '10px',
                background: '#dc2626',
                border: '2.5px solid #ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Switch Node (Logic Router)
export const SwitchNode = ({ data, selected }: any) => {
  return (
    <div className={`w-[230px] bg-white rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${
      selected ? 'border-orange-500 shadow-md ring-2 ring-orange-100' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#64748b',
          border: '2.5px solid #ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      
      <NodeHeader
        icon={<GitMerge size={16} />}
        title={data.label || "Switch Router"}
        subtitle="Multi-way Router"
        colorClass="bg-orange-500"
        selected={selected}
      />

      <div className="mt-3 flex flex-col gap-2">
        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide leading-none">Output Routes</div>
        
        <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-500">
          <div className="flex items-center justify-between h-5 relative">
            <span className="text-orange-600 flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
              <span>ROUTE 1</span>
            </span>
            <Handle 
              type="source" 
              position={Position.Right} 
              id="route1" 
              style={{
                top: '50%',
                right: '-20px',
                width: '10px',
                height: '10px',
                background: '#ea580c',
                border: '2.5px solid #ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} 
            />
          </div>
          <div className="flex items-center justify-between h-5 relative">
            <span className="text-orange-600 flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
              <span>ROUTE 2</span>
            </span>
            <Handle 
              type="source" 
              position={Position.Right} 
              id="route2" 
              style={{
                top: '50%',
                right: '-20px',
                width: '10px',
                height: '10px',
                background: '#ea580c',
                border: '2.5px solid #ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Delay Node (Logic Waiter)
export const DelayNode = ({ data, selected }: any) => {
  const duration = data?.config?.duration || 5

  return (
    <div className={`w-[220px] bg-white rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${
      selected ? 'border-sky-500 shadow-md ring-2 ring-sky-100' : 'border-slate-200 hover:border-slate-300'
    }`}>
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#64748b',
          border: '2.5px solid #ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      
      <NodeHeader
        icon={<Clock size={16} />}
        title={data.label || "Delay Waiter"}
        subtitle="Time Pauser"
        colorClass="bg-sky-500"
        selected={selected}
      />

      <div className="mt-3 flex items-center justify-between text-[11px] bg-slate-50 border border-slate-100 p-2 rounded-lg">
        <span className="text-slate-500 font-semibold">Pause Execution:</span>
        <span className="text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-100">{duration}s</span>
      </div>

      <Handle 
        type="source" 
        position={Position.Right} 
        id="output" 
        style={{
          top: '50%',
          right: '-6px',
          width: '10px',
          height: '10px',
          background: '#0284c7',
          border: '2.5px solid #ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
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
