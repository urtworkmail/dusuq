import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI } from '@/api/endpoints'
import { Spinner } from '@/components/ui'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await authAPI.resetPasswordConfirm({ token, new_password: password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      const data = err.response?.data
      setError(data?.token?.[0] || data?.new_password?.[0] || data?.detail || 'This link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid link</h2>
          <p className="text-sm text-gray-500 mb-6">This password reset link is missing its token.</p>
          <Link to="/forgot-password" className="btn btn-primary w-full btn-lg">Request a new link</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🐄</span>
          <h1 className="text-3xl font-bold text-white mt-3">Dusuq ERP</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {done ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Password reset</h2>
              <p className="text-sm text-gray-500">You've been signed out everywhere for safety. Redirecting to sign in…</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Choose a new password</h2>
              {error && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4 border border-red-100">
                  {error}
                </div>
              )}
              <form onSubmit={handle} className="space-y-4">
                <div>
                  <label className="form-label">New password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label">Confirm new password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="form-input"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg mt-2">
                  {loading ? <Spinner size={18} className="text-white" /> : 'Reset password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
