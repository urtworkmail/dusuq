import { useQuery } from '@tanstack/react-query'
import { platformAdminAPI } from '@/api/endpoints'
import { StatCard, PageSpinner } from '@/components/ui'
import {
  Users, Building2, TrendingUp, Wallet, Wifi, Ticket,
  Beef, Droplets, Sparkles, Server, Activity,
} from 'lucide-react'

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-dashboard'],
    queryFn: () => platformAdminAPI.dashboard().then(r => r.data),
    refetchInterval: 30000,
  })
  if (isLoading) return <PageSpinner />
  const u = data?.users ?? {}
  const f = data?.farms ?? {}
  const s = data?.subscriptions ?? {}
  const a = data?.farm_activity ?? {}
  const health = data?.server_health ?? {}

  return (
    <div className="space-y-6">
      <h1 className="page-title">Platform Dashboard</h1>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Users</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Total Sign-ups" value={u.total_signups ?? '—'} icon={Users} color="bg-blue-50" iconColor="text-blue-600" />
          <StatCard label="Online Now" value={u.currently_online ?? '—'} icon={Wifi} color="bg-green-50" iconColor="text-green-600" />
          <StatCard label="DAU" value={u.dau ?? '—'} icon={Activity} />
          <StatCard label="WAU" value={u.wau ?? '—'} icon={Activity} />
          <StatCard label="MAU" value={u.mau ?? '—'} icon={Activity} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Farms</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Farms" value={f.total_farms ?? '—'} icon={Building2} color="bg-purple-50" iconColor="text-purple-600" />
          <StatCard label="New Today" value={f.new_today ?? '—'} icon={Building2} />
          <StatCard label="New This Week" value={f.new_this_week ?? '—'} icon={Building2} />
          <StatCard label="New This Month" value={f.new_this_month ?? '—'} icon={Building2} />
        </div>
        {(f.by_province?.length > 0 || f.by_district?.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="card">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">By Province</h4>
              {f.by_province?.map((r, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50">
                  <span>{r.province}</span><span className="font-medium">{r.count}</span>
                </div>
              ))}
              {f.unassigned_province_count > 0 && (
                <p className="text-xs text-gray-400 mt-2">{f.unassigned_province_count} farm(s) with no province set</p>
              )}
            </div>
            <div className="card">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">By District</h4>
              {f.by_district?.map((r, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-50">
                  <span>{r.district}</span><span className="font-medium">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Subscriptions &amp; Revenue</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Paid" value={s.paid ?? '—'} icon={Wallet} color="bg-green-50" iconColor="text-green-600" />
          <StatCard label="Trial" value={s.trial ?? '—'} icon={Wallet} color="bg-amber-50" iconColor="text-amber-600" />
          <StatCard label="Expired" value={s.expired ?? '—'} icon={Wallet} color="bg-red-50" iconColor="text-red-600" />
          <StatCard label="MRR" value={s.mrr_pkr != null ? `PKR ${Number(s.mrr_pkr).toLocaleString()}` : '—'} icon={TrendingUp} />
          <StatCard label="ARR" value={s.arr_pkr != null ? `PKR ${Number(s.arr_pkr).toLocaleString()}` : '—'} icon={TrendingUp} />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Farm Activity (Platform-wide)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Animals" value={a.total_animals ?? '—'} icon={Beef} />
          <StatCard label="Milk Today" value={a.milk_production_today_litres != null ? `${a.milk_production_today_litres} L` : '—'} icon={Droplets} />
          <StatCard label="AI Calls (30d)" value={a.ai_usage_last_30d_calls ?? '—'} icon={Sparkles} />
          <StatCard label="AI Calls (all-time)" value={a.ai_usage_total_calls ?? '—'} icon={Sparkles} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Ticket size={13} />Support Tickets</h4>
          {Object.entries(data?.support_tickets ?? {}).map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-1 border-b border-gray-50">
              <span className="capitalize">{k.replace(/_/g, ' ')}</span><span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><Server size={13} />Server Health</h4>
          <div className="flex justify-between text-sm py-1 border-b border-gray-50">
            <span>Database</span>
            <span className={`badge ${health.database === 'ok' ? 'badge-green' : 'badge-red'}`}>{health.database}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span>Redis</span>
            <span className={`badge ${health.redis === 'ok' ? 'badge-green' : 'badge-red'}`}>{health.redis}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
