import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { platformAdminAPI } from '@/api/endpoints'
import { DataTable, Pagination, Modal, FormField, Spinner } from '@/components/ui'
import { Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const STATUSES = ['trialing', 'active', 'past_due', 'canceled', 'expired']
const GATEWAYS = ['none', 'stripe', 'payfast', 'manual']

export default function SubscriptionsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-subscriptions', page, statusFilter],
    queryFn: () => platformAdminAPI.listSubscriptions({ page, status: statusFilter || undefined }).then(r => r.data),
  })
  const { register, handleSubmit, reset } = useForm()
  const mut = useMutation({
    mutationFn: (d) => platformAdminAPI.updateSubscription(editTarget.id, d),
    onSuccess: () => { toast.success('Subscription updated'); qc.invalidateQueries(['platform-admin-subscriptions']); setEditTarget(null) },
    onError: (e) => toast.error(Object.values(e.response?.data ?? {}).flat()[0] ?? 'Error'),
  })
  const openEdit = (sub) => {
    setEditTarget(sub)
    reset({
      status: sub.status, gateway: sub.gateway,
      current_period_end: sub.current_period_end ? format(new Date(sub.current_period_end), "yyyy-MM-dd'T'HH:mm") : '',
    })
  }
  const cols = [
    { key: 'tenant_name', label: 'Farm' },
    { key: 'plan_name', label: 'Plan', render: v => v || '—' },
    { key: 'status', label: 'Status', render: v => <span className="badge badge-blue capitalize">{v.replace(/_/g, ' ')}</span> },
    { key: 'gateway', label: 'Gateway', render: v => <span className="capitalize">{v}</span> },
    { key: 'trial_end', label: 'Trial Ends', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'current_period_end', label: 'Period Ends', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'actions', label: '', render: (_, row) => <button onClick={() => openEdit(row)} className="text-primary-600 hover:text-primary-800"><Pencil size={15} /></button> },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Subscriptions</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select w-44">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={data?.results ?? []} loading={isLoading} /></div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit Subscription — ${editTarget?.tenant_name ?? ''}`} size="md">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <FormField label="Status" required>
            <select {...register('status')} className="form-select">
              {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </FormField>
          <FormField label="Gateway">
            <select {...register('gateway')} className="form-select">
              {GATEWAYS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </FormField>
          <FormField label="Current Period End">
            <input type="datetime-local" {...register('current_period_end')} className="form-input" />
          </FormField>
          <p className="text-xs text-gray-400">Setting status to Active manually is the manual-invoicing "mark as paid and activate" workflow — logs an audit entry automatically.</p>
          <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Save'}</button></div>
        </form>
      </Modal>
    </div>
  )
}
