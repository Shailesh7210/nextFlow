import React, { useEffect, useState, useRef } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { Undo2, Redo2, Save, CloudLightning, Power, Key, Sun, Moon, Play, History, Download, Upload, LayoutTemplate, GitCompare, Users, KeyRound, User } from 'lucide-react'
import VersionDiffModal from '../modals/VersionDiffModal'

interface ToolbarProps {
  onOpenTemplates?: () => void
}

export default function Toolbar({ onOpenTemplates }: ToolbarProps) {
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
    setTeamModalOpen,
    setApiKeysModalOpen,
    setProfileModalOpen,
    theme,
    setTheme,
    isExecuting,
    executeWorkflow,
    setExecutionsDrawerOpen,
    setVersionDiffModalOpen,
    importWorkflowJson
  } = useWorkflowStore()

  const [token, setToken] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleExportJson = () => {
    const { nodes, edges, workflowName: name } = useWorkflowStore.getState()
    const payload = {
      workflowName: name,
      exportedAt: new Date().toISOString(),
      nodes,
      edges
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `${name.toLowerCase().replace(/\s+/g, '_')}_workflow.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        importWorkflowJson(content)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return (
    <>
      <header className="h-16 border-b border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 flex items-center justify-between px-6 z-10 relative text-slate-800 dark:text-slate-200">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImportFileChange} 
          accept=".json" 
          className="hidden" 
        />

        {/* Title & Info */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-bold text-slate-800 dark:text-slate-100 text-lg leading-tight">{workflowName}</h1>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Status:</span>
              <span className={`font-semibold ${isActive ? 'text-green-600 dark:text-green-500' : 'text-slate-400 dark:text-slate-500'}`}>
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
        <div className="flex items-center gap-2.5">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Templates Hub */}
          <button
            onClick={onOpenTemplates}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
            title="Open Templates Hub"
          >
            <LayoutTemplate size={15} />
            <span>Templates</span>
          </button>

          {/* Version Diff Modal Button */}
          <button
            onClick={() => setVersionDiffModalOpen(true)}
            className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Compare Workflow Versions (Version Diff)"
          >
            <GitCompare size={15} />
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Export Workflow JSON"
          >
            <Download size={15} />
          </button>

          {/* Import JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Import Workflow JSON"
          >
            <Upload size={15} />
          </button>

          {/* Profile Modal */}
          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/40 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
            title="User Profile & Settings"
          >
            <User size={15} />
            Profile
          </button>

          {/* Team Members */}
          <button
            onClick={() => setTeamModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/40 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/60 transition"
            title="Team member invitations and RBAC roles"
          >
            <Users size={15} />
            Team
          </button>

          {/* API Keys */}
          <button
            onClick={() => setApiKeysModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/40 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/60 transition"
            title="Developer API keys for REST execution"
          >
            <KeyRound size={15} />
            API Keys
          </button>

          {/* Manage Credentials */}
          <button
            onClick={() => setCredentialsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 transition"
          >
            <Save size={15} />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>

          {/* Publish Snapshot */}
          <button
            onClick={handlePublish}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/80 disabled:opacity-50 transition"
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

      <VersionDiffModal />
    </>
  )
}
