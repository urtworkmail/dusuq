import { useQuery } from '@tanstack/react-query'
import { animalAPI, reproAPI, healthAPI, milkAPI, inventoryAPI } from '@/api/endpoints'
import { StatCard, PageSpinner } from '@/components/ui'
import { Beef, Droplets, Heart, Package, Calendar, TrendingUp, AlertTriangle, Syringe } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { format } from 'date-fns'

const COLORS = ['#1A6B3C', '#2e8b57', '#4db37f', '#87d0aa', '#bbe5cc']

export default function DashboardPage() {
  const { data: animals } = useQuery({ queryKey: ['animal-summary'], queryFn: () => animalAPI.summary().then(r => r.data) })
  const { data: repro }   = useQuery({ queryKey: ['repro-dashboard'], queryFn: () => reproAPI.dashboard().then(r => r.data) })
  const { data: health }  = useQuery({ queryKey: ['health-dashboard'], queryFn: () => healthAPI.dashboard().then(r => r.data) })
  const { data: milk }    = useQuery({ queryKey: ['milk-dashboard'], queryFn: () => milkAPI.dashboard().then(r => r.data) })
  const { data: stock }   = useQuery({ queryKey: ['inventory-dashboard'], queryFn: () => inventoryAPI.dashboard().then(r => r.data) })

  const loading = !animals || !repro || !milk

  if (loading) return <PageSpinner />

  const herd = repro?.herd_position ?? {}
  const pieData = [
    { name: 'Milking', value: herd.milking ?? 0 },
    { name: 'Dry', value: herd.dry ?? 0 },
    { name: 'Heifer', value: herd.heifer ?? 0 },
    { name: 'Sick', value: herd.sick ?? 0 },
  ].filter(d => d.value > 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Executive Dashboard</h1>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Animals"   value={animals?.total}   icon={Beef}       color="bg-green-50"  iconColor="text-green-600" />
        <StatCard label="Milking Animals" value={herd.milking}     icon={Droplets}  color="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard label="Pregnant"        value={herd.pregnant}    icon={Syringe}   color="bg-purple-50" iconColor="text-purple-600" />
        <StatCard label="Today's Milk"    value={milk?.today_total_litres ? `${milk.today_total_litres}L` : '—'} icon={TrendingUp} color="bg-cyan-50" iconColor="text-cyan-600" />
        <StatCard label="Active Sick"     value={health?.active_treatments} icon={Heart} color="bg-red-50" iconColor="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Milk trend */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Monthly Milk Production (Litres)</h3>
          {milk?.daily_totals?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChartWrapper data={milk.daily_totals} />
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data yet</div>
          )}
        </div>

        {/* Herd composition pie */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Herd Composition</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No animals yet</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Conception rate trend */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Conception Rate Trend (%)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={repro?.monthly_trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="conception_rate" fill="#1A6B3C" radius={[4, 4, 0, 0]} name="Conception Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts summary */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Action Required</h3>
          <div className="space-y-2.5">
            <AlertRow icon={Calendar} color="text-blue-500" bg="bg-blue-50"
              label="Upcoming Calvings" value={repro?.upcoming_calvings?.length} unit="in 30 days" />
            <AlertRow icon={Syringe} color="text-purple-500" bg="bg-purple-50"
              label="Preg Checks Due" value={repro?.herd_position?.inseminated} unit="animals" />
            <AlertRow icon={Heart} color="text-green-500" bg="bg-green-50"
              label="Vaccination Due" value={health?.vaccination_due_14_days} unit="in 14 days" />
            <AlertRow icon={Heart} color="text-yellow-500" bg="bg-yellow-50"
              label="Deworming Due" value={health?.deworming_due_14_days} unit="in 14 days" />
            <AlertRow icon={AlertTriangle} color="text-red-500" bg="bg-red-50"
              label="Low Stock Items" value={stock?.low_stock_count} unit="products" />
          </div>
        </div>
      </div>

      {/* Upcoming calvings table */}
      {repro?.upcoming_calvings?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Upcoming Calvings (Next 30 Days)</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Tag</th>
                  <th>Expected Date</th>
                  <th>Days Remaining</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {repro.upcoming_calvings.map((c, i) => (
                  <tr key={i}>
                    <td className="font-medium">{c.animal_name}</td>
                    <td>{c.animal_tag}</td>
                    <td>{c.expected_calving_date}</td>
                    <td>
                      <span className={`badge ${c.days_remaining <= 3 ? 'badge-red' : c.days_remaining <= 7 ? 'badge-yellow' : 'badge-green'}`}>
                        {c.days_remaining}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function AlertRow({ icon: Icon, color, bg, label, value, unit }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon size={16} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900 text-sm">{value ?? 0} <span className="font-normal text-xs text-gray-400">{unit}</span></p>
      </div>
    </div>
  )
}

// Simple area chart using Recharts LineChart with area fill
import { AreaChart, Area } from 'recharts'
function AreaChartWrapper({ data }) {
  return (
    <AreaChart data={data}>
      <defs>
        <linearGradient id="milkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#1A6B3C" stopOpacity={0.2} />
          <stop offset="95%" stopColor="#1A6B3C" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
      <YAxis tick={{ fontSize: 10 }} />
      <Tooltip formatter={(v) => `${v}L`} />
      <Area type="monotone" dataKey="total" stroke="#1A6B3C" strokeWidth={2} fill="url(#milkGrad)" name="Litres" />
    </AreaChart>
  )
}
