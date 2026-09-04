'use client'

import React, { useEffect, useState } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import NodePalette from '@/workflow-editor/toolbar/NodePalette'
import WorkflowCanvas from '@/workflow-editor/canvas/WorkflowCanvas'
import ConfigPanel from '@/workflow-editor/config-panel/ConfigPanel'
import Toolbar from '@/workflow-editor/toolbar/Toolbar'
import { Plus, ListFilter, LogOut, ArrowRight, UserPlus, ShieldAlert, Sparkles, FolderKanban, Key, Globe, Sliders, Sun, Moon } from 'lucide-react'
import CredentialsModal from '@/components/CredentialsModal'
import ExecutionHistoryModal from '@/components/ExecutionHistoryModal'
import TemplatesModal from '@/components/TemplatesModal'

const BACKEND_URL = 'http://localhost:8000'

export default function Home() {
  const {
    workflowId,
    initWorkflow,
    loadWorkflow,
    isLoading,
    error,
    setCredentialsModalOpen,
    theme,
    setTheme
  } = useWorkflowStore()

  // Auth States
  const [token, setToken] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)

  // Workspace Workflows List State
  const [workflowsList, setWorkflowsList] = useState<any[]>([])
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false)
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)

  // Check auth on load
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedWorkspaceId = localStorage.getItem('workspace_id')
    if (savedToken && savedWorkspaceId) {
      setToken(savedToken)
      setWorkspaceId(savedWorkspaceId)
    }
  }, [])

  // Synchronize HTML Theme Class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

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
        body: JSON.stringify({ 
          email, 
          password,
          full_name: fullName || null,
          workspace_name: workspaceName || null
        })
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
      <div className="w-screen h-screen flex font-sans bg-slate-950 text-slate-100 overflow-hidden select-none">
        {/* Left Side: Product Intro & Dark Pattern Grid */}
        <div className="hidden md:flex w-1/2 auth-grid-bg flex-col justify-between p-12 border-r border-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-lg border border-blue-500/20">
              <Sparkles size={20} />
            </div>
            <span className="font-extrabold text-[15px] tracking-wider text-slate-200 uppercase">NexFlow</span>
          </div>

          <div className="max-w-md my-auto flex flex-col gap-6">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
                Automate your visual integrations.
              </h1>
              <p className="text-[14px] text-slate-400 mt-2 leading-relaxed">
                Connect webhooks, map custom logic, and dispatch HTTP calls seamlessly with our secure workflow automation node editor.
              </p>
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-905 border-slate-900/60 pt-6">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-blue-950/40 text-blue-400 rounded-lg border border-blue-900/40 mt-0.5">
                  <Sparkles size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-[13px] text-slate-200">Real-time Visual Canvas</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Drag, drop, and configure standard triggers, delay wait states, and multi-route logical splitters.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-green-950/40 text-green-400 rounded-lg border border-green-900/40 mt-0.5">
                  <Globe size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-[13px] text-slate-200">AES-256 Symmetric Encryption</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Store basic credentials and third-party authentication tokens securely encrypted at rest.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-purple-950/40 text-purple-400 rounded-lg border border-purple-900/40 mt-0.5">
                  <Sliders size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-[13px] text-slate-200">Celery Async Executions</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Scale execution routines in background worker pools powered by Redis pub-sub queues.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500">
            © 2026 NexFlow Inc. All rights reserved.
          </div>
        </div>

        {/* Right Side: Auth Forms */}
        <div className="w-full md:w-1/2 flex items-center justify-center bg-slate-950 p-8 overflow-y-auto">
          <div className="w-full max-w-sm flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {isRegistering ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isRegistering 
                  ? 'Get started by creating your profile and default workspace' 
                  : 'Enter your credentials to access your workspaces'}
              </p>
            </div>

            {authError && (
              <div className="p-3.5 bg-red-950/50 border border-red-900/60 rounded-xl text-red-300 text-xs flex items-start gap-2">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="flex flex-col gap-4">
              {isRegistering && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-[13px] px-3.5 py-2 border border-slate-800 bg-slate-900 rounded-lg text-slate-100 placeholder-slate-650 focus:outline-none focus:border-blue-500"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Workspace / Organization Name
                    </label>
                    <input
                      type="text"
                      required
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      className="w-full text-[13px] px-3.5 py-2 border border-slate-800 bg-slate-900 rounded-lg text-slate-100 placeholder-slate-650 focus:outline-none focus:border-blue-500"
                      placeholder="e.g. Acme Corp Operations"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-[13px] px-3.5 py-2 border border-slate-800 bg-slate-900 rounded-lg text-slate-100 placeholder-slate-650 focus:outline-none focus:border-blue-500"
                  placeholder="you@domain.com"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-[13px] px-3.5 py-2 border border-slate-800 bg-slate-900 rounded-lg text-slate-100 placeholder-slate-650 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-[13px] shadow-md transition mt-2"
              >
                <span>{isRegistering ? 'Register & Launch' : 'Sign In'}</span>
                <ArrowRight size={15} />
              </button>
            </form>

            <div className="border-t border-slate-900 my-2" />

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering)
                  setAuthError(null)
                }}
                className="text-[12px] text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1.5"
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
      </div>
    )
  }

  // 2. Dashboards (If no workflow is actively open)
  if (!workflowId) {
    return (
      <div className="w-screen h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-800 dark:text-slate-200 transition-colors duration-200">
        <header className="h-16 border-b border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 flex items-center justify-between px-6 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <FolderKanban className="text-blue-600 dark:text-blue-500" />
            <h1 className="font-bold text-slate-800 dark:text-slate-100 text-lg">My Workflows</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center justify-center p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 bg-white dark:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-350 transition"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button
              onClick={() => setCredentialsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-slate-650 dark:text-slate-350 hover:text-slate-800 dark:hover:text-white font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg bg-white dark:bg-slate-900 transition"
            >
              <Key size={14} />
              Manage Credentials
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-slate-650 dark:text-slate-350 hover:text-slate-800 dark:hover:text-white font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg bg-white dark:bg-slate-900 transition"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-8 flex flex-col gap-6 overflow-y-auto">
          {/* Create Workflow Block */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-6 shadow-sm dark:shadow-md transition-colors duration-200">
            <h2 className="font-bold text-slate-700 dark:text-slate-200 text-base mb-2">Create New Workflow</h2>
            <form onSubmit={handleCreateWorkflow} className="flex gap-3">
              <input
                type="text"
                required
                disabled={isCreatingWorkflow}
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                placeholder="e.g. Sync Leads to Postgres"
                className="flex-1 text-[13px] px-3.5 py-2 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isCreatingWorkflow}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-[13px] flex items-center gap-2 shadow-md"
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
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-slate-450 dark:text-slate-500 text-sm">
                No workflows found. Enter a name above to create your first workflow canvas.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflowsList.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => selectWorkflowToEdit(wf.id, wf.name)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl p-5 shadow-sm text-left hover:border-blue-500 hover:shadow-md transition flex flex-col justify-between group"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition text-[15px]">
                        {wf.name}
                      </h3>
                      <p className="text-[12px] text-slate-400 dark:text-slate-400 mt-1 line-clamp-2">
                        {wf.description || 'No description provided.'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-4 mt-4 w-full">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                        <span className={`px-1.5 py-0.5 rounded border ${
                          wf.is_active 
                            ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/60' 
                            : 'bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {wf.is_active ? 'Active' : 'Draft'}
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-650 dark:text-blue-450 hover:text-blue-400 font-semibold inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        Open Canvas <ArrowRight size={12} />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
        <CredentialsModal />
      </div>
    )
  }

  // 3. Workflow Editor Screen
  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col font-sans overflow-hidden text-slate-200">
      <Toolbar onOpenTemplates={() => setIsTemplatesOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        <NodePalette />
        <main className="flex-1 h-full bg-slate-950 overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center z-50 text-slate-400 text-sm">
              Loading workflow graph layout...
            </div>
          ) : error ? (
            <div className="absolute inset-0 bg-red-950/40 flex flex-col items-center justify-center z-50 text-red-300 text-sm p-4 border border-red-900/40">
              <ShieldAlert size={36} className="mb-2" />
              <p className="font-bold">Error loading canvas</p>
              <p className="text-xs text-red-400">{error}</p>
            </div>
          ) : null}
          <WorkflowCanvas />
        </main>
        <ConfigPanel />
      </div>
      <CredentialsModal />
      <ExecutionHistoryModal />
      <TemplatesModal isOpen={isTemplatesOpen} onClose={() => setIsTemplatesOpen(false)} />
    </div>
  )
}
