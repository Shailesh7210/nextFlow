import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Webhook, Globe, Sliders, GitFork, GitMerge, Clock, Key, CheckCircle2, AlertCircle, Loader2, Sparkles, Network, Repeat, ShieldAlert, Send, Code, UserCheck } from 'lucide-react'
import { useWorkflowStore } from '../../store/useWorkflowStore'

interface NodeHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  colorClass: string // Tailwind bg class for header tag
  selected?: boolean
  resilience?: {
    retryOnFail?: boolean
    continueOnFail?: boolean
  }
}

// Reusable header component adapting to light/dark themes
const NodeHeader = ({ icon, title, subtitle, colorClass, selected, resilience }: NodeHeaderProps) => {
  return (
    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
      <div className={`p-2 rounded-lg text-white shadow-sm flex items-center justify-center shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div className="overflow-hidden flex-1">
        <div className="flex items-center justify-between gap-1">
          <div className="font-bold text-slate-800 dark:text-slate-100 text-[13px] leading-tight truncate">{title}</div>
          {(resilience?.retryOnFail || resilience?.continueOnFail) && (
            <div title={resilience.continueOnFail ? "Continue on Error Enabled" : "Retries Enabled"} className="text-amber-500 shrink-0">
              <ShieldAlert size={13} />
            </div>
          )}
        </div>
        {subtitle && (
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5 leading-none">{subtitle}</div>
        )}
      </div>
    </div>
  )
}

const ExecutionStatusBadge = ({ id }: { id: string }) => {
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])

  if (!executionState || executionState === 'IDLE') return null

  if (executionState === 'RUNNING') {
    return (
      <div className="absolute -top-2.5 -right-2 bg-blue-600 text-white rounded-full p-0.5 shadow-md animate-pulse flex items-center gap-1 text-[9px] font-bold px-2 z-20 border border-blue-400">
        <Loader2 size={11} className="animate-spin" />
        <span>RUNNING</span>
      </div>
    )
  }

  if (executionState === 'SUCCESS') {
    return (
      <div className="absolute -top-2.5 -right-2 bg-emerald-600 text-white rounded-full p-0.5 shadow-md flex items-center gap-1 text-[9px] font-bold px-2 z-20 border border-emerald-400">
        <CheckCircle2 size={11} />
        <span>PASSED</span>
      </div>
    )
  }

  if (executionState === 'FAILED') {
    return (
      <div className="absolute -top-2.5 -right-2 bg-rose-600 text-white rounded-full p-0.5 shadow-md flex items-center gap-1 text-[9px] font-bold px-2 z-20 border border-rose-400">
        <AlertCircle size={11} />
        <span>FAILED</span>
      </div>
    )
  }

  return null
}

const getExecutionBorderClass = (executionState?: string) => {
  if (executionState === 'RUNNING') return 'border-blue-500 ring-4 ring-blue-500/30'
  if (executionState === 'SUCCESS') return 'border-emerald-500 ring-2 ring-emerald-500/30'
  if (executionState === 'FAILED') return 'border-rose-500 ring-4 ring-rose-500/30'
  return ''
}

// Webhook Node (Trigger)
export const WebhookNode = ({ id, data, selected }: any) => {
  const credentialId = data?.credentialId
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])
  const executionBorder = getExecutionBorderClass(executionState)

  return (
    <div className={`relative w-[220px] bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-sm dark:shadow-lg transition-all duration-200 ${
      executionBorder || (selected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')
    }`}>
      <ExecutionStatusBadge id={id} />
      <NodeHeader
        icon={<Webhook size={16} />}
        title={data.label || "Webhook Trigger"}
        subtitle="Inbound Webhook"
        colorClass="bg-blue-600"
        selected={selected}
      />
      <div className="mt-3 flex flex-col gap-1 text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
        <div className="flex items-center gap-1.5 font-medium">
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
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
    </div>
  )
}

// HTTP Request Node (Action)
export const HttpRequestNode = ({ id, data, selected }: any) => {
  const method = data?.config?.method || 'GET'
  const url = data?.config?.url || 'Configure endpoint url...'
  const credentialId = data?.credentialId
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])
  const executionBorder = getExecutionBorderClass(executionState)

  return (
    <div className={`relative w-[240px] bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-sm dark:shadow-lg transition-all duration-200 ${
      executionBorder || (selected ? 'border-green-600 ring-2 ring-green-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')
    }`}>
      <ExecutionStatusBadge id={id} />
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
          background: '#475569',
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      
      <NodeHeader
        icon={<Globe size={16} />}
        title={data.label || "HTTP Request"}
        subtitle="API Integrator"
        colorClass="bg-green-600"
        selected={selected}
        resilience={{ retryOnFail: data?.config?.retry_on_fail, continueOnFail: data?.config?.continue_on_fail }}
      />

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border leading-none tracking-wide ${
            method === 'GET' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
            method === 'POST' ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' :
            'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
          }`}>{method}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px] font-mono">{url}</span>
        </div>
        {credentialId && (
          <div className="flex items-center gap-1 text-[9px] font-semibold text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-950/30 border border-green-150 dark:border-green-900 py-0.5 px-2 rounded-md w-fit">
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
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
    </div>
  )
}

// Set Node (Logic)
export const SetNode = ({ id, data, selected }: any) => {
  const variable = data?.config?.variable || 'key'
  const value = data?.config?.value || 'value'
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])
  const executionBorder = getExecutionBorderClass(executionState)

  return (
    <div className={`relative w-[220px] bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-sm dark:shadow-lg transition-all duration-200 ${
      executionBorder || (selected ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')
    }`}>
      <ExecutionStatusBadge id={id} />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#475569',
          border: '2.5px solid var(--node-bg, #ffffff)',
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

      <div className="mt-3 flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-2 rounded-lg font-mono">
        <span className="text-purple-650 dark:text-purple-400 font-semibold truncate max-w-[80px]">{variable}</span>
        <span className="text-slate-400 dark:text-slate-600 font-bold select-none">=</span>
        <span className="text-slate-650 dark:text-slate-300 truncate max-w-[80px]">{value}</span>
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
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
    </div>
  )
}

