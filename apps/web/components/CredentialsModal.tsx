import React, { useEffect, useState } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { X, Key, Plus, Trash2, Edit3, Save, ShieldCheck } from 'lucide-react'

const BACKEND_URL = 'http://localhost:8000'

export default function CredentialsModal() {
  const {
    isCredentialsModalOpen,
    setCredentialsModalOpen,
    credentialsList,
    loadCredentials
  } = useWorkflowStore()

  const [token, setToken] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  // Form states
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('basic-auth')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [apiUrl, setApiUrl] = useState('')

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setToken(localStorage.getItem('token'))
    setWorkspaceId(localStorage.getItem('workspace_id'))
  }, [isCredentialsModalOpen])

  useEffect(() => {
    if (isCredentialsModalOpen && token && workspaceId) {
      loadCredentials(token, workspaceId)
    }
  }, [isCredentialsModalOpen, token, workspaceId, loadCredentials])

  if (!isCredentialsModalOpen) return null

  const resetForm = () => {
    setName('')
    setType('basic-auth')
    setUsername('')
    setPassword('')
    setApiKey('')
    setApiUrl('')
    setEditingId(null)
    setIsAdding(false)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !workspaceId) return
    setError(null)

    // Build data payload based on type
    const dataPayload: any = {}
    if (type === 'basic-auth') {
      dataPayload.username = username
      dataPayload.password = password
    } else if (type === 'api-key') {
      dataPayload.api_key = apiKey
      if (apiUrl) dataPayload.url = apiUrl
    }

    try {
      const url = editingId 
        ? `${BACKEND_URL}/api/v1/credentials/${editingId}`
        : `${BACKEND_URL}/api/v1/credentials`
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        },
        body: JSON.stringify({
          name,
          type,
          data: dataPayload
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to save credential.')
      }

      await loadCredentials(token, workspaceId)
      resetForm()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!token || !workspaceId) return
    if (!confirm('Are you sure you want to delete this credential?')) return
    setError(null)

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/credentials/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        }
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to delete credential.')
      }

      await loadCredentials(token, workspaceId)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const startEdit = (cred: any) => {
    setEditingId(cred.id)
    setName(cred.name)
    setType(cred.type)
    
    // Fill credentials forms
    if (cred.type === 'basic-auth') {
      setUsername(cred.data?.username || '')
      setPassword(cred.data?.password || '')
    } else if (cred.type === 'api-key') {
      setApiKey(cred.data?.api_key || '')
      setApiUrl(cred.data?.url || '')
    }
    setIsAdding(true)
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm font-sans animate-fade-in">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[85vh] text-slate-100">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
          <div className="flex items-center gap-2 text-slate-100">
            <Key size={18} className="text-blue-500" />
            <h2 className="font-bold text-[15px]">Manage Credentials</h2>
          </div>
          <button 
            onClick={() => { setCredentialsModalOpen(false); resetForm(); }}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 p-1.5 rounded transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-900/60 text-red-300 text-xs rounded">
              {error}
            </div>
          )}

          {/* Form Block */}
          {isAdding ? (
            <form onSubmit={handleSubmit} className="border border-slate-800 rounded-xl p-5 bg-slate-950/30 flex flex-col gap-4">
              <h3 className="font-bold text-slate-300 text-[13px] uppercase tracking-wide">
                {editingId ? 'Edit Credential' : 'Add New Credential'}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Credential Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Production GitHub Token"
                    className="w-full text-[13px] px-3.5 py-1.5 border border-slate-800 bg-slate-950 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Auth Type
                  </label>
                  <select
                    disabled={!!editingId}
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-[13px] px-3.5 py-1.5 border border-slate-800 bg-slate-950 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="basic-auth">Username & Password (Basic Auth)</option>
                    <option value="api-key">Header API Key / Token</option>
                  </select>
                </div>
              </div>

              {/* Basic Auth Form Fields */}
              {type === 'basic-auth' && (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. admin"
                      className="w-full text-[13px] px-3.5 py-1.5 border border-slate-800 bg-slate-950 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Password / Secret
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingId ? '••••••••' : 'Enter secret password'}
                      className="w-full text-[13px] px-3.5 py-1.5 border border-slate-800 bg-slate-950 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* API Key Form Fields */}
              {type === 'api-key' && (
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Header Key Value
                    </label>
                    <input
                      type="password"
                      required
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={editingId ? '••••••••' : 'e.g. Bearer token_material'}
                      className="w-full text-[13px] px-3.5 py-1.5 border border-slate-800 bg-slate-950 rounded-lg text-slate-100 placeholder-slate-650 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Base API URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://api.github.com"
                      className="w-full text-[13px] px-3.5 py-1.5 border border-slate-800 bg-slate-950 rounded-lg text-slate-100 placeholder-slate-650 focus:outline-none focus:border-blue-500"
                  />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4 mt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-1.5 border border-slate-700 hover:bg-slate-800 rounded-lg text-[13px] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[13px] flex items-center gap-1.5 shadow-md"
                >
                  <Save size={14} />
                  <span>{editingId ? 'Save Edits' : 'Save Credential'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* List Block */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-500 text-[11px] uppercase tracking-wide px-1">
                  Active Workspace Keys
                </h3>
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-lg text-[12px] shadow-md"
                >
                  <Plus size={14} />
                  Add Credential
                </button>
              </div>

              {credentialsList.length === 0 ? (
                <div className="border border-dashed border-slate-800 rounded-xl p-10 text-center text-slate-500 text-sm">
                  No credentials saved. Clicking Add Credential allows you to configure secure keys for HTTP integrations.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {credentialsList.map((cred) => (
                    <div 
                      key={cred.id} 
                      className="border border-slate-800 bg-slate-950/20 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 hover:shadow-md transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-950/40 text-blue-400 rounded-lg border border-blue-900/40">
                          <Key size={16} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-200 text-[14px]">{cred.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-semibold text-slate-500 uppercase">
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
                              {cred.type}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-green-500 font-bold">
                              <ShieldCheck size={11} /> AES-256 Encrypted
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEdit(cred)}
                          className="p-2 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
                          title="Edit Credential Parameters"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(cred.id)}
                          className="p-2 border border-red-950/60 hover:bg-red-950/30 rounded-lg text-red-400 hover:text-red-300 transition"
                          title="Delete Credential"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
