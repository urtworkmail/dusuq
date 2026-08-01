import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { platformAdminAPI } from '@/api/endpoints'
import { PageSpinner, StatCard } from '@/components/ui'
import { TrendingUp, Users, Building2 } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const PIE_COLORS = { active: '#1A6B3C', trialing: '#F59E0B', past_due: '#F97316', canceled: '#9CA3AF', expired: '#EF4444' }

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useQuery({
    queryKey: ['platform-admin-analytics', days],
    queryFn: () => platformAdminAPI.analytics({ days }).then(r => r.data),
  })
  if (isLoading) return <PageSpinner />

  const series = data?.daily_series ?? []
  const totalSignups = series.reduce((s, r) => s + r.new_signups, 0)
  const totalFarms = series.reduce((s, r) => s + r.new_farms, 0)
  const latestMrr = data?.mrr_trend?.[data.mrr_trend.length - 1]?.mrr_pkr ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Analytics</h1>
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="form-select w-40">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 12 months</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label={`New Sign-ups (${days}d)`} value={totalSignups} icon={Users} color="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label={`New Farms (${days}d)`} value={totalFarms} icon={Building2} color="bg-purple-50" iconColor="text-purple-600" />
        <StatCard label="Current MRR" value={`PKR ${Number(latestMrr).toLocaleString()}`} icon={TrendingUp} color="bg-green-50" iconColor="text-green-600" />
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">Sign-ups &amp; New Farms</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="new_signups" stroke="#2563eb" strokeWidth={2} dot={false} name="New Sign-ups" />
            <Line type="monotone" dataKey="new_farms" stroke="#7c3aed" strokeWidth={2} dot={false} name="New Farms" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">Cumulative Farms</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="cumulative_farms" stroke="#1A6B3C" strokeWidth={2} dot={false} name="Total Farms" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">MRR Trend (6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.mrr_trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => `PKR ${Number(v).toLocaleString()}`} />
              <Bar dataKey="mrr_pkr" fill="#1A6B3C" radius={[4, 4, 0, 0]} name="MRR" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Subscription Status Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data?.subscription_status_distribution ?? []}
                dataKey="count"
                nameKey="status"
                cx="50%" cy="50%" outerRadius={80}
                label={({ status, count }) => `${status}: ${count}`}
              >
                {(data?.subscription_status_distribution ?? []).map((entry, i) => (
                  <Cell key={i} fill={PIE_COLORS[entry.status] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
