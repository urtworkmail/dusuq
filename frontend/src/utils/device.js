const STORAGE_KEY = 'device_id'

// Identifies this browser (not the physical device) across logins so the
// backend can tell a recognized browser from a new one — see
// TrustedDevice/NewDeviceVerificationRequired on the backend. Generated once
// and persisted; never sent anywhere until login, and carries no PII.
export function getDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    return ''
  }
}
