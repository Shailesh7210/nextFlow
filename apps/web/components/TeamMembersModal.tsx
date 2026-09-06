import React, { useEffect, useState } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { X, Users, UserPlus, Trash2, Shield, Mail, CheckCircle2 } from 'lucide-react'

const BACKEND_URL = 'http://localhost:8000'

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-950/60 text-purple-300 border-purple-800/60',
  admin: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
  editor: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
  viewer: 'bg-slate-800 text-slate-300 border-slate-700'
}

export default function TeamMembersModal() {
  const { isTeamModalOpen, setTeamModalOpen } = useWorkflowStore()

  const [token, setToken] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  const [members, setMembers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    setToken(localStorage.getItem('token'))
    setWorkspaceId(localStorage.getItem('workspace_id'))
  }, [isTeamModalOpen])

  const fetchMembers = async () => {
    if (!token || !workspaceId) return
    setIsLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/workspaces/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        }
      })
      if (res.ok) {
        const data = await res.json()
        setMembers(data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isTeamModalOpen && token && workspaceId) {
      fetchMembers()
    }
  }, [isTeamModalOpen, token, workspaceId])

  if (!isTeamModalOpen) return null

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !workspaceId) return
    setError(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/workspaces/members/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to invite team member.')
      }

      setSuccessMsg(`Successfully invited ${inviteEmail} as ${inviteRole}.`)
      setInviteEmail('')
      setInviteRole('editor')
      setIsInviting(false)
      fetchMembers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!token || !workspaceId) return
    setError(null)
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/workspaces/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to update member role.')
      }

      fetchMembers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!token || !workspaceId) return
    if (!confirm('Are you sure you want to remove this member from the workspace?')) return
    setError(null)

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/workspaces/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        }
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to remove member.')
      }

      fetchMembers()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm font-sans animate-fade-in">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[85vh] text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
          <div className="flex items-center gap-2 text-slate-100">
            <Users size={18} className="text-purple-400" />
            <h2 className="font-bold text-[15px]">Enterprise Team & Role Management</h2>
          </div>
          <button 
            onClick={() => { setTeamModalOpen(false); setError(null); setSuccessMsg(null); }}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-900/60 text-red-300 text-xs rounded-lg">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-900/60 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Invite Form / Action Bar */}
          {isInviting ? (
            <form onSubmit={handleInvite} className="border border-slate-800 rounded-xl p-4 bg-slate-950/40 flex flex-col gap-3">
              <h3 className="font-bold text-slate-300 text-[13px] uppercase tracking-wide flex items-center gap-2">
                <UserPlus size={15} className="text-purple-400" />
                Invite Workspace Team Member
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full text-[13px] px-3.5 py-1.5 border border-slate-800 bg-slate-950 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full text-[13px] px-3 py-1.5 border border-slate-800 bg-slate-950 rounded-lg text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviting(false)}
                  className="px-3 py-1.5 border border-slate-700 hover:bg-slate-800 rounded-lg text-[12px] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-[12px] shadow-md flex items-center gap-1.5"
                >
                  <UserPlus size={14} />
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-400 text-[12px] uppercase tracking-wide">
                  Active Team Members ({members.length})
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Role permissions govern workflow creation, publishing, and API access.
                </p>
              </div>
              <button
                onClick={() => setIsInviting(true)}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1.5 rounded-lg text-[12px] shadow-md transition"
              >
                <UserPlus size={14} />
                <span>Invite Member</span>
              </button>
            </div>
          )}

          {/* Members List */}
          {isLoading ? (
            <div className="py-8 text-center text-slate-500 text-xs">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
              No members found for this workspace.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div 
                  key={m.id}
                  className="border border-slate-800 bg-slate-950/30 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-950/60 border border-purple-800/40 text-purple-300 flex items-center justify-center font-bold text-xs">
                      {m.full_name ? m.full_name.charAt(0).toUpperCase() : m.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-slate-200">{m.full_name || m.email}</span>
                        <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLORS[m.role] || ROLE_COLORS.viewer}`}>
                          {m.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Mail size={11} />
                        <span>{m.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {m.role !== 'owner' && (
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="text-[11px] bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-purple-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}
                    {m.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-1.5 border border-red-950/60 hover:bg-red-950/30 rounded text-red-400 hover:text-red-300 transition"
                        title="Remove member"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
