import React, { useEffect, useState, useCallback } from 'react'
import { Activity, CheckCircle2, AlertTriangle, Play, RefreshCw, FolderKanban, ArrowUpRight, Zap, Clock } from 'lucide-react'
import { BACKEND_URL } from '@/lib/config'


interface AnalyticsSummary {
  total_workflows: number
  active_workflows: number
  total_executions: number
  successful_executions: number
  failed_executions: number
  success_rate_percent: number
  recent_activity: Array<{
    id: string
    workflow_id: string
    workflow_name: string
    status: string
    trigger_type: string
    created_at: string | null
    duration_sec: number | null
  }>
}

export default function DashboardAnalytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const token = localStorage.getItem('token')
    const workspaceId = localStorage.getItem('workspace_id')
    if (!token || !workspaceId) {
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/workflows/analytics/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        }
      })
      if (!res.ok) throw new Error('Failed to fetch analytics summary')
      const data = await res.json()
      setSummary(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto p-8 flex flex-col gap-6 overflow-y-auto font-sans text-slate-800 dark:text-slate-200">
      {/* Header & Refresh Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Activity className="text-indigo-600 dark:text-indigo-400" size={22} />
            <span>Workspace Analytics</span>
          </h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Real-time health statistics, execution volumes, and recent activity metrics</p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Workflows */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Total Workflows</span>
            <FolderKanban size={18} className="text-blue-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {summary ? summary.total_workflows : '-'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span className="text-emerald-500 font-semibold">{summary ? summary.active_workflows : 0} Active</span> | {summary ? (summary.total_workflows - summary.active_workflows) : 0} Draft
            </div>
          </div>
        </div>

        {/* Total Executions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Total Executions</span>
            <Zap size={18} className="text-indigo-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {summary ? summary.total_executions : '-'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Across all workspace workflows</div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Success Rate</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary ? `${summary.success_rate_percent}%` : '-'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {summary ? summary.successful_executions : 0} Successful Runs
            </div>
          </div>
        </div>

        {/* Failed Executions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Failed Executions</span>
            <AlertTriangle size={18} className="text-rose-500" />
          </div>
          <div className="mt-3">
            <div className={`text-3xl font-extrabold ${summary && summary.failed_executions > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {summary ? summary.failed_executions : '-'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {summary && summary.failed_executions > 0 ? 'Requires attention' : 'Zero errors'}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <span>Recent Workspace Activity</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Last 15 Execution Runs</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading analytics data...</div>
        ) : !summary || summary.recent_activity.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
            No execution activity recorded yet. Run a workflow test or trigger a webhook to record analytics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-extrabold">Status</th>
                  <th className="pb-3 font-extrabold">Workflow</th>
                  <th className="pb-3 font-extrabold">Trigger</th>
                  <th className="pb-3 font-extrabold">Duration</th>
                  <th className="pb-3 font-extrabold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {summary.recent_activity.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        act.status === 'SUCCESS' ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900' :
                        act.status === 'FAILED' ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900' :
                        'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                      }`}>
                        {act.status}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">{act.workflow_name}</td>
                    <td className="py-3.5 text-slate-500 font-mono capitalize">{act.trigger_type}</td>
                    <td className="py-3.5 text-slate-500 font-mono">{act.duration_sec !== null ? `${act.duration_sec}s` : '-'}</td>
                    <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                      {act.created_at ? new Date(act.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
