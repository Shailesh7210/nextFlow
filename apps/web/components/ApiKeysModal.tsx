import React, { useEffect, useState } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { X, KeyRound, Plus, Trash2, Copy, Check, ShieldAlert, Code } from 'lucide-react'

const BACKEND_URL = 'http://localhost:8000'

export default function ApiKeysModal() {
  const { isApiKeysModalOpen, setApiKeysModalOpen } = useWorkflowStore()

  const [token, setToken] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  const [keysList, setKeysList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // One-time plain key display modal state
  const [createdPlainKey, setCreatedPlainKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setToken(localStorage.getItem('token'))
    setWorkspaceId(localStorage.getItem('workspace_id'))
  }, [isApiKeysModalOpen])

  const fetchKeys = async () => {
    if (!token || !workspaceId) return
    setIsLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/api-keys`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        }
      })
      if (res.ok) {
        const data = await res.json()
        setKeysList(data)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isApiKeysModalOpen && token && workspaceId) {
      fetchKeys()
    }
  }, [isApiKeysModalOpen, token, workspaceId])

  if (!isApiKeysModalOpen) return null

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !workspaceId) return
    setError(null)

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        },
        body: JSON.stringify({ name: keyName })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to generate API key.')
      }

      const keyData = await res.json()
      setCreatedPlainKey(keyData.api_key)
      setKeyName('')
      setIsCreating(false)
      fetchKeys()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!token || !workspaceId) return
    if (!confirm('Are you sure you want to revoke this API key? External applications using it will lose access immediately.')) return
    setError(null)

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Workspace-ID': workspaceId
        }
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to revoke API key.')
      }

      fetchKeys()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm font-sans animate-fade-in">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[85vh] text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
          <div className="flex items-center gap-2 text-slate-100">
            <KeyRound size={18} className="text-amber-400" />
            <h2 className="font-bold text-[15px]">Developer API Keys Management</h2>
          </div>
          <button 
            onClick={() => { setApiKeysModalOpen(false); setError(null); setCreatedPlainKey(null); }}
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

          {/* Secret Key Modal Banner */}
          {createdPlainKey && (
            <div className="border border-amber-500/50 bg-amber-950/40 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-[13px]">
                <ShieldAlert size={16} />
                <span>Save Your API Key Now</span>
              </div>
              <p className="text-slate-300 text-[12px]">
                This key will <strong>never be displayed again</strong>. Make sure to copy it now and store it securely in your environment variables.
              </p>
              <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <code className="flex-1 font-mono text-[12px] text-amber-400 break-all select-all">
                  {createdPlainKey}
                </code>
                <button
                  onClick={() => copyToClipboard(createdPlainKey)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[12px] flex items-center gap-1 transition"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <button
                onClick={() => setCreatedPlainKey(null)}
                className="self-end text-[11px] text-slate-400 hover:text-slate-200 underline mt-1"
              >
                I have saved this key safely
              </button>
            </div>
          )}

          {/* Create Form or List Actions */}
          {isCreating ? (
            <form onSubmit={handleCreateKey} className="border border-slate-800 rounded-xl p-4 bg-slate-950/40 flex flex-col gap-3">
              <h3 className="font-bold text-slate-300 text-[13px] uppercase tracking-wide flex items-center gap-2">
                <Plus size={15} className="text-amber-400" />
                Generate New Developer API Key
              </h3>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Key Label / Identifier
                </label>
                <input
                  type="text"
                  required
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. CI/CD Deployment Token or Production Webhook Relay"
                  className="w-full text-[13px] px-3.5 py-1.5 border border-slate-800 bg-slate-950 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 border border-slate-700 hover:bg-slate-800 rounded-lg text-[12px] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-[12px] shadow-md flex items-center gap-1.5"
                >
                  <KeyRound size={14} />
                  <span>Generate Key</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-400 text-[12px] uppercase tracking-wide">
                  Active Developer Keys ({keysList.length})
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Use these SHA-256 hashed keys to trigger workflows programmatically via REST API.
                </p>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5 rounded-lg text-[12px] shadow-md transition"
              >
                <Plus size={14} />
                <span>Create API Key</span>
              </button>
            </div>
          )}

          {/* Keys List */}
          {isLoading ? (
            <div className="py-8 text-center text-slate-500 text-xs">Loading keys...</div>
          ) : keysList.length === 0 ? (
            <div className="border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
              No developer API keys active for this workspace. Click Create API Key to generate one.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {keysList.map((k) => (
                <div 
                  key={k.id}
                  className="border border-slate-800 bg-slate-950/30 rounded-xl p-3.5 flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-950/50 border border-amber-800/40 text-amber-400 rounded-lg">
                      <Code size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-slate-200">{k.name}</span>
                        <code className="text-[11px] bg-slate-900 px-2 py-0.5 rounded text-amber-300 border border-slate-800 font-mono">
                          {k.key_prefix}
                        </code>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Created: {new Date(k.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeKey(k.id)}
                    className="p-1.5 border border-red-950/60 hover:bg-red-950/30 rounded text-red-400 hover:text-red-300 transition"
                    title="Revoke API key"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
