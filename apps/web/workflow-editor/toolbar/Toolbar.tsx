import React, { useEffect, useState } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { Undo2, Redo2, Save, CloudLightning, Power, Key, Sun, Moon, Play, History } from 'lucide-react'

export default function Toolbar() {
  const {
    workflowName,
    isSaving,
    isActive,
    activeVersionId,
    history,
    historyIndex,
    undo,
    redo,
    saveWorkflow,
    publishWorkflow,
    toggleActivation,
    setCredentialsModalOpen,
    theme,
    setTheme,
    isExecuting,
    executeWorkflow,
    setExecutionsDrawerOpen
  } = useWorkflowStore()

  const [token, setToken] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  useEffect(() => {
    setToken(localStorage.getItem('token'))
    setWorkspaceId(localStorage.getItem('workspace_id'))
  }, [])

  const handleSave = async () => {
    if (!token || !workspaceId) return
    await saveWorkflow(token, workspaceId)
  }

  const handlePublish = async () => {
    if (!token || !workspaceId) return
    await publishWorkflow(token, workspaceId)
  }

  const handleToggleActive = async () => {
    if (!token || !workspaceId) return
    await toggleActivation(token, workspaceId)
  }

  const handleExecute = async () => {
    if (!token || !workspaceId) return
    await executeWorkflow(token, workspaceId)
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 flex items-center justify-between px-6 z-10 relative text-slate-800 dark:text-slate-200">
      {/* Title & Info */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{workflowName}</h1>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Status:</span>
            <span className={`font-semibold ${isActive ? 'text-green-600 dark:text-green-500' : 'text-slate-400 dark:text-slate-550 dark:text-slate-500'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>Version:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {activeVersionId ? activeVersionId.substring(4, 10) + '...' : 'Unpublished'}
            </span>
          </div>
        </div>
      </div>

      {/* History Controls */}
      <div className="flex items-center gap-1 border-x border-slate-200 dark:border-slate-800 px-4 h-8">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Redo"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Manage Credentials */}
        <button
          onClick={() => setCredentialsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-905 hover:text-slate-900 dark:hover:text-white transition"
        >
          <Key size={15} />
          Credentials
        </button>

        {/* Executions Logs Drawer Button */}
        <button
          onClick={() => setExecutionsDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
          title="Inspect execution logs history"
        >
          <History size={15} />
          Executions
        </button>

        {/* Save Draft */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-905 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition"
        >
          <Save size={15} />
          {isSaving ? 'Saving...' : 'Save Draft'}
        </button>

        {/* Publish Snapshot */}
        <button
          onClick={handlePublish}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-blue-700 dark:text-blue-450 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/80 disabled:opacity-50 transition"
          title="Snapshot draft as new published version"
        >
          <CloudLightning size={15} />
          Publish Version
        </button>

        {/* Run Test Trigger */}
        <button
          onClick={handleExecute}
          disabled={isExecuting || !activeVersionId}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 transition"
          title={!activeVersionId ? 'Publish a version snapshot first to test execution.' : 'Trigger workflow run'}
        >
          <Play size={14} className={isExecuting ? 'animate-spin' : ''} />
          {isExecuting ? 'Running...' : 'Run Test'}
        </button>

        {/* Toggle Activation */}
        <button
          onClick={handleToggleActive}
          disabled={isSaving || !activeVersionId}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-lg text-white shadow-sm disabled:opacity-50 ${
            isActive 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
          title={!activeVersionId ? 'Publish a version first before activating.' : ''}
        >
          <Power size={15} />
          {isActive ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </header>
  )
}
