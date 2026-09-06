'use client'

import React, { useEffect, useState } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import NodePalette from '@/workflow-editor/toolbar/NodePalette'
import WorkflowCanvas from '@/workflow-editor/canvas/WorkflowCanvas'
import ConfigPanel from '@/workflow-editor/config-panel/ConfigPanel'
import Toolbar from '@/workflow-editor/toolbar/Toolbar'
import { Plus, ListFilter, LogOut, ArrowRight, UserPlus, ShieldAlert, Sparkles, FolderKanban, Key, Globe, Sliders, Sun, Moon, Activity, Users, KeyRound, Search, CheckCircle2, LayoutTemplate, Zap, Bot, Workflow, ShieldCheck, LayoutList, Grid, ChevronRight, X, User } from 'lucide-react'
import CredentialsModal from '@/components/CredentialsModal'
import TeamMembersModal from '@/components/TeamMembersModal'
import ApiKeysModal from '@/components/ApiKeysModal'
import UserProfileModal from '@/components/UserProfileModal'
import ExecutionHistoryModal from '@/components/ExecutionHistoryModal'
import TemplatesModal from '@/components/TemplatesModal'
import DashboardAnalytics from '@/components/DashboardAnalytics'
import { BACKEND_URL } from '@/lib/config'


export default function Home() {
  const {
    workflowId,
    initWorkflow,
    loadWorkflow,
    isLoading,
    error,
    setCredentialsModalOpen,
    setTeamModalOpen,
    setApiKeysModalOpen,
    setProfileModalOpen,
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'workflows' | 'analytics'>('workflows')

  // Search, Filter & Layout View State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

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
      setIsCreateModalOpen(false)
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
            <img src="/logo.png" alt="NexFlow Logo" className="w-9 h-9 rounded-lg border border-blue-500/30 shadow-lg shadow-blue-500/10 object-cover" />
            <span className="font-extrabold text-[16px] tracking-wider text-slate-100 uppercase">NexFlow</span>
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
                    <span>Don&apos;t have an account? Register</span>
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
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600/10 text-blue-500 rounded-lg border border-blue-500/20">
                <Sparkles size={18} />
              </div>
              <span className="font-extrabold text-[15px] tracking-wider text-slate-800 dark:text-slate-100 uppercase">NexFlow</span>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-6 h-8">
              <button
                onClick={() => setActiveTab('workflows')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition ${
                  activeTab === 'workflows'
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <FolderKanban size={15} />
                <span>Workflows</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition ${
                  activeTab === 'analytics'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Activity size={15} />
                <span>Analytics</span>
              </button>
            </div>
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
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-blue-650 dark:text-blue-350 hover:text-blue-800 dark:hover:text-white font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg bg-white dark:bg-slate-900 transition"
              title="Edit Profile Settings"
            >
              <User size={14} />
              Profile
            </button>
            <button
              onClick={() => setTeamModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-purple-650 dark:text-purple-350 hover:text-purple-800 dark:hover:text-white font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg bg-white dark:bg-slate-900 transition"
            >
              <Users size={14} />
              Team & Roles
            </button>
            <button
              onClick={() => setApiKeysModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-amber-650 dark:text-amber-350 hover:text-amber-800 dark:hover:text-white font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg bg-white dark:bg-slate-900 transition"
            >
              <KeyRound size={14} />
              API Keys
            </button>
            <button
              onClick={() => setCredentialsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-slate-650 dark:text-slate-350 hover:text-slate-800 dark:hover:text-white font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg bg-white dark:bg-slate-900 transition"
            >
              <Key size={14} />
              Credentials
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

        {activeTab === 'analytics' ? (
          <DashboardAnalytics />
        ) : (
        <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
          {/* Page Title & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Workspace / Production Pipeline
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Workflows
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Manage, trigger, and inspect visual integration graphs across your organization.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsTemplatesOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition shadow-xs"
              >
                <LayoutTemplate size={14} />
                <span>Templates Hub</span>
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm"
              >
                <Plus size={15} />
                <span>New Workflow</span>
              </button>
            </div>
          </div>

          {/* Minimalist Stats Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Workflows</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{workflowsList.length}</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Integrations</span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {workflowsList.filter(w => w.is_active).length}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">API Health</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Operational</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Workspace Access</span>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">Owner / Admin</div>
            </div>
          </div>

          {/* Search, Filter & View Mode Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter workflows by name..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Filter Tabs */}
              <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg text-xs font-medium">
                {(['all', 'active', 'draft'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setStatusFilter(mode)}
                    className={`px-3 py-1 rounded-md capitalize transition ${
                      statusFilter === mode
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded transition ${
                    viewMode === 'table' 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Table view"
                >
                  <LayoutList size={14} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition ${
                    viewMode === 'grid' 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Grid view"
                >
                  <Grid size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Workflows List / Table Container */}
          {(() => {
            const filteredList = workflowsList.filter((wf) => {
              const matchesSearch = wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (wf.description && wf.description.toLowerCase().includes(searchQuery.toLowerCase()))
              if (statusFilter === 'active') return matchesSearch && wf.is_active
              if (statusFilter === 'draft') return matchesSearch && !wf.is_active
              return matchesSearch
            })

            if (filteredList.length === 0) {
              return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center flex flex-col items-center gap-3">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full">
                    <FolderKanban size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                      {searchQuery ? 'No matching workflows found' : 'No Workflows Created'}
                    </h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      {searchQuery 
                        ? 'Try adjusting your search keywords or active status filter.'
                        : 'Get started by creating your first workflow pipeline or launching a pre-configured template.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus size={14} />
                      <span>Create Workflow</span>
                    </button>
                    <button
                      onClick={() => setIsTemplatesOpen(true)}
                      className="border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
                    >
                      <LayoutTemplate size={14} />
                      <span>Browse Templates</span>
                    </button>
                  </div>
                </div>
              )
            }

            if (viewMode === 'table') {
              return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Workflow Name</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Version</th>
                        <th className="py-3 px-4">Identifier</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {filteredList.map((wf) => (
                        <tr
                          key={wf.id}
                          onClick={() => selectWorkflowToEdit(wf.id, wf.name)}
                          className="hover:bg-slate-50 dark:hover:bg-slate-850/60 cursor-pointer transition"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-100 text-[13px]">{wf.name}</div>
                            <div className="text-slate-400 text-[11px] line-clamp-1">{wf.description || 'No description provided.'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              wf.is_active 
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${wf.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {wf.is_active ? 'Active' : 'Draft'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            {wf.active_version_id ? wf.active_version_id.substring(4, 10) : 'v1.0.0'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                            {wf.id.substring(0, 12)}...
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center gap-1 text-[12px] hover:underline">
                              Open Canvas <ChevronRight size={13} />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredList.map((wf) => (
                  <div
                    key={wf.id}
                    onClick={() => selectWorkflowToEdit(wf.id, wf.name)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 cursor-pointer hover:border-slate-400 dark:hover:border-slate-700 transition flex flex-col justify-between group shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition text-[14px]">
                          {wf.name}
                        </h4>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          wf.is_active 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}>
                          {wf.is_active ? 'Active' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {wf.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 w-full text-[11px]">
                      <span className="text-slate-400 font-mono">
                        {wf.id.substring(0, 10)}
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold inline-flex items-center gap-1">
                        Open <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </main>
        )}

        {/* Clean Modal Overlay for Create Workflow */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-4 backdrop-blur-xs font-sans">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col text-slate-800 dark:text-slate-100">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plus size={16} className="text-blue-500" />
                  <h3 className="font-bold text-sm">Create New Workflow</h3>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateWorkflow} className="p-5 flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Workflow Title
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    disabled={isCreatingWorkflow}
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    placeholder="e.g. Lead Sync Webhook to Database"
                    className="w-full text-[13px] px-3.5 py-2 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Or select a common starter
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Webhook API Relay', 'AI Article Summarizer', 'Sub-Workflow Orchestrator', 'Manager Approval Gate'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewWorkflowName(preset)}
                        className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-md transition"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingWorkflow}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs shadow-xs"
                  >
                    {isCreatingWorkflow ? 'Creating...' : 'Create Workflow'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <CredentialsModal />
        <TeamMembersModal />
        <ApiKeysModal />
        <UserProfileModal />
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
      <TeamMembersModal />
      <ApiKeysModal />
      <UserProfileModal />
      <ExecutionHistoryModal />
      <TemplatesModal isOpen={isTemplatesOpen} onClose={() => setIsTemplatesOpen(false)} />
    </div>
  )
}
