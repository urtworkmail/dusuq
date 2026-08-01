import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { platformAdminAPI } from '@/api/endpoints'
import { DataTable, Pagination, SearchInput } from '@/components/ui'

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-users', page, search],
    queryFn: () => platformAdminAPI.listUsers({ page, search: search || undefined }).then(r => r.data),
  })
  const cols = [
    { key: 'full_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'tenant_name', label: 'Farm', render: v => v || <span className="text-gray-400 italic">Platform admin</span> },
    { key: 'role', label: 'Role', render: v => <span className="capitalize badge badge-gray">{v}</span> },
    { key: 'is_superuser', label: 'Superuser', render: v => v ? <span className="badge badge-blue">Yes</span> : '—' },
    { key: 'is_active', label: 'Status', render: v => <span className={`badge ${v ? 'badge-green' : 'badge-red'}`}>{v ? 'Active' : 'Inactive'}</span> },
    { key: 'last_login', label: 'Last Login', render: v => v ? new Date(v).toLocaleString() : 'Never' },
    { key: 'date_joined', label: 'Joined', render: v => new Date(v).toLocaleDateString() },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Users</h1>
        <SearchInput value={search} onChange={setSearch} placeholder="Search users…" />
      </div>
      <div className="card p-0"><DataTable columns={cols} data={data?.results ?? []} loading={isLoading} /></div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
    </div>
  )
}
