import { useQuery } from '@tanstack/react-query'
import { platformAdminAPI } from '@/api/endpoints'
import { StatCard, PageSpinner } from '@/components/ui'
import { Wifi, Users, Building2, Wallet } from 'lucide-react'

export default function LivePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-live'],
    queryFn: () => platformAdminAPI.live().then(r => r.data),
    refetchInterval: 10000,
  })
  if (isLoading) return <PageSpinner />
  return (
    <div className="space-y-4">
      <h1 className="page-title">Live</h1>
      <p className="text-xs text-gray-400">Updates every 10 seconds. Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '—'}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Online Now" value={data?.online_now ?? '—'} icon={Wifi} color="bg-green-50" iconColor="text-green-600" />
        <StatCard label="New Sign-ups Today" value={data?.new_signups_today ?? '—'} icon={Users} />
        <StatCard label="New Farms Today" value={data?.new_farms_today ?? '—'} icon={Building2} />
        <StatCard label="Payments Today" value={data?.payments_today ?? '—'} icon={Wallet} sub={data?.payments_amount_today_pkr != null ? `PKR ${Number(data.payments_amount_today_pkr).toLocaleString()}` : undefined} />
      </div>
    </div>
  )
}
