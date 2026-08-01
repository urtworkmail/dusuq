import { useState } from 'react'
import { Info, X } from 'lucide-react'

const STORAGE_PREFIX = 'dusuq_info_dismissed_'

// A small "here's what this page is for" banner, shown once per page per
// browser and then remembered locally — this is pure UX copy, not account
// state, so there's no need to round-trip it through the backend.
export default function PageInfoCard({ pageKey, title, children }) {
  const storageKey = STORAGE_PREFIX + pageKey
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1' } catch { return false }
  })

  if (dismissed) return null

  function dismiss() {
    try { localStorage.setItem(storageKey, '1') } catch {}
    setDismissed(true)
  }

  return (
    <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5">
      <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold text-blue-900">{title}</p>}
        <p className="text-sm text-blue-800">{children}</p>
      </div>
      <button onClick={dismiss} className="p-1 rounded hover:bg-blue-100 text-blue-400 flex-shrink-0" title="Dismiss">
        <X size={15} />
      </button>
    </div>
  )
}
