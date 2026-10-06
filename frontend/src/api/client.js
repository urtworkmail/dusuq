import axios from 'axios'

// VITE_API_URL="" (explicitly empty, not unset) means "same origin as the page" —
// a relative /api works regardless of domain, IP, or http/https, since the API
// is always served from the same nginx host as the frontend in this setup.
const BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:80'

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT + Tenant header on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  const tenantId = localStorage.getItem('tenant_id')
  if (tenantId && tenantId !== 'null' && tenantId !== 'undefined') {
    config.headers['X-Tenant-ID'] = tenantId
  }

  return config
})

// Refresh token on 401; redirect to the "trial ended" page on 402 rather than
// letting every dashboard widget fail silently behind an endless spinner.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (
      error.response?.status === 402 &&
      error.response?.data?.code === 'subscription_inactive' &&
      window.location.pathname !== '/subscription-expired'
    ) {
      window.location.href = '/subscription-expired'
      return Promise.reject(error)
    }

    // Login itself returning 401 (bad credentials, or the device-verification
    // challenge) is not an expired-session case — never run the refresh/
    // redirect-to-login flow for it, let the caller (LoginPage) handle it.
    if (error.response?.data?.code === 'device_verification_required') {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/login/')) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (!refresh) {
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }
      try {
        const { data } = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, { refresh })
        localStorage.setItem('access_token', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        clearAuth()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export function clearAuth() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('tenant_id')
  localStorage.removeItem('user')
}

export default api
