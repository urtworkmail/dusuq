import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { platformAdminAPI } from '@/api/endpoints'
import { DataTable, Pagination, SearchInput } from '@/components/ui'

export default function FarmsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-farms', page, search],
    queryFn: () => platformAdminAPI.listFarms({ page, search: search || undefined }).then(r => r.data),
  })
  const cols = [
    { key: 'name', label: 'Farm', render: (v, row) => <Link to={`/platform-admin/farms/${row.id}`} className="text-primary-700 font-medium hover:underline">{v}</Link> },
    { key: 'owner_email', label: 'Owner Email' },
    { key: 'city', label: 'City' },
    { key: 'province', label: 'Province', render: v => v || '—' },
    { key: 'plan_name', label: 'Plan', render: v => v || '—' },
    { key: 'subscription_status', label: 'Sub. Status', render: v => v ? <span className="badge badge-blue capitalize">{v.replace(/_/g, ' ')}</span> : '—' },
    { key: 'user_count', label: 'Users' },
    { key: 'animal_count', label: 'Animals' },
    { key: 'is_active', label: 'Status', render: v => <span className={`badge ${v ? 'badge-green' : 'badge-red'}`}>{v ? 'Active' : 'Suspended'}</span> },
    { key: 'created_at', label: 'Joined', render: v => new Date(v).toLocaleDateString() },
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Farms</h1>
        <SearchInput value={search} onChange={setSearch} placeholder="Search farms…" />
      </div>
      <div className="card p-0"><DataTable columns={cols} data={data?.results ?? []} loading={isLoading} /></div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
    </div>
  )
}