// IF Node (Logic Splitter)
export const IfNode = ({ id, data, selected }: any) => {
  const value1 = data?.config?.value1 || 'value1'
  const condition = data?.config?.condition || 'equals'
  const value2 = data?.config?.value2 || 'value2'
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])
  const executionBorder = getExecutionBorderClass(executionState)

  return (
    <div className={`relative w-[230px] bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-sm dark:shadow-lg transition-all duration-200 ${
      executionBorder || (selected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')
    }`}>
      <ExecutionStatusBadge id={id} />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#475569',
          border: '2.5px solid var(--node-bg, #ffffff)',
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
        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide leading-none">Condition</div>
        <div className="text-[11px] bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-lg p-2 font-mono flex items-center justify-between gap-1 text-slate-705 text-slate-700 dark:text-slate-300">
          <span className="truncate max-w-[50px]">{value1}</span>
          <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/60 leading-none">{condition.replace('_', ' ')}</span>
          <span className="truncate max-w-[50px]">{value2}</span>
        </div>

        {/* Aligned outputs inside node card */}
        <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-between h-5 relative">
            <span className="text-green-600 dark:text-green-400 flex items-center gap-1.5 select-none">
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
                border: '2.5px solid var(--node-bg, #ffffff)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} 
            />
          </div>
          <div className="flex items-center justify-between h-5 relative">
            <span className="text-red-505 text-red-500 dark:text-red-400 flex items-center gap-1.5 select-none">
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
                border: '2.5px solid var(--node-bg, #ffffff)',
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
export const SwitchNode = ({ id, data, selected }: any) => {
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])
  const executionBorder = getExecutionBorderClass(executionState)

  return (
    <div className={`relative w-[230px] bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-sm dark:shadow-lg transition-all duration-200 ${
      executionBorder || (selected ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')
    }`}>
      <ExecutionStatusBadge id={id} />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#475569',
          border: '2.5px solid var(--node-bg, #ffffff)',
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
        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide leading-none">Output Routes</div>
        
        <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-between h-5 relative">
            <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1.5 select-none">
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
                border: '2.5px solid var(--node-bg, #ffffff)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} 
            />
          </div>
          <div className="flex items-center justify-between h-5 relative">
            <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1.5 select-none">
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
                border: '2.5px solid var(--node-bg, #ffffff)',
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
export const DelayNode = ({ id, data, selected }: any) => {
  const duration = data?.config?.duration || 5
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])
  const executionBorder = getExecutionBorderClass(executionState)

  return (
    <div className={`relative w-[220px] bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-sm dark:shadow-lg transition-all duration-200 ${
      executionBorder || (selected ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')
    }`}>
      <ExecutionStatusBadge id={id} />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#475569',
          border: '2.5px solid var(--node-bg, #ffffff)',
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

      <div className="mt-3 flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-2 rounded-lg">
        <span className="text-slate-500 dark:text-slate-400 font-semibold">Pause Execution:</span>
        <span className="text-sky-700 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded border border-sky-150 dark:border-sky-900 leading-none">{duration}s</span>
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
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
    </div>
  )
}

