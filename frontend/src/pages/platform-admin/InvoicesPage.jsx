import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { platformAdminAPI } from '@/api/endpoints'
import { DataTable, Pagination } from '@/components/ui'
import { CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUSES = ['open', 'paid', 'overdue', 'void']

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-invoices', page, statusFilter],
    queryFn: () => platformAdminAPI.listInvoices({ page, status: statusFilter || undefined }).then(r => r.data),
  })
  const markPaidMut = useMutation({
    mutationFn: (id) => platformAdminAPI.updateInvoice(id, { status: 'paid' }),
    onSuccess: () => { toast.success('Invoice marked paid'); qc.invalidateQueries(['platform-admin-invoices']) },
    onError: () => toast.error('Failed to update invoice'),
  })
  const cols = [
    { key: 'tenant_name', label: 'Farm' },
    { key: 'period_start', label: 'Period', render: (_, row) => `${row.period_start} — ${row.period_end}` },
    { key: 'plan_amount_pkr', label: 'Plan Amount', render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'ai_usage_amount_usd', label: 'AI Usage', render: v => `$${Number(v).toLocaleString()}` },
    { key: 'gateway', label: 'Gateway', render: v => <span className="capitalize">{v}</span> },
    { key: 'status', label: 'Status', render: v => <span className={`badge ${v === 'paid' ? 'badge-green' : v === 'overdue' ? 'badge-red' : v === 'void' ? 'badge-gray' : 'badge-blue'} capitalize`}>{v}</span> },
    { key: 'paid_at', label: 'Paid At', render: v => v ? new Date(v).toLocaleString() : '—' },
    {
      key: 'actions', label: '', render: (_, row) => row.status !== 'paid' && (
        <button onClick={() => markPaidMut.mutate(row.id)} disabled={markPaidMut.isPending} className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium">
          <CheckCircle size={14} />Mark Paid
        </button>
      )
    },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Invoices</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select w-40">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={data?.results ?? []} loading={isLoading} /></div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
    </div>
  )
}
