import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { platformAdminAPI } from '@/api/endpoints'
import { DataTable, Pagination, Modal, FormField, Spinner } from '@/components/ui'
import { Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const STATUSES = ['open', 'in_progress', 'resolved', 'closed']
const PRIORITIES = ['low', 'medium', 'high']

export default function SupportTicketsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [editTarget, setEditTarget] = useState(null)
  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-tickets', page, statusFilter],
    queryFn: () => platformAdminAPI.listSupportTickets({ page, status: statusFilter || undefined }).then(r => r.data),
  })
  const { register, handleSubmit, reset } = useForm()
  const mut = useMutation({
    mutationFn: (d) => platformAdminAPI.updateSupportTicket(editTarget.id, d),
    onSuccess: () => { toast.success('Ticket updated'); qc.invalidateQueries(['platform-admin-tickets']); setEditTarget(null) },
    onError: () => toast.error('Failed to update ticket'),
  })
  const openEdit = (t) => { setEditTarget(t); reset({ status: t.status, priority: t.priority, staff_notes: t.staff_notes }) }
  const cols = [
    { key: 'ticket_number', label: 'Ticket #' },
    { key: 'organization_name', label: 'Farm' },
    { key: 'subject', label: 'Subject' },
    { key: 'priority', label: 'Priority', render: v => <span className={`badge ${v === 'high' ? 'badge-red' : v === 'medium' ? 'badge-yellow' : 'badge-gray'} capitalize`}>{v}</span> },
    { key: 'status', label: 'Status', render: v => <span className={`badge ${v === 'resolved' || v === 'closed' ? 'badge-green' : 'badge-blue'} capitalize`}>{v.replace(/_/g, ' ')}</span> },
    { key: 'created_at', label: 'Opened', render: v => new Date(v).toLocaleDateString() },
    { key: 'actions', label: '', render: (_, row) => <button onClick={() => openEdit(row)} className="text-primary-600 hover:text-primary-800"><Pencil size={15} /></button> },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Support Tickets</h1>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select w-40">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={data?.results ?? []} loading={isLoading} /></div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Ticket ${editTarget?.ticket_number ?? ''}`} size="lg">
        {editTarget && (
          <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-gray-500">From:</span> {editTarget.email} ({editTarget.account_username})</p>
              <p><span className="text-gray-500">Farm:</span> {editTarget.organization_name}</p>
              <p className="font-medium mt-2">{editTarget.subject}</p>
              <p className="text-gray-600 whitespace-pre-wrap">{editTarget.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Status">
                <select {...register('status')} className="form-select">
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </FormField>
              <FormField label="Priority">
                <select {...register('priority')} className="form-select">
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Internal Staff Notes (not visible to the customer)">
              <textarea {...register('staff_notes')} rows={3} className="form-input" />
            </FormField>
            <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Save'}</button></div>
          </form>
        )}
      </Modal>
    </div>
  )
}
