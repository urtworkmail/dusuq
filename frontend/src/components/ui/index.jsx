import { Fragment } from 'react'
import { X, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx('relative bg-white rounded-2xl shadow-2xl w-full', sizes[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-base">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto max-h-[80vh]">{children}</div>
      </div>
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, className }) {
  return <Loader2 size={size} className={clsx('animate-spin text-primary-600', className)} />
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} />
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon size={40} className="text-gray-300 mb-4" />}
      <h3 className="font-semibold text-gray-600 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color = 'bg-primary-50', iconColor = 'text-primary-600', sub }) {
  return (
    <div className="stat-card">
      <div className={clsx('stat-icon', color)}>
        {Icon && <Icon size={20} className={iconColor} />}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── DataTable ────────────────────────────────────────────────────────────────
export function DataTable({ columns, data, loading, emptyMessage = 'No records found.' }) {
  if (loading) return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={col.width ? { width: col.width } : {}}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-sm text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id ?? i}>
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ count, page, pageSize = 50, onPage }) {
  if (!count || count <= pageSize) return null
  const total = Math.ceil(count / pageSize)
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
      <span>Showing {Math.min((page - 1) * pageSize + 1, count)}–{Math.min(page * pageSize, count)} of {count}</span>
      <div className="flex gap-1">
        <button disabled={page === 1} onClick={() => onPage(page - 1)} className="btn btn-secondary btn-sm disabled:opacity-40">
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: Math.min(total, 7) }, (_, i) => {
          const p = i + 1
          return (
            <button key={p} onClick={() => onPage(p)}
              className={clsx('btn btn-sm', p === page ? 'btn-primary' : 'btn-secondary')}>
              {p}
            </button>
          )
        })}
        <button disabled={page === total} onClick={() => onPage(page + 1)} className="btn btn-secondary btn-sm disabled:opacity-40">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex gap-3 mb-5">
        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-gray-700">{message}</p>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className={clsx('btn', danger ? 'btn-danger' : 'btn-primary')} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

// ─── FormField ────────────────────────────────────────────────────────────────
export function FormField({ label, error, required, children }) {
  return (
    <div>
      {label && (
        <label className="form-label">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

// ─── DateRangeFilter ─────────────────────────────────────────────────────────
export function DateRangeFilter({ from, to, onFrom, onTo }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
        <input type="date" value={from} onChange={e => onFrom(e.target.value)} className="form-input w-36 text-xs" />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
        <input type="date" value={to} onChange={e => onTo(e.target.value)} className="form-input w-36 text-xs" />
      </div>
    </div>
  )
}

// ─── SearchInput ─────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="form-input w-48 sm:w-64"
    />
  )
}

// ─── AnimalStatusBadge ────────────────────────────────────────────────────────
const STATUS_STYLE = {
  heifer:      'badge-blue',
  open:        'badge-green',
  inseminated: 'badge-purple',
  pregnant:    'badge-yellow',
  dry:         'badge-gray',
  sick:        'badge-red',
  sold:        'badge-gray',
  dead:        'badge-red',
  culled:      'badge-gray',
}

export function StatusBadge({ status }) {
  return (
    <span className={clsx('badge', STATUS_STYLE[status] ?? 'badge-gray')}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}