// AI Prompt / LLM Node
export const AiPromptNode = ({ id, data, selected }: any) => {
  const model = data?.config?.model || 'gpt-4o'
  const credentialId = data?.credentialId
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])
  const executionBorder = getExecutionBorderClass(executionState)

  return (
    <div className={`relative w-[240px] bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-sm dark:shadow-lg transition-all duration-200 ${
      executionBorder || (selected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')
    }`}>
      <ExecutionStatusBadge id={id} />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#475569',
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      
      <NodeHeader
        icon={<Sparkles size={16} />}
        title={data.label || "AI Prompt / LLM"}
        subtitle="LLM Intelligence"
        colorClass="bg-indigo-600"
        selected={selected}
      />

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400 font-medium">Model:</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900 leading-none">{model}</span>
        </div>
        {credentialId && (
          <div className="flex items-center gap-1 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-150 dark:border-indigo-900 py-0.5 px-2 rounded-md w-fit">
            <Key size={10} />
            <span>API Key Set</span>
          </div>
        )}
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
          background: '#4f46e5',
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
    </div>
  )
}

// Sub-Workflow Invocation Node
export const ExecuteWorkflowNode = ({ id, data, selected }: any) => {
  const targetWorkflowId = data?.config?.target_workflow_id || ''
  const workflowsList = useWorkflowStore((s) => s.workflowsList)
  const targetWf = workflowsList.find((w) => w.id === targetWorkflowId)
  const targetName = targetWf ? targetWf.name : (targetWorkflowId ? targetWorkflowId : 'Select Sub-Workflow...')
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])
  const executionBorder = getExecutionBorderClass(executionState)

  return (
    <div className={`relative w-[240px] bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-sm dark:shadow-lg transition-all duration-200 ${
      executionBorder || (selected ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')
    }`}>
      <ExecutionStatusBadge id={id} />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#475569',
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      
      <NodeHeader
        icon={<Network size={16} />}
        title={data.label || "Sub-Workflow"}
        subtitle="Child Workflow Runner"
        colorClass="bg-teal-600"
        selected={selected}
      />

      <div className="mt-3 flex flex-col gap-1 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-2 rounded-lg text-[11px]">
        <span className="text-slate-400 font-medium">Target Flow:</span>
        <span className="font-semibold text-teal-700 dark:text-teal-400 truncate">{targetName}</span>
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
          background: '#0d9488',
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
    </div>
  )
}

// Looping & Array Processing Node
export const LoopItemsNode = ({ id, data, selected }: any) => {
  const itemsPath = data?.config?.items_path || '{{ $json.items }}'
  const maxIterations = data?.config?.max_iterations ?? 100
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])
  const executionBorder = getExecutionBorderClass(executionState)

  return (
    <div className={`relative w-[240px] bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-sm dark:shadow-lg transition-all duration-200 ${
      executionBorder || (selected ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')
    }`}>
      <ExecutionStatusBadge id={id} />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#475569',
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      
      <NodeHeader
        icon={<Repeat size={16} />}
        title={data.label || "Loop Items"}
        subtitle="Batch Array Processor"
        colorClass="bg-violet-600"
        selected={selected}
      />

      <div className="mt-3 flex flex-col gap-1.5 text-[11px] bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-2 rounded-lg">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold">
          <span>Target Array:</span>
          <span className="font-mono text-[10px] text-violet-600 dark:text-violet-400 font-bold truncate max-w-[110px]">{itemsPath}</span>
        </div>
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold">
          <span>Max Limit:</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">{maxIterations} items</span>
        </div>
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
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
    </div>
  )
}

