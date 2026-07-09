import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { healthAPI, tenantAPI, authAPI, animalAPI } from '@/api/endpoints'
import { DataTable, Pagination, Modal, DateRangeFilter, PageSpinner, FormField, Spinner, StatCard } from '@/components/ui'
import { Plus, Heart, Syringe, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

const TABS = [
  { to: '/health', label: 'Dashboard', end: true },
  { to: '/health/treatments', label: 'Treatments' },
  { to: '/health/vaccinations', label: 'Vaccinations' },
  { to: '/health/dewormings', label: 'Deworming' },
  { to: '/health/diseases', label: 'Disease Events' },
]

function TabBar() {
  return (
    <div className="flex overflow-x-auto gap-1 border-b border-gray-200 mb-5">
      {TABS.map(t => (
        <NavLink key={t.to} to={t.to} end={t.end}
          className={({ isActive }) =>
            `px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              isActive ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}>{t.label}</NavLink>
      ))}
    </div>
  )
}

function HealthDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['health-dashboard'],
    queryFn: () => healthAPI.dashboard().then(r => r.data),
  })
  if (isLoading) return <PageSpinner />
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Active Treatments"     value={data?.active_treatments}           icon={Heart}   color="bg-red-50"    iconColor="text-red-600" />
        <StatCard label="Vaccination Due (14d)"  value={data?.vaccination_due_14_days}     icon={Syringe} color="bg-green-50"  iconColor="text-green-600" />
        <StatCard label="Deworming Due (14d)"    value={data?.deworming_due_14_days}       icon={Shield}  color="bg-yellow-50" iconColor="text-yellow-600" />
        <StatCard label="Treatment Cost (Mo.)"   value={data?.treatment_cost_this_month != null ? `PKR ${Number(data.treatment_cost_this_month).toLocaleString()}` : '0'} icon={Heart} color="bg-orange-50" iconColor="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Disease Trend (6 Months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.disease_trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Cases" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Top Diseases</h3>
          {(data?.top_diseases ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No disease events recorded</p>
          ) : (
            <div className="space-y-2">
              {data.top_diseases.map((d, i) => (
                <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50">
                  <span className="text-gray-700">{d.disease_name}</span>
                  <span className="badge badge-red">{d.count} case{d.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(data?.follow_up_due ?? []).length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Treatment Follow-ups Due</h3>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Tag</th><th>Name</th><th>Diagnosis</th><th>Follow-up Date</th></tr></thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {data.follow_up_due.map((f, i) => (
                  <tr key={i}>
                    <td>{f['animal__tag_number']}</td>
                    <td>{f['animal__name'] || '—'}</td>
                    <td>{f.diagnosis}</td>
                    <td><span className="badge badge-yellow">{f.follow_up_date}</span></td>
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

function useAllAnimals() {
  return useQuery({
    queryKey: ['animals-all-h'],
    queryFn: () => animalAPI.list({ page_size: 500, is_active: true }).then(r => r.data.results ?? []),
  })
}

function TreatmentForm({ onSubmit, loading }) {
  const { register, handleSubmit } = useForm({
    defaultValues: { route: 'injection', outcome: 'ongoing', withdrawal_days: 0, cost: 0 },
  })
  const { data: animals } = useAllAnimals()
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => authAPI.listUsers().then(r => r.data) })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Animal" required>
          <select {...register('animal', { required: true })} className="form-select">
            <option value="">— Select animal —</option>
            {(animals ?? []).map(a => <option key={a.id} value={a.id}>{a.tag_number}{a.name ? ` — ${a.name}` : ''}</option>)}
          </select>
        </FormField>
        <FormField label="Date" required>
          <input type="date" {...register('date', { required: true })} defaultValue={format(new Date(), 'yyyy-MM-dd')} className="form-input" />
        </FormField>
        <FormField label="Diagnosis" required>
          <input {...register('diagnosis', { required: true })} className="form-input" />
        </FormField>
        <FormField label="Drug" required>
          <input {...register('drug', { required: true })} className="form-input" />
        </FormField>
        <FormField label="Dosage">
          <input {...register('dosage')} className="form-input" />
        </FormField>
        <FormField label="Route">
          <select {...register('route')} className="form-select">
            <option value="injection">Injection</option>
            <option value="oral">Oral</option>
            <option value="iv">IV</option>
            <option value="topical">Topical</option>
          </select>
        </FormField>
        <FormField label="Withdrawal Days">
          <input type="number" {...register('withdrawal_days')} className="form-input" />
        </FormField>
        <FormField label="Cost (PKR)">
          <input type="number" step="0.01" {...register('cost')} className="form-input" />
        </FormField>
        <FormField label="Follow-up Date">
          <input type="date" {...register('follow_up_date')} className="form-input" />
        </FormField>
        <FormField label="Outcome">
          <select {...register('outcome')} className="form-select">
            <option value="ongoing">Ongoing</option>
            <option value="recovered">Recovered</option>
            <option value="chronic">Chronic</option>
            <option value="died">Died</option>
          </select>
        </FormField>
        <FormField label="Administered By">
          <select {...register('administered_by')} className="form-select">
            <option value="">— Select —</option>
            {(users ?? []).filter(u => ['veterinary', 'owner', 'manager'].includes(u.role)).map(u => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label="Notes">
        <textarea {...register('notes')} rows={2} className="form-input" />
      </FormField>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? <Spinner size={16} className="text-white" /> : 'Save Treatment'}
        </button>
      </div>
    </form>
  )
}

function VaccinationForm({ onSubmit, loading }) {
  const { register, handleSubmit, watch } = useForm({ defaultValues: { is_group_vaccination: false, cost: 0 } })
  const isGroup = watch('is_group_vaccination')
  const { data: animals } = useAllAnimals()
  const { data: shedsRaw } = useQuery({ queryKey: ['sheds'], queryFn: () => tenantAPI.listSheds().then(r => r.data) })
  const sheds = Array.isArray(shedsRaw) ? shedsRaw : (shedsRaw?.results ?? [])
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Vaccine Name" required>
          <input {...register('vaccine_name', { required: true })} className="form-input" />
        </FormField>
        <FormField label="Date" required>
          <input type="date" {...register('date', { required: true })} defaultValue={format(new Date(), 'yyyy-MM-dd')} className="form-input" />
        </FormField>
        <FormField label="Batch Number">
          <input {...register('batch_number')} className="form-input" />
        </FormField>
        <FormField label="Next Due Date">
          <input type="date" {...register('next_due_date')} className="form-input" />
        </FormField>
        <FormField label="Dose">
          <input {...register('dose')} className="form-input" placeholder="e.g. 2ml" />
        </FormField>
        <FormField label="Cost (PKR)">
          <input type="number" step="0.01" {...register('cost')} className="form-input" />
        </FormField>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input type="checkbox" id="isGroupV" {...register('is_group_vaccination')} className="w-4 h-4 accent-primary-600" />
          <label htmlFor="isGroupV" className="text-sm text-gray-700">Group / Shed Vaccination</label>
        </div>
        {isGroup ? (
          <FormField label="Shed">
            <select {...register('shed')} className="form-select">
              <option value="">— Select shed —</option>
              {sheds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
        ) : (
          <FormField label="Animal">
            <select {...register('animal')} className="form-select">
              <option value="">— Select —</option>
              {(animals ?? []).map(a => <option key={a.id} value={a.id}>{a.tag_number}{a.name ? ` — ${a.name}` : ''}</option>)}
            </select>
          </FormField>
        )}
      </div>
      <FormField label="Notes">
        <textarea {...register('notes')} rows={2} className="form-input" />
      </FormField>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? <Spinner size={16} className="text-white" /> : 'Save Vaccination'}
        </button>
      </div>
    </form>
  )
}

function DewormingForm({ onSubmit, loading }) {
  const { register, handleSubmit, watch } = useForm({ defaultValues: { is_group_deworming: false, cost: 0 } })
  const isGroup = watch('is_group_deworming')
  const { data: animals } = useAllAnimals()
  const { data: shedsRaw } = useQuery({ queryKey: ['sheds'], queryFn: () => tenantAPI.listSheds().then(r => r.data) })
  const sheds = Array.isArray(shedsRaw) ? shedsRaw : (shedsRaw?.results ?? [])
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Product" required>
          <input {...register('product', { required: true })} className="form-input" />
        </FormField>
        <FormField label="Date" required>
          <input type="date" {...register('date', { required: true })} defaultValue={format(new Date(), 'yyyy-MM-dd')} className="form-input" />
        </FormField>
        <FormField label="Dose">
          <input {...register('dose')} className="form-input" />
        </FormField>
        <FormField label="Next Due Date">
          <input type="date" {...register('next_due_date')} className="form-input" />
        </FormField>
        <FormField label="Cost (PKR)">
          <input type="number" step="0.01" {...register('cost')} className="form-input" />
        </FormField>
        <div className="flex items-center gap-2 self-end pb-1">
          <input type="checkbox" id="isGroupD" {...register('is_group_deworming')} className="w-4 h-4 accent-primary-600" />
          <label htmlFor="isGroupD" className="text-sm text-gray-700">Shed / Group Deworming</label>
        </div>
        {isGroup ? (
          <FormField label="Shed">
            <select {...register('shed')} className="form-select">
              <option value="">— Select shed —</option>
              {sheds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
        ) : (
          <FormField label="Animal">
            <select {...register('animal')} className="form-select">
              <option value="">— Select —</option>
              {(animals ?? []).map(a => <option key={a.id} value={a.id}>{a.tag_number}{a.name ? ` — ${a.name}` : ''}</option>)}
            </select>
          </FormField>
        )}
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? <Spinner size={16} className="text-white" /> : 'Save Deworming'}
        </button>
      </div>
    </form>
  )
}

function DiseaseForm({ onSubmit, loading }) {
  const { register, handleSubmit } = useForm({ defaultValues: { severity: 'mild' } })
  const { data: animals } = useAllAnimals()
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Animal" required>
          <select {...register('animal', { required: true })} className="form-select">
            <option value="">— Select —</option>
            {(animals ?? []).map(a => <option key={a.id} value={a.id}>{a.tag_number}{a.name ? ` — ${a.name}` : ''}</option>)}
          </select>
        </FormField>
        <FormField label="Date" required>
          <input type="date" {...register('date', { required: true })} defaultValue={format(new Date(), 'yyyy-MM-dd')} className="form-input" />
        </FormField>
        <FormField label="Disease Name" required>
          <input {...register('disease_name', { required: true })} className="form-input" />
        </FormField>
        <FormField label="Severity">
          <select {...register('severity')} className="form-select">
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
        </FormField>
        <FormField label="Resolved Date">
          <input type="date" {...register('resolved_date')} className="form-input" />
        </FormField>
      </div>
      <FormField label="Symptoms">
        <textarea {...register('symptoms')} rows={2} className="form-input" />
      </FormField>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? <Spinner size={16} className="text-white" /> : 'Save Disease Event'}
        </button>
      </div>
    </form>
  )
}

function GenericHealthTab({ title, fetchFn, queryKey, createFn, FormComp, columns }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [df, setDf] = useState('')
  const [dt, setDt] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: [queryKey, page, df, dt],
    queryFn: () => fetchFn({ page, date_from: df || undefined, date_to: dt || undefined }).then(r => r.data),
  })
  const mut = useMutation({
    mutationFn: createFn,
    onSuccess: () => { toast.success('Saved'); setModal(false); qc.invalidateQueries([queryKey]); qc.invalidateQueries(['health-dashboard']) },
    onError: (e) => toast.error(Object.values(e.response?.data ?? {}).flat()[0] ?? 'Error saving record'),
  })
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <DateRangeFilter from={df} to={dt} onFrom={setDf} onTo={setDt} />
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Add {title}</button>
      </div>
      <div className="card p-0">
        <DataTable columns={columns} data={data?.results ?? []} loading={isLoading} />
      </div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
      <Modal open={modal} onClose={() => setModal(false)} title={`Add ${title}`} size="lg">
        <FormComp onSubmit={mut.mutate} loading={mut.isPending} />
      </Modal>
    </div>
  )
}

export default function HealthPage() {
  const treatCols = [
    { key: 'date', label: 'Date' },
    { key: 'animal_tag', label: 'Tag' },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'drug', label: 'Drug' },
    { key: 'dosage', label: 'Dosage' },
    { key: 'withdrawal_days', label: 'W/D Days' },
    { key: 'cost', label: 'Cost' },
    { key: 'outcome', label: 'Outcome', render: v => <span className={`badge ${v === 'recovered' ? 'badge-green' : v === 'ongoing' ? 'badge-yellow' : 'badge-red'}`}>{v}</span> },
  ]
  const vaccCols = [
    { key: 'date', label: 'Date' },
    { key: 'vaccine_name', label: 'Vaccine' },
    { key: 'batch_number', label: 'Batch' },
    { key: 'animal_tag', label: 'Tag' },
    { key: 'shed_name', label: 'Shed' },
    { key: 'next_due_date', label: 'Next Due' },
    { key: 'cost', label: 'Cost' },
  ]
  const dewormCols = [
    { key: 'date', label: 'Date' },
    { key: 'product', label: 'Product' },
    { key: 'dose', label: 'Dose' },
    { key: 'animal_tag', label: 'Tag' },
    { key: 'shed_name', label: 'Shed' },
    { key: 'next_due_date', label: 'Next Due' },
    { key: 'cost', label: 'Cost' },
  ]
  const diseaseCols = [
    { key: 'date', label: 'Date' },
    { key: 'animal_tag', label: 'Tag' },
    { key: 'disease_name', label: 'Disease' },
    { key: 'severity', label: 'Severity', render: v => <span className={`badge ${v === 'severe' ? 'badge-red' : v === 'moderate' ? 'badge-yellow' : 'badge-green'}`}>{v}</span> },
    { key: 'resolved_date', label: 'Resolved' },
  ]

  return (
    <div>
      <h1 className="page-title mb-4">Health Management</h1>
      <TabBar />
      <Routes>
        <Route index element={<HealthDashboard />} />
        <Route path="treatments"  element={<GenericHealthTab title="Treatment"    fetchFn={healthAPI.listTreatments}  queryKey="treatments"  createFn={healthAPI.createTreatment}  FormComp={TreatmentForm}  columns={treatCols} />} />
        <Route path="vaccinations" element={<GenericHealthTab title="Vaccination"  fetchFn={healthAPI.listVaccinations} queryKey="vaccinations" createFn={healthAPI.createVaccination} FormComp={VaccinationForm} columns={vaccCols} />} />
        <Route path="dewormings"  element={<GenericHealthTab title="Deworming"    fetchFn={healthAPI.listDewormings}  queryKey="dewormings"  createFn={healthAPI.createDeworming}  FormComp={DewormingForm}  columns={dewormCols} />} />
        <Route path="diseases"    element={<GenericHealthTab title="Disease Event" fetchFn={healthAPI.listDiseases}    queryKey="diseases"    createFn={healthAPI.createDisease}    FormComp={DiseaseForm}    columns={diseaseCols} />} />
      </Routes>
    </div>
  )
}
