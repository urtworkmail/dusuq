import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    const result = await login(form.email, form.password)
    if (!result.ok) setError(result.error)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🐄</span>
          <h1 className="text-3xl font-bold text-white mt-3">DairyCare</h1>
          <p className="text-green-200 mt-1 text-sm">Farm Management Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your farm</h2>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4 border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="form-label">Email address</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="form-input"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="form-input"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full btn-lg mt-2"
            >
              {loading ? <Spinner size={18} className="text-white" /> : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            New farm?{' '}
            <Link to="/register" className="text-primary-600 font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
