import { createContext, useContext, useState, useCallback } from 'react'
import { clearAuth } from '@/api/client'
import { authAPI } from '@/api/endpoints'

const AuthContext = createContext(null)

function loadUser() {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser)
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const { data } = await authAPI.login({ email, password })
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      if (data.user.tenant_id) localStorage.setItem('tenant_id', data.user.tenant_id)
      else localStorage.removeItem('tenant_id')
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.response?.data?.detail || 'Login failed' }
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (payload) => {
    setLoading(true)
    try {
      const { data } = await authAPI.register(payload)
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      if (data.user.tenant_id) localStorage.setItem('tenant_id', data.user.tenant_id)
      else localStorage.removeItem('tenant_id')
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      const errors = err.response?.data
      return { ok: false, error: errors }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) await authAPI.logout({ refresh })
    } catch {}
    clearAuth()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authAPI.me()
      const updated = { ...user, ...data }
      localStorage.setItem('user', JSON.stringify(updated))
      setUser(updated)
    } catch {}
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
