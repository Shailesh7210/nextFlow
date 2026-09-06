'use client'

import React, { useState, useEffect } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { X, GitCompare, PlusCircle, MinusCircle, RefreshCw, FileCode, CheckCircle2, ArrowRight } from 'lucide-react'

export default function VersionDiffModal() {
  const { 
    isVersionDiffModalOpen, 
    setVersionDiffModalOpen,
    versionsList,
    loadVersions,
    compareVersions,
    diffResult
  } = useWorkflowStore()

  const [v1, setV1] = useState<string>('draft')
  const [v2, setV2] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    if (isVersionDiffModalOpen) {
      const token = localStorage.getItem('token')
      const workspaceId = localStorage.getItem('workspace_id')
      if (token && workspaceId) {
        loadVersions(token, workspaceId)
      }
    }
  }, [isVersionDiffModalOpen, loadVersions])

  useEffect(() => {
    if (versionsList.length > 0 && !v2) {
      setV2(versionsList[0].id)
    }
  }, [versionsList, v2])

  if (!isVersionDiffModalOpen) return null

  const handleCompare = async () => {
    if (!v1 || !v2) return
    setLoading(true)
    const token = localStorage.getItem('token') || ''
    const workspaceId = localStorage.getItem('workspace_id') || ''
    await compareVersions(token, workspaceId, v1, v2)
    setLoading(false)
  }

  const summary = diffResult?.summary || {
    added_count: 0,
    deleted_count: 0,
    modified_count: 0,
    added_connections_count: 0,
    deleted_connections_count: 0
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <GitCompare size={18} />
            </div>
            <div>
              <h2 className="font-bold text-[15px] leading-tight">Visual Version Diff & Comparison</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Compare nodes, connections, and configuration changes across workflow snapshots.</p>
            </div>
          </div>
          <button 
            onClick={() => setVersionDiffModalOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Version Selection Controls */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Base Version (v1)</label>
            <select
              value={v1}
              onChange={(e) => setV1(e.target.value)}
              className="w-full text-[12px] font-medium px-3 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              <option value="draft">Current Working Draft</option>
              {versionsList.map((ver) => (
                <option key={ver.id} value={ver.id}>
                  Version {ver.version} ({ver.id})
                </option>
              ))}
            </select>
          </div>

          <div className="text-slate-400 dark:text-slate-600 hidden md:block pt-4">
            <ArrowRight size={16} />
          </div>

          <div className="flex-1 w-full">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Compared Version (v2)</label>
            <select
              value={v2}
              onChange={(e) => setV2(e.target.value)}
              className="w-full text-[12px] font-medium px-3 py-1.5 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              {versionsList.map((ver) => (
                <option key={ver.id} value={ver.id}>
                  Version {ver.version} ({ver.id})
                </option>
              ))}
              <option value="draft">Current Working Draft</option>
            </select>
          </div>

          <div className="pt-4 w-full md:w-auto">
            <button
              onClick={handleCompare}
              disabled={loading}
              className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[12px] rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <GitCompare size={14} />}
              <span>Compare</span>
            </button>
          </div>
        </div>

        {/* Body & Summary Cards */}
        <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/20">
          {diffResult && (
            <>
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Added</div>
                    <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5">+{summary.added_count} nodes</div>
                  </div>
                  <PlusCircle size={20} className="text-emerald-500" />
                </div>

                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider">Deleted</div>
                    <div className="text-xl font-extrabold text-rose-700 dark:text-rose-300 mt-0.5">-{summary.deleted_count} nodes</div>
                  </div>
                  <MinusCircle size={20} className="text-rose-500" />
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">Modified</div>
                    <div className="text-xl font-extrabold text-amber-700 dark:text-amber-300 mt-0.5">~{summary.modified_count} nodes</div>
                  </div>
                  <RefreshCw size={20} className="text-amber-500" />
                </div>
              </div>

              {/* Detailed Changes List */}
              <div className="flex flex-col gap-3">
                <h3 className="font-bold text-[12px] uppercase text-slate-500 tracking-wider">Diff Inspection Details</h3>

                {/* Added Nodes */}
                {diffResult.added_nodes?.map((node: any) => (
                  <div key={node.id} className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 p-3 rounded-xl flex items-start gap-2.5">
                    <PlusCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[12px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <span>[+] Added Node: {node.name || node.type}</span>
                        <span className="font-mono text-[10px] bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">ID: {node.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        Type: {node.type}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Deleted Nodes */}
                {diffResult.deleted_nodes?.map((node: any) => (
                  <div key={node.id} className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 p-3 rounded-xl flex items-start gap-2.5">
                    <MinusCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[12px] font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                        <span>[-] Deleted Node: {node.name || node.type}</span>
                        <span className="font-mono text-[10px] bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded">ID: {node.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        Type: {node.type}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Modified Nodes */}
                {diffResult.modified_nodes?.map((mod: any) => (
                  <div key={mod.id} className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 p-3 rounded-xl flex items-start gap-2.5">
                    <RefreshCw size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="w-full">
                      <div className="text-[12px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <span>[~] Modified Node: {mod.name}</span>
                        <span className="font-mono text-[10px] bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">ID: {mod.id}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-amber-200 dark:border-amber-900/50">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Before:</span>
                          <pre className="text-[10px] whitespace-pre-wrap">{JSON.stringify(mod.before.config, null, 2)}</pre>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-amber-200 dark:border-amber-900/50">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">After:</span>
                          <pre className="text-[10px] whitespace-pre-wrap">{JSON.stringify(mod.after.config, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {summary.added_count === 0 && summary.deleted_count === 0 && summary.modified_count === 0 && (
                  <div className="p-6 text-center text-slate-400 text-[12px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                    <span>No differences detected between selected workflow versions!</span>
                  </div>
                )}
              </div>
            </>
          )}

          {!diffResult && (
            <div className="p-8 text-center text-slate-400 text-[12px]">
              Select two versions above and click <span className="font-semibold text-indigo-500">Compare</span> to generate a visual diff.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
