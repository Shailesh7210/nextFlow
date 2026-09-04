import React, { useEffect, useState } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { X, RefreshCw, Activity, CheckCircle2, XCircle, Clock, AlertTriangle, ChevronRight, Terminal } from 'lucide-react'

export default function ExecutionHistoryModal() {
  const {
    isExecutionsDrawerOpen,
    setExecutionsDrawerOpen,
    executionsList,
    selectedExecution,
    setSelectedExecution,
    loadExecutions
  } = useWorkflowStore()

  const [activeTab, setActiveTab] = useState<'trace' | 'inputs' | 'outputs'>('trace')
  const [expandedNodeIndex, setExpandedNodeIndex] = useState<number | null>(0)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const workspaceId = localStorage.getItem('workspace_id')
    if (isExecutionsDrawerOpen && token && workspaceId) {
      loadExecutions(token, workspaceId)
    }
  }, [isExecutionsDrawerOpen, loadExecutions])

  if (!isExecutionsDrawerOpen) return null

  const handleRefresh = () => {
    const token = localStorage.getItem('token')
    const workspaceId = localStorage.getItem('workspace_id')
    if (token && workspaceId) {
      loadExecutions(token, workspaceId)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
            <CheckCircle2 size={12} />
            SUCCESS
          </span>
        )
      case 'FAILED':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            <XCircle size={12} />
            FAILED
          </span>
        )
      case 'RUNNING':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">
            <Activity size={12} className="animate-spin" />
            RUNNING
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
            <Clock size={12} />
            PENDING
          </span>
        )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-5xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl transition-colors duration-200">
        
        {/* Modal Top Navigation Header */}
        <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight">Execution History & Trace Monitoring</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Inspect historical runs, node executions, and payload outputs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              onClick={() => setExecutionsDrawerOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Modal Main Body Grid */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Pane: Executions List (35%) */}
          <div className="w-[340px] border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Execution Logs ({executionsList.length})
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {executionsList.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No execution logs recorded yet. Trigger a manual run or send an inbound webhook.
                </div>
              ) : (
                executionsList.map((exec) => {
                  const isSelected = selectedExecution?.id === exec.id
                  return (
                    <button
                      key={exec.id}
                      onClick={() => setSelectedExecution(exec)}
                      className={`w-full p-3.5 rounded-xl border text-left transition flex flex-col gap-2 ${
                        isSelected 
                          ? 'border-blue-500 bg-white dark:bg-slate-900 shadow-md' 
                          : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {getStatusBadge(exec.status)}
                        <span className="text-[10px] font-mono text-slate-400">{exec.id.substring(4, 12)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-semibold uppercase tracking-wide bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {exec.trigger_type}
                        </span>
                        <span>{new Date(exec.created_at).toLocaleTimeString()}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Pane: Selected Run Details (65%) */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6">
            {!selectedExecution ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <Terminal size={32} className="mb-2 opacity-50" />
                <p className="text-sm font-medium">Select an execution log on the left to inspect detailed traces</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                
                {/* Run Overview Header */}
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(selectedExecution.status)}
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        Execution ID: {selectedExecution.id}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Started: {new Date(selectedExecution.created_at).toLocaleString()}
                    </span>
                  </div>

                  {selectedExecution.error_message && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Error Stack:</span> {selectedExecution.error_message}
                      </div>
                    </div>
                  )}
                </div>

                {/* Details Tab Switcher */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setActiveTab('trace')}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                      activeTab === 'trace' 
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    Node Trace List ({selectedExecution.node_executions?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('inputs')}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                      activeTab === 'inputs' 
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    Input Payload ($json)
                  </button>
                  <button
                    onClick={() => setActiveTab('outputs')}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                      activeTab === 'outputs' 
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
                  >
                    Output Payload ($json)
                  </button>
                </div>

                {/* Tab Content Display */}
                {activeTab === 'trace' && (
                  <div className="flex flex-col gap-3">
                    {(!selectedExecution.node_executions || selectedExecution.node_executions.length === 0) ? (
                      <div className="p-4 text-center text-slate-400 text-xs">
                        No node execution trace recorded yet.
                      </div>
                    ) : (
                      selectedExecution.node_executions.map((nodeExec: any, idx: number) => {
                        const isExpanded = expandedNodeIndex === idx
                        return (
                          <div 
                            key={idx}
                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm"
                          >
                            <button
                              onClick={() => setExpandedNodeIndex(isExpanded ? null : idx)}
                              className="w-full p-3.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900 transition text-left"
                            >
                              <div className="flex items-center gap-3">
                                <ChevronRight size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                  Node: {nodeExec.node_id}
                                </span>
                                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {nodeExec.node_type}
                                </span>
                              </div>
                              {getStatusBadge(nodeExec.status)}
                            </button>

                            {isExpanded && (
                              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto flex flex-col gap-3">
                                <div>
                                  <div className="text-[10px] text-slate-400 font-sans uppercase font-bold mb-1">Inputs:</div>
                                  <pre className="bg-slate-950 p-2.5 rounded border border-slate-800 overflow-x-auto">
                                    {JSON.stringify(nodeExec.inputs, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400 font-sans uppercase font-bold mb-1">Outputs:</div>
                                  <pre className="bg-slate-950 p-2.5 rounded border border-slate-800 text-green-400 overflow-x-auto">
                                    {JSON.stringify(nodeExec.outputs, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}

                {activeTab === 'inputs' && (
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-200 font-mono text-[12px] overflow-x-auto">
                    {JSON.stringify(selectedExecution.input_data || {}, null, 2)}
                  </pre>
                )}

                {activeTab === 'outputs' && (
                  <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-green-400 font-mono text-[12px] overflow-x-auto">
                    {JSON.stringify(selectedExecution.output_data || {}, null, 2)}
                  </pre>
                )}

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
