import React, { useEffect, useState } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { Undo2, Redo2, Save, CloudLightning, Power } from 'lucide-react'

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
    toggleActivation
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

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-10 relative">
      {/* Title & Info */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-bold text-slate-800 text-lg leading-tight">{workflowName}</h1>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
            <span>Status:</span>
            <span className={`font-semibold ${isActive ? 'text-green-600' : 'text-slate-400'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="text-slate-300">|</span>
            <span>Version:</span>
            <span className="font-semibold text-slate-700">
              {activeVersionId ? activeVersionId.substring(4, 10) + '...' : 'Unpublished'}
            </span>
          </div>
        </div>
      </div>

      {/* History Controls */}
      <div className="flex items-center gap-1 border-x border-slate-100 px-4 h-8">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1.5 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1.5 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          title="Redo"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Save Draft */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
        >
          <Save size={15} />
          {isSaving ? 'Saving...' : 'Save Draft'}
        </button>

        {/* Publish Snapshot */}
        <button
          onClick={handlePublish}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50"
          title="Snapshot draft as new published version"
        >
          <CloudLightning size={15} />
          Publish Version
        </button>

        {/* Toggle Activation */}
        <button
          onClick={handleToggleActive}
          disabled={isSaving || !activeVersionId}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded text-white shadow-sm disabled:opacity-50 ${
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
