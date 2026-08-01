import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { platformAdminAPI } from '@/api/endpoints'
import { PageSpinner, StatCard } from '@/components/ui'
import { ArrowLeft, Building2, Users, Beef, Droplets, Ban, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function FarmDetailPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { data: farm, isLoading } = useQuery({
    queryKey: ['platform-admin-farm', id],
    queryFn: () => platformAdminAPI.getFarm(id).then(r => r.data),
  })
  const toggleMut = useMutation({
    mutationFn: (is_active) => platformAdminAPI.toggleFarmActive(id, is_active),
    onSuccess: () => { toast.success('Farm status updated'); qc.invalidateQueries(['platform-admin-farm', id]); qc.invalidateQueries(['platform-admin-farms']) },
    onError: () => toast.error('Failed to update farm status'),
  })

  if (isLoading) return <PageSpinner />
  if (!farm) return <div className="text-center py-20 text-gray-400">Farm not found.</div>
  const sub = farm.subscription

  return (
    <div className="space-y-5">
      <Link to="/platform-admin/farms" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={14} />Back to Farms</Link>

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Building2 size={28} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{farm.name}</h1>
            <p className="text-gray-500 text-sm">{farm.owner_email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`badge ${farm.is_active ? 'badge-green' : 'badge-red'}`}>{farm.is_active ? 'Active' : 'Suspended'}</span>
              {sub && <span className="badge badge-blue capitalize">{sub.status.replace(/_/g, ' ')}</span>}
            </div>
          </div>
        </div>
        <button
          onClick={() => toggleMut.mutate(!farm.is_active)}
          disabled={toggleMut.isPending}
          className={`btn ${farm.is_active ? 'btn-danger' : 'btn-primary'}`}
        >
          {farm.is_active ? <><Ban size={16} />Suspend Farm</> : <><CheckCircle size={16} />Reactivate Farm</>}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Users" value={farm.user_count} icon={Users} />
        <StatCard label="Animals" value={farm.animal_count} icon={Beef} />
        <StatCard label="Milk (30d)" value={`${farm.milk_total_litres_30d} L`} icon={Droplets} />
        <StatCard label="Plan" value={sub?.plan ?? '—'} icon={Building2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Farm Profile</h3>
          <dl className="space-y-2 text-sm">
            {[
              ['Slug', farm.slug],
              ['Phone', farm.phone || '—'],
              ['Address', farm.address || '—'],
              ['City', farm.city || '—'],
              ['District', farm.district || '—'],
              ['Province', farm.province || '—'],
              ['Country', farm.country],
              ['Currency', farm.currency],
              ['Timezone', farm.timezone],
              ['Joined', new Date(farm.created_at).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-gray-50 pb-1.5">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-medium text-gray-800">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Subscription</h3>
          {sub ? (
            <dl className="space-y-2 text-sm">
              {[
                ['Status', sub.status],
                ['Gateway', sub.gateway],
                ['Plan', sub.plan ?? 'None'],
                ['Trial Ends', sub.trial_end ? new Date(sub.trial_end).toLocaleString() : '—'],
                ['Current Period Ends', sub.current_period_end ? new Date(sub.current_period_end).toLocaleString() : '—'],
                ['Access Active', sub.is_access_active ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-gray-50 pb-1.5">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-800 capitalize">{String(v)}</dd>
                </div>
              ))}
            </dl>
          ) : <p className="text-sm text-gray-400">No subscription on record.</p>}
        </div>
      </div>
    </div>
  )
}
