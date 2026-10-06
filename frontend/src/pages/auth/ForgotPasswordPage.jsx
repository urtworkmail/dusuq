import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '@/api/endpoints'
import { Spinner } from '@/components/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
    } finally {
      // Always show the same success state — the backend deliberately never
      // reveals whether the email matched an account.
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🐄</span>
          <h1 className="text-3xl font-bold text-white mt-3">Dusuq ERP</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {sent ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-gray-500 mb-6">
                If an account exists for <span className="font-medium">{email}</span>, we've sent a link to reset your password. It expires in 1 hour.
              </p>
              <Link to="/login" className="btn btn-secondary w-full btn-lg">Back to sign in</Link>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset your password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter the email on your account and we'll send you a reset link.</p>
              <form onSubmit={handle} className="space-y-4">
                <div>
                  <label className="form-label">Email address</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="form-input"
                    placeholder="you@example.com"
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg mt-2">
                  {loading ? <Spinner size={18} className="text-white" /> : 'Send reset link'}
                </button>
                <Link to="/login" className="block text-center text-sm text-gray-500 hover:underline">
                  Back to sign in
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
