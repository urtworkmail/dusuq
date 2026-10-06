import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authAPI } from '@/api/endpoints'
import { Spinner } from '@/components/ui'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [status, setStatus] = useState('pending') // pending | success | error
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!token) {
      setStatus('error')
      setError('This verification link is missing its token.')
      return
    }
    authAPI.verifyEmail({ token })
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error')
        setError(err.response?.data?.token?.[0] || 'This verification link is invalid or has expired.')
      })
  }, [token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🐄</span>
          <h1 className="text-3xl font-bold text-white mt-3">Dusuq ERP</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {status === 'pending' && (
            <>
              <Spinner size={28} className="mx-auto mb-4" />
              <p className="text-gray-500">Verifying your email…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Email verified ✅</h2>
              <p className="text-sm text-gray-500 mb-6">You're all set. You can now sign in and use the app.</p>
              <Link to="/login" className="btn btn-primary w-full btn-lg">Go to sign in</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Couldn't verify this link</h2>
              <p className="text-sm text-gray-500 mb-6">{error}</p>
              <p className="text-xs text-gray-400 mb-4">Sign in and we'll offer to resend a fresh verification email.</p>
              <Link to="/login" className="btn btn-secondary w-full btn-lg">Back to sign in</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
