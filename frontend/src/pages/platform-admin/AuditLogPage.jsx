import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { platformAdminAPI } from '@/api/endpoints'
import { DataTable, Pagination } from '@/components/ui'
import { ScrollText } from 'lucide-react'

const ACTIONS = [
  ['', 'All actions'],
  ['signup', 'Signup'],
  ['farm_created', 'Farm Created'],
  ['subscription_purchased', 'Subscription Purchased'],
  ['subscription_renewed', 'Subscription Renewed'],
  ['login', 'Login'],
  ['logout', 'Logout'],
  ['data_changed', 'Data Changed'],
]

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-audit-log', page, action],
    queryFn: () => platformAdminAPI.auditLog({ page, action: action || undefined }).then(r => r.data),
  })
  const cols = [
    { key: 'created_at', label: 'When', render: v => new Date(v).toLocaleString() },
    { key: 'action_display', label: 'Action' },
    { key: 'tenant_name', label: 'Farm', render: v => v || '—' },
    { key: 'user_email', label: 'User', render: v => v || '—' },
    { key: 'description', label: 'Description' },
    { key: 'ip_address', label: 'IP', render: v => v || '—' },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title flex items-center gap-2"><ScrollText size={20} />Audit Log</h1>
        <select value={action} onChange={e => setAction(e.target.value)} className="form-select w-56">
          {ACTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={data?.results ?? []} loading={isLoading} /></div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
    </div>
  )
}
