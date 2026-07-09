import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'

export default function RegisterPage() {
  const { register, loading } = useAuth()
  const [form, setForm] = useState({
    farm_name: '', farm_slug: '',
    first_name: '', last_name: '', email: '', password: '', phone: '',
  })
  const [errors, setErrors] = useState({})

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (k === 'farm_name') {
      setForm(f => ({ ...f, farm_name: v, farm_slug: v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))
    }
  }

  const handle = async (e) => {
    e.preventDefault()
    setErrors({})
    const result = await register(form)
    if (!result.ok) {
      if (typeof result.error === 'object') setErrors(result.error)
      else setErrors({ non_field_errors: [result.error] })
    }
  }

  const err = (field) => errors[field]?.[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="text-5xl">🐄</span>
          <h1 className="text-3xl font-bold text-white mt-3">DairyCare</h1>
          <p className="text-green-200 mt-1 text-sm">Set up your farm account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Create farm account</h2>

          {errors.non_field_errors && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4 border border-red-100">
              {errors.non_field_errors[0]}
            </div>
          )}

          <form onSubmit={handle} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Farm Name <span className="text-red-500">*</span></label>
                <input value={form.farm_name} onChange={e => set('farm_name', e.target.value)} required className="form-input" placeholder="Green Valley Farm" />
                {err('farm_name') && <p className="form-error">{err('farm_name')}</p>}
              </div>
              <div>
                <label className="form-label">Farm Slug <span className="text-red-500">*</span></label>
                <input value={form.farm_slug} onChange={e => set('farm_slug', e.target.value)} required className="form-input" placeholder="green-valley-farm" />
                {err('farm_slug') && <p className="form-error">{err('farm_slug')}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">First Name <span className="text-red-500">*</span></label>
                <input value={form.first_name} onChange={e => set('first_name', e.target.value)} required className="form-input" />
                {err('first_name') && <p className="form-error">{err('first_name')}</p>}
              </div>
              <div>
                <label className="form-label">Last Name <span className="text-red-500">*</span></label>
                <input value={form.last_name} onChange={e => set('last_name', e.target.value)} required className="form-input" />
                {err('last_name') && <p className="form-error">{err('last_name')}</p>}
              </div>
            </div>

            <div>
              <label className="form-label">Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required className="form-input" placeholder="you@example.com" />
              {err('email') && <p className="form-error">{err('email')}</p>}
            </div>

            <div>
              <label className="form-label">Password <span className="text-red-500">*</span></label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required minLength={8} className="form-input" placeholder="Min. 8 characters" />
              {err('password') && <p className="form-error">{err('password')}</p>}
            </div>

            <div>
              <label className="form-label">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className="form-input" placeholder="+92 300 0000000" />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg mt-2">
              {loading ? <Spinner size={18} className="text-white" /> : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
