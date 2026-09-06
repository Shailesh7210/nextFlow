import React, { useEffect, useState } from 'react'
import { useWorkflowStore } from '@/store/useWorkflowStore'
import { X, User, Mail, ShieldCheck, Key, Save, CheckCircle2, Calendar } from 'lucide-react'

const BACKEND_URL = 'http://localhost:8000'

export default function UserProfileModal() {
  const { isProfileModalOpen, setProfileModalOpen } = useWorkflowStore()

  const [token, setToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [fullName, setFullName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    setToken(localStorage.getItem('token'))
  }, [isProfileModalOpen])

  const fetchProfile = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setFullName(data.full_name || '')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isProfileModalOpen && token) {
      fetchProfile()
    }
  }, [isProfileModalOpen, token])

  if (!isProfileModalOpen) return null

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setError(null)
    setSuccessMsg(null)

    if (newPassword && newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setIsSaving(true)
    try {
      const payload: any = { full_name: fullName }
      if (newPassword) {
        payload.current_password = currentPassword
        payload.new_password = newPassword
      }

      const res = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to update profile.')
      }

      const updated = await res.json()
      setProfile(updated)
      setSuccessMsg('Profile updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-4 backdrop-blur-xs font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] text-slate-800 dark:text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <User size={18} className="text-blue-500" />
            <h2 className="font-bold text-sm">User Profile Settings</h2>
          </div>
          <button 
            onClick={() => { setProfileModalOpen(false); setError(null); setSuccessMsg(null); }}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-300 text-xs rounded-lg flex items-center gap-2">
              <CheckCircle2 size={14} />
              <span>{successMsg}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading profile information...</div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="flex flex-col gap-5">
              {/* Account Summary Banner */}
              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-500 font-extrabold text-base flex items-center justify-center shrink-0">
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : profile?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {profile?.full_name || 'NexFlow User'}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Mail size={12} />
                    <span className="truncate">{profile?.email}</span>
                  </div>
                  {profile?.created_at && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                      <Calendar size={11} />
                      <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Details */}
              <div className="flex flex-col gap-3">
                <h3 className="font-semibold text-xs text-slate-400 uppercase tracking-wider">
                  Personal Details
                </h3>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full text-xs px-3.5 py-2 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Change Password */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col gap-3">
                <h3 className="font-semibold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={13} className="text-amber-500" />
                  Change Password (Optional)
                </h3>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Required to set new password"
                    className="w-full text-xs px-3.5 py-2 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs px-3.5 py-2 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs px-3.5 py-2 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
