import { useState } from 'react'
import { MailWarning } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { authAPI } from '@/api/endpoints'
import { Spinner } from '@/components/ui'

// Mandatory, non-dismissible — mirrors what TenantMiddleware enforces
// server-side (every non-/api/auth/ request 403s with code
// "email_verification_required" until the user clicks the emailed link), so
// there's no "x" here: the backend would just block the next action anyway.
export default function EmailVerificationGate() {
  const { user, logout } = useAuth()
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  if (!user || user.is_email_verified) return null

  const resend = async () => {
    setSending(true)
    setError('')
    try {
      await authAPI.resendVerification()
      setSent(true)
    } catch {
      setError('Could not send the email right now. Please try again shortly.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <MailWarning size={26} className="text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Verify your email to continue</h2>
        <p className="text-sm text-gray-500 mb-1">
          We sent a verification link to <span className="font-medium text-gray-700">{user.email}</span>.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Click it to unlock your farm's dashboard — you'll need to do this before you can use Dusuq ERP.
        </p>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4 border border-red-100">
            {error}
          </div>
        )}

        {sent ? (
          <div className="bg-green-50 text-green-700 text-sm rounded-lg px-4 py-3 mb-4 border border-green-100">
            Verification email sent — check your inbox (and spam folder).
          </div>
        ) : (
          <button onClick={resend} disabled={sending} className="btn btn-primary w-full btn-lg">
            {sending ? <Spinner size={18} className="text-white" /> : 'Resend verification email'}
          </button>
        )}

        <button onClick={logout} className="w-full text-center text-sm text-gray-500 hover:underline mt-4">
          Sign out
        </button>
      </div>
    </div>
  )
}
