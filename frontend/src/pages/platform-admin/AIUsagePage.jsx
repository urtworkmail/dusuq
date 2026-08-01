import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { platformAdminAPI } from '@/api/endpoints'
import { DataTable, Pagination } from '@/components/ui'

export default function AIUsagePage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-ai-usage', page],
    queryFn: () => platformAdminAPI.listAIUsage({ page }).then(r => r.data),
  })
  const cols = [
    { key: 'tenant_name', label: 'Farm' },
    { key: 'user_email', label: 'User', render: v => v || '—' },
    { key: 'kind', label: 'Kind', render: v => <span className="capitalize badge badge-gray">{v}</span> },
    { key: 'model_name', label: 'Model' },
    { key: 'input_tokens', label: 'Input Tokens', render: v => Number(v).toLocaleString() },
    { key: 'output_tokens', label: 'Output Tokens', render: v => Number(v).toLocaleString() },
    { key: 'api_cost_usd', label: 'API Cost', render: v => `$${Number(v).toFixed(6)}` },
    { key: 'billed_amount_usd', label: 'Billed', render: v => `$${Number(v).toFixed(6)}` },
    { key: 'created_at', label: 'When', render: v => new Date(v).toLocaleString() },
  ]
  return (
    <div className="space-y-4">
      <h1 className="page-title">AI Usage</h1>
      <div className="card p-0"><DataTable columns={cols} data={data?.results ?? []} loading={isLoading} /></div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
    </div>
  )
}
