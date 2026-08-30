'use client'

import React, { useEffect, useState } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import NodePalette from '@/workflow-editor/toolbar/NodePalette'
import WorkflowCanvas from '@/workflow-editor/canvas/WorkflowCanvas'
import ConfigPanel from '@/workflow-editor/config-panel/ConfigPanel'
import Toolbar from '@/workflow-editor/toolbar/Toolbar'
import { Plus, ListFilter, LogOut, ArrowRight, UserPlus, ShieldAlert, Sparkles, FolderKanban } from 'lucide-react'

const BACKEND_URL = 'http://localhost:8000'

export default function Home() {
  const {
    workflowId,
    initWorkflow,
    loadWorkflow,
    isLoading,
    error
  } = useWorkflowStore()

  // Auth States
  const [token, setToken] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  // Workspace Workflows List State
  const [workflowsList, setWorkflowsList] = useState<any[]>([])
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false)

  // Check auth on load
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedWorkspaceId = localStorage.getItem('workspace_id')
    if (savedToken && savedWorkspaceId) {
      setToken(savedToken)
      setWorkspaceId(savedWorkspaceId)
    }
  }, [])

  // Fetch workspaces & default them on login
  const initializeWorkspace = async (accessToken: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/workspaces`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (!res.ok) throw new Error('Could not fetch workspaces.')
      
      const workspaces = await res.json()
      if (workspaces.length > 0) {
        const defaultWspId = workspaces[0].id
        localStorage.setItem('workspace_id', defaultWspId)
        setWorkspaceId(defaultWspId)
        fetchWorkflows(accessToken, defaultWspId)
      } else {
        setAuthError('No active workspaces associated with this account.')
      }
    } catch (err: any) {
      setAuthError(err.message)
    }
  }

  // Fetch user's workflows in active workspace
  const fetchWorkflows = async (accessToken: string, wspId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/workflows`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Workspace-ID': wspId
        }
      })
      if (res.ok) {
        const workflows = await res.json()
        setWorkflowsList(workflows)
      }
    } catch (err) {}
  }

  // Reload workflows list if auth changes
  useEffect(() => {
    if (token && workspaceId && !workflowId) {
      fetchWorkflows(token, workspaceId)
    }
  }, [token, workspaceId, workflowId])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    try {
      // Standard form data login
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Login failed.')
      }

      const data = await res.json()
      localStorage.setItem('token', data.access_token)
      setToken(data.access_token)
      await initializeWorkspace(data.access_token)
    } catch (err: any) {
      setAuthError(err.message)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Registration failed.')
      }

      const data = await res.json()
      localStorage.setItem('token', data.access_token)
      setToken(data.access_token)
      await initializeWorkspace(data.access_token)
    } catch (err: any) {
      setAuthError(err.message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('workspace_id')
    setToken(null)
    setWorkspaceId(null)
    // Wipe Zustand state
    useWorkflowStore.setState({
      workflowId: null,
      nodes: [],
      edges: []
    })
  }

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkflowName || !token || !workspaceId) return
    setIsCreatingWorkflow(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        },
        body: JSON.stringify({
          name: newWorkflowName,
          description: 'A visual automation workflow draft',
          nodes: [],
          connections: []
        })
      })

      if (!res.ok) throw new Error('Could not create workflow')
      
      const newWf = await res.json()
      initWorkflow(newWf.id, newWf.name)
      fetchWorkflows(token, workspaceId)
      setNewWorkflowName('')
    } catch (err) {
      alert('Error creating workflow.')
    } finally {
      setIsCreatingWorkflow(false)
    }
  }

  const selectWorkflowToEdit = async (id: string, name: string) => {
    if (!token || !workspaceId) return
    await loadWorkflow(id, token, workspaceId)
  }

  // 1. Auth Gate Overlay
  if (!token || !workspaceId) {
    return (
      <div className="w-screen h-screen flex bg-slate-100 items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-xl shadow-xl w-96 border border-slate-200">
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-2">
              <Sparkles size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">NexFlow Platform</h1>
            <p className="text-[12px] text-slate-400 mt-1">Design visual automation workflows</p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-start gap-2">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-[13px] px-3.5 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="you@domain.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-[13px] px-3.5 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-[13px] shadow transition mt-2"
            >
              <span>{isRegistering ? 'Register & Launch' : 'Sign In'}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          <div className="border-t border-slate-100 my-6" />

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering)
                setAuthError(null)
              }}
              className="text-[12px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1.5"
            >
              {isRegistering ? (
                <>Already have an account? Sign In</>
              ) : (
                <>
                  <UserPlus size={14} />
                  Don't have an account? Register
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 2. Dashboards (If no workflow is actively open)
  if (!workflowId) {
    return (
      <div className="w-screen h-screen bg-slate-50 flex flex-col font-sans">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <FolderKanban className="text-blue-600" />
            <h1 className="font-bold text-slate-800 text-lg">My Workflows</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-slate-600 hover:text-slate-800 font-semibold border border-slate-200 hover:bg-slate-100 rounded"
          >
            <LogOut size={14} />
            Logout
          </button>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-8 flex flex-col gap-6 overflow-y-auto">
          {/* Create Workflow Block */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-slate-700 text-base mb-2">Create New Workflow</h2>
            <form onSubmit={handleCreateWorkflow} className="flex gap-3">
              <input
                type="text"
                required
                disabled={isCreatingWorkflow}
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="e.g. Sync Leads to Postgres"
                className="flex-1 text-[13px] px-3.5 py-2 border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isCreatingWorkflow}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded text-[13px] flex items-center gap-2 shadow"
              >
                <Plus size={15} />
                <span>{isCreatingWorkflow ? 'Creating...' : 'Create'}</span>
              </button>
            </form>
          </div>

          {/* Workflows List Grid */}
          <div className="flex flex-col gap-3">
            <h2 className="font-bold text-slate-500 text-[11px] uppercase tracking-wide px-1">
              Select Workflow to Edit
            </h2>
            {workflowsList.length === 0 ? (
              <div className="bg-slate-100 border border-dashed border-slate-300 rounded-xl p-10 text-center text-slate-400 text-sm">
                No workflows found. Enter a name above to create your first workflow canvas.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflowsList.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => selectWorkflowToEdit(wf.id, wf.name)}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-left hover:border-blue-500 hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition text-[15px]">
                        {wf.name}
                      </h3>
                      <p className="text-[12px] text-slate-400 mt-1 line-clamp-2">
                        {wf.description || 'No description provided.'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 w-full">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                        <span className={`px-1.5 py-0.5 rounded border ${
                          wf.is_active 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {wf.is_active ? 'Active' : 'Draft'}
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-600 font-semibold inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        Open Canvas <ArrowRight size={12} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  // 3. Workflow Editor Screen
  return (
    <div className="w-screen h-screen bg-white flex flex-col font-sans overflow-hidden">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <NodePalette />
        <main className="flex-1 h-full bg-slate-50 overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-50 text-slate-500 text-sm">
              Loading workflow graph layout...
            </div>
          ) : error ? (
            <div className="absolute inset-0 bg-red-50 flex flex-col items-center justify-center z-50 text-red-700 text-sm p-4">
              <ShieldAlert size={36} className="mb-2" />
              <p className="font-bold">Error loading canvas</p>
              <p className="text-xs text-red-500">{error}</p>
            </div>
          ) : null}
          <WorkflowCanvas />
        </main>
        <ConfigPanel />
      </div>
    </div>
  )
}