// Custom Webhook Response Node
export const RespondToWebhookNode = ({ id, data, selected }: any) => {
  const statusCode = data?.config?.status_code ?? 200
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])
  const executionBorder = getExecutionBorderClass(executionState)

  return (
    <div className={`relative w-[240px] bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-sm dark:shadow-lg transition-all duration-200 ${
      executionBorder || (selected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')
    }`}>
      <ExecutionStatusBadge id={id} />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#475569',
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      
      <NodeHeader
        icon={<Send size={16} />}
        title={data.label || "Webhook Response"}
        subtitle="Sync HTTP Response"
        colorClass="bg-emerald-600"
        selected={selected}
      />

      <div className="mt-3 flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-2 rounded-lg">
        <span className="text-slate-500 dark:text-slate-400 font-semibold">HTTP Status:</span>
        <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900 leading-none">{statusCode}</span>
      </div>
    </div>
  )
}

// Custom Code Script Node
export const CodeScriptNode = ({ id, data, selected }: any) => {
  const language = data?.config?.language || 'python'
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])
  const executionBorder = getExecutionBorderClass(executionState)

  return (
    <div className={`relative w-[240px] bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-sm dark:shadow-lg transition-all duration-200 ${
      executionBorder || (selected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')
    }`}>
      <ExecutionStatusBadge id={id} />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#475569',
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      
      <NodeHeader
        icon={<Code size={16} />}
        title={data.label || "Custom Code Script"}
        subtitle="Python Code Sandbox"
        colorClass="bg-indigo-600"
        selected={selected}
        resilience={{ retryOnFail: data?.config?.retry_on_fail, continueOnFail: data?.config?.continue_on_fail }}
      />

      <div className="mt-3 flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-2 rounded-lg font-mono">
        <span className="text-slate-500 dark:text-slate-400 font-semibold">Engine:</span>
        <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900 leading-none uppercase">{language}</span>
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
          background: '#4f46e5',
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
    </div>
  )
}

// Human-in-the-Loop Approval Node
export const HumanApprovalNode = ({ id, data, selected }: any) => {
  const approverEmail = data?.config?.approver_email || 'admin@company.com'
  const executionState = useWorkflowStore((s) => s.nodeExecutionStates[id])
  const executionBorder = getExecutionBorderClass(executionState)

  return (
    <div className={`relative w-[240px] bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-sm dark:shadow-lg transition-all duration-200 ${
      executionBorder || (selected ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700')
    }`}>
      <ExecutionStatusBadge id={id} />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{
          top: '50%',
          left: '-6px',
          width: '10px',
          height: '10px',
          background: '#475569',
          border: '2.5px solid var(--node-bg, #ffffff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} 
      />
      
      <NodeHeader
        icon={<UserCheck size={16} />}
        title={data.label || "Human Approval"}
        subtitle="Approval Gate"
        colorClass="bg-amber-500"
        selected={selected}
      />

      <div className="mt-3 flex flex-col gap-2">
        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide leading-none">Approver:</div>
        <div className="text-[11px] bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-2 rounded-lg font-mono text-slate-700 dark:text-slate-300 truncate">
          {approverEmail}
        </div>

        <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-between h-5 relative">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>APPROVED</span>
            </span>
            <Handle 
              type="source" 
              position={Position.Right} 
              id="approved" 
              style={{
                top: '50%',
                right: '-20px',
                width: '10px',
                height: '10px',
                background: '#10b981',
                border: '2.5px solid var(--node-bg, #ffffff)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} 
            />
          </div>
          <div className="flex items-center justify-between h-5 relative">
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>REJECTED</span>
            </span>
            <Handle 
              type="source" 
              position={Position.Right} 
              id="rejected" 
              style={{
                top: '50%',
                right: '-20px',
                width: '10px',
                height: '10px',
                background: '#f43f5e',
                border: '2.5px solid var(--node-bg, #ffffff)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }} 
            />
          </div>
        </div>
      </div>
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
  'ai-prompt': AiPromptNode,
  'execute-workflow': ExecuteWorkflowNode,
  'loop-items': LoopItemsNode,
  'respond-to-webhook': RespondToWebhookNode,
  'code-script': CodeScriptNode,
  'human-approval': HumanApprovalNode,
}
