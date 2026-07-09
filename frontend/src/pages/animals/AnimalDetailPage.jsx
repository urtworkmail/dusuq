import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { animalAPI, reproAPI, healthAPI, milkAPI } from '@/api/endpoints'
import { PageSpinner, StatusBadge } from '@/components/ui'
import { ArrowLeft, Beef } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AnimalDetailPage() {
  const { id } = useParams()

  const { data: animal, isLoading } = useQuery({
    queryKey: ['animal', id],
    queryFn: () => animalAPI.get(id).then(r => r.data),
  })

  const { data: inseminations } = useQuery({
    queryKey: ['inseminations', id],
    queryFn: () => reproAPI.listInseminations({ animal: id }).then(r => r.data),
    enabled: !!id,
  })

  const { data: treatments } = useQuery({
    queryKey: ['treatments', id],
    queryFn: () => healthAPI.listTreatments({ animal: id }).then(r => r.data),
    enabled: !!id,
  })

  const { data: milkData } = useQuery({
    queryKey: ['milk-records', id],
    queryFn: () => milkAPI.listRecords({ animal: id, page_size: 60 }).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return <PageSpinner />
  if (!animal) return <div className="text-center py-20 text-gray-400">Animal not found.</div>

  const milkRecords = milkData?.results ?? []
  const milkChartData = Object.entries(
    milkRecords.reduce((acc, r) => {
      acc[r.date] = (acc[r.date] || 0) + parseFloat(r.litres)
      return acc
    }, {})
  ).map(([date, total]) => ({ date, total: +total.toFixed(2) })).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <div className="mb-5">
        <Link to="/animals" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-3">
          <ArrowLeft size={16} /> Back to Animals
        </Link>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Beef size={28} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{animal.name || animal.tag_number}</h1>
            <p className="text-gray-500 text-sm">Tag: {animal.tag_number}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusBadge status={animal.status} />
              <span className="text-xs text-gray-400 capitalize">{animal.sex}</span>
              {animal.breed_detail && <span className="badge badge-gray">{animal.breed_detail.name}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Details */}
        <div className="card lg:col-span-1">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Animal Profile</h3>
          <dl className="space-y-2 text-sm">
            {[
              ['Date of Birth', animal.date_of_birth],
              ['Age', animal.age_months ? `${animal.age_months} months` : '—'],
              ['Lactation No.', animal.lactation_number],
              ['Shed', animal.shed_detail?.name ?? '—'],
              ['Group', animal.group_detail?.name ?? '—'],
              ['Dam (Mother)', animal.dam_tag ?? '—'],
              ['Sire Tag', animal.sire_tag || '—'],
              ['Weight', animal.weight_kg ? `${animal.weight_kg} kg` : '—'],
              ['Purchase Date', animal.purchase_date ?? '—'],
              ['Purchase Price', animal.purchase_price ?? '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-gray-50 pb-1.5">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-medium text-gray-800">{v ?? '—'}</dd>
              </div>
            ))}
          </dl>
          {animal.notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">{animal.notes}</div>
          )}
        </div>

        {/* Milk chart */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Daily Milk Production (Last 60 Days)</h3>
          {milkChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={milkChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => `${v}L`} />
                <Line type="monotone" dataKey="total" stroke="#1A6B3C" strokeWidth={2} dot={false} name="Litres" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No milk records</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Insemination history */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Insemination History</h3>
          {(inseminations?.results ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No insemination records</p>
          ) : (
            <div className="space-y-2">
              {(inseminations.results ?? []).slice(0, 10).map(ins => (
                <div key={ins.id} className="flex justify-between items-start text-sm p-2 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-800">{ins.insemination_type === 'ai' ? 'AI' : 'Bull Service'}</p>
                    <p className="text-xs text-gray-500">{ins.semen_batch || ins.bull_tag || '—'} · {ins.technician_name || 'No technician'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">{ins.date}</p>
                    <p className="text-xs text-gray-400">ECD: {ins.expected_calving_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Treatment history */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Treatment History</h3>
          {(treatments?.results ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No treatment records</p>
          ) : (
            <div className="space-y-2">
              {(treatments.results ?? []).slice(0, 10).map(t => (
                <div key={t.id} className="flex justify-between items-start text-sm p-2 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-800">{t.diagnosis}</p>
                    <p className="text-xs text-gray-500">{t.drug} · {t.dosage}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">{t.date}</p>
                    <span className={`badge text-xs ${t.outcome === 'recovered' ? 'badge-green' : t.outcome === 'ongoing' ? 'badge-yellow' : 'badge-gray'}`}>{t.outcome}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
