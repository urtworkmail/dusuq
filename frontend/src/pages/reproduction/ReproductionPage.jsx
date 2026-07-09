import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reproAPI, tenantAPI, authAPI } from '@/api/endpoints'
import { DataTable, Pagination, Modal, StatCard, DateRangeFilter, PageSpinner, FormField, Spinner } from '@/components/ui'
import { Plus, Syringe, Baby, Droplets, AlertTriangle, TrendingUp, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths, startOfMonth } from 'date-fns'

const TABS = [
  { to: '/reproduction',             label: 'Dashboard',        end: true },
  { to: '/reproduction/inseminations',label: 'Inseminations' },
  { to: '/reproduction/preg-tests',  label: 'Preg Tests' },
  { to: '/reproduction/calvings',    label: 'Calvings' },
  { to: '/reproduction/dry-offs',    label: 'Dry-offs' },
  { to: '/reproduction/abortions',   label: 'Abortions' },
  { to: '/reproduction/tasks',       label: 'Expected Tasks' },
]

function TabBar() {
  return (
    <div className="flex overflow-x-auto gap-1 border-b border-gray-200 mb-5 pb-0">
      {TABS.map(t => (
        <NavLink key={t.to} to={t.to} end={t.end}
          className={({ isActive }) =>
            `px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              isActive ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function ReprodashboardTab() {
  const { data, isLoading } = useQuery({ queryKey: ['repro-dashboard'], queryFn: () => reproAPI.dashboard().then(r => r.data) })
  if (isLoading) return <PageSpinner />
  const h = data?.herd_position ?? {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: h.total, color: 'bg-gray-50', ic: 'text-gray-600' },
          { label: 'Milking', value: h.milking, color: 'bg-blue-50', ic: 'text-blue-600' },
          { label: 'Pregnant', value: h.pregnant, color: 'bg-purple-50', ic: 'text-purple-600' },
          { label: 'Dry', value: h.dry, color: 'bg-yellow-50', ic: 'text-yellow-600' },
          { label: 'Open', value: h.open, color: 'bg-green-50', ic: 'text-green-600' },
          { label: 'Heifer', value: h.heifer, color: 'bg-cyan-50', ic: 'text-cyan-600' },
        ].map(s => (
          <div key={s.label} className={`card text-center ${s.color}`}>
            <p className="text-2xl font-bold text-gray-900">{s.value ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Monthly Conception Rate (%)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.monthly_trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="conception_rate" fill="#1A6B3C" radius={[4,4,0,0]} name="Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Upcoming Calvings</h3>
          {(data?.upcoming_calvings ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No upcoming calvings in 30 days</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {data.upcoming_calvings.map((c, i) => (
                <div key={i} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{c.animal_name} <span className="text-gray-400 font-normal">({c.animal_tag})</span></p>
                    <p className="text-xs text-gray-500">{c.expected_calving_date}</p>
                  </div>
                  <span className={`badge ${c.days_remaining <= 3 ? 'badge-red' : c.days_remaining <= 7 ? 'badge-yellow' : 'badge-green'}`}>
                    {c.days_remaining}d
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Generic event list tab ───────────────────────────────────────────────────
function EventListTab({ title, fetchFn, queryKey, createFn, FormComponent, columns, formSize = 'lg' }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, page, dateFrom, dateTo],
    queryFn: () => fetchFn({ page, date_after: dateFrom || undefined, date_before: dateTo || undefined }).then(r => r.data),
  })

  const mut = useMutation({
    mutationFn: createFn,
    onSuccess: () => { toast.success('Saved'); setModal(false); qc.invalidateQueries([queryKey]); qc.invalidateQueries(['repro-dashboard']) },
    onError: (e) => toast.error(Object.values(e.response?.data ?? {}).flat()[0] ?? 'Error'),
  })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Add {title}</button>
      </div>
      <div className="card p-0">
        <DataTable columns={columns} data={data?.results ?? []} loading={isLoading} />
      </div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
      <Modal open={modal} onClose={() => setModal(false)} title={`Add ${title}`} size={formSize}>
        <FormComponent onSubmit={mut.mutate} loading={mut.isPending} />
      </Modal>
    </div>
  )
}

// ─── Insemination form ────────────────────────────────────────────────────────
function InseminationForm({ onSubmit, loading }) {
  const { register, handleSubmit, watch } = useForm({ defaultValues: { insemination_type: 'ai', repeat_number: 1 } })
  const type = watch('insemination_type')
  const { data: animals } = useQuery({ queryKey: ['animals-milking'], queryFn: () => import('@/api/endpoints').then(m => m.animalAPI.list({ status: 'open,inseminated,heifer', page_size: 500 })).then(r => r.data.results ?? []) })
  const { data: techs } = useQuery({ queryKey: ['users'], queryFn: () => authAPI.listUsers().then(r => r.data) })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Animal" required>
          <select {...register('animal', { required: true })} className="form-select">
            <option value="">— Select animal —</option>
            {(animals ?? []).map(a => <option key={a.id} value={a.id}>{a.tag_number} {a.name ? `— ${a.name}` : ''}</option>)}
          </select>
        </FormField>
        <FormField label="Date" required>
          <input type="date" {...register('date', { required: true })} className="form-input" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
        </FormField>
        <FormField label="Type" required>
          <select {...register('insemination_type')} className="form-select">
            <option value="ai">Artificial Insemination</option>
            <option value="bull">Natural Service (Bull)</option>
          </select>
        </FormField>
        <FormField label="Repeat #">
          <input type="number" min={1} {...register('repeat_number')} className="form-input" />
        </FormField>
        {type === 'ai' ? (
          <>
            <FormField label="Semen Batch">
              <input {...register('semen_batch')} className="form-input" />
            </FormField>
            <FormField label="Technician">
              <select {...register('technician')} className="form-select">
                <option value="">— Select —</option>
                {(techs ?? []).filter(u => ['technician','owner','manager'].includes(u.role)).map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Bull Breed">
              <input {...register('bull_breed')} className="form-input" placeholder="Breed of sire" />
            </FormField>
          </>
        ) : (
          <FormField label="Bull Tag">
            <input {...register('bull_tag')} className="form-input" />
          </FormField>
        )}
      </div>
      <FormField label="Notes"><textarea {...register('notes')} rows={2} className="form-input" /></FormField>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? <Spinner size={16} className="text-white" /> : 'Save'}</button>
      </div>
    </form>
  )
}

// ─── Pregnancy test form ──────────────────────────────────────────────────────
function PregTestForm({ onSubmit, loading }) {
  const { register, handleSubmit } = useForm({ defaultValues: { method: 'rectal', result: 'positive' } })
  const { data: animals } = useQuery({ queryKey: ['animals-inseminated'], queryFn: () => import('@/api/endpoints').then(m => m.animalAPI.list({ status: 'inseminated,pregnant', page_size: 500 })).then(r => r.data.results ?? []) })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Animal" required>
          <select {...register('animal', { required: true })} className="form-select">
            <option value="">— Select —</option>
            {(animals ?? []).map(a => <option key={a.id} value={a.id}>{a.tag_number} {a.name ? `— ${a.name}` : ''}</option>)}
          </select>
        </FormField>
        <FormField label="Date" required>
          <input type="date" {...register('date', { required: true })} className="form-input" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
        </FormField>
        <FormField label="Method">
          <select {...register('method')} className="form-select">
            <option value="rectal">Rectal Palpation</option>
            <option value="ultrasound">Ultrasound</option>
            <option value="blood">Blood Test</option>
            <option value="milk">Milk Progesterone</option>
          </select>
        </FormField>
        <FormField label="Result" required>
          <select {...register('result', { required: true })} className="form-select">
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="repeat">Repeat (Recheck)</option>
          </select>
        </FormField>
      </div>
      <FormField label="Notes"><textarea {...register('notes')} rows={2} className="form-input" /></FormField>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? <Spinner size={16} className="text-white" /> : 'Save'}</button>
      </div>
    </form>
  )
}

// ─── Calving form ─────────────────────────────────────────────────────────────
function CalvingForm({ onSubmit, loading }) {
  const { register, handleSubmit } = useForm({ defaultValues: { calving_type: 'normal', calf_sex: 'female', dam_condition: 'good' } })
  const { data: animals } = useQuery({ queryKey: ['animals-pregnant'], queryFn: () => import('@/api/endpoints').then(m => m.animalAPI.list({ status: 'pregnant,dry', page_size: 500 })).then(r => r.data.results ?? []) })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Dam (Mother)" required>
          <select {...register('dam', { required: true })} className="form-select">
            <option value="">— Select —</option>
            {(animals ?? []).map(a => <option key={a.id} value={a.id}>{a.tag_number} {a.name ? `— ${a.name}` : ''}</option>)}
          </select>
        </FormField>
        <FormField label="Calving Date" required>
          <input type="date" {...register('calving_date', { required: true })} className="form-input" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
        </FormField>
        <FormField label="Calving Type">
          <select {...register('calving_type')} className="form-select">
            <option value="normal">Normal</option>
            <option value="assisted">Assisted</option>
            <option value="caesarean">Caesarean</option>
          </select>
        </FormField>
        <FormField label="Dam Condition">
          <select {...register('dam_condition')} className="form-select">
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </FormField>
        <FormField label="Calf Tag"><input {...register('calf_tag')} className="form-input" /></FormField>
        <FormField label="Calf Sex">
          <select {...register('calf_sex')} className="form-select">
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="stillborn">Stillborn</option>
          </select>
        </FormField>
        <FormField label="Calf Weight (kg)">
          <input type="number" step="0.1" {...register('calf_weight_kg')} className="form-input" />
        </FormField>
      </div>
      <FormField label="Notes"><textarea {...register('notes')} rows={2} className="form-input" /></FormField>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? <Spinner size={16} className="text-white" /> : 'Save'}</button>
      </div>
    </form>
  )
}

// ─── Dry-off form ─────────────────────────────────────────────────────────────
function DryOffForm({ onSubmit, loading }) {
  const { register, handleSubmit } = useForm()
  const { data: animals } = useQuery({ queryKey: ['animals-open'], queryFn: () => import('@/api/endpoints').then(m => m.animalAPI.list({ status: 'open,pregnant,inseminated', page_size: 500 })).then(r => r.data.results ?? []) })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Animal" required>
          <select {...register('animal', { required: true })} className="form-select">
            <option value="">— Select —</option>
            {(animals ?? []).map(a => <option key={a.id} value={a.id}>{a.tag_number} {a.name ? `— ${a.name}` : ''}</option>)}
          </select>
        </FormField>
        <FormField label="Dry-off Date" required>
          <input type="date" {...register('dry_off_date', { required: true })} className="form-input" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
        </FormField>
        <FormField label="Expected Calving Date">
          <input type="date" {...register('expected_calving_date')} className="form-input" />
        </FormField>
      </div>
      <FormField label="Notes"><textarea {...register('notes')} rows={2} className="form-input" /></FormField>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? <Spinner size={16} className="text-white" /> : 'Save'}</button>
      </div>
    </form>
  )
}

// ─── Abortion form ────────────────────────────────────────────────────────────
function AbortionForm({ onSubmit, loading }) {
  const { register, handleSubmit } = useForm()
  const { data: animals } = useQuery({ queryKey: ['animals-pregnant'], queryFn: () => import('@/api/endpoints').then(m => m.animalAPI.list({ status: 'pregnant,inseminated', page_size: 500 })).then(r => r.data.results ?? []) })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Animal" required>
          <select {...register('animal', { required: true })} className="form-select">
            <option value="">— Select —</option>
            {(animals ?? []).map(a => <option key={a.id} value={a.id}>{a.tag_number} {a.name ? `— ${a.name}` : ''}</option>)}
          </select>
        </FormField>
        <FormField label="Date" required>
          <input type="date" {...register('date', { required: true })} className="form-input" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
        </FormField>
        <FormField label="Gestation Days">
          <input type="number" {...register('gestation_stage_days')} className="form-input" />
        </FormField>
        <FormField label="Cause">
          <input {...register('cause')} className="form-input" />
        </FormField>
      </div>
      <FormField label="Notes"><textarea {...register('notes')} rows={2} className="form-input" /></FormField>
      <div className="flex justify-end">
        <button type="submit" disabled={loading} className="btn btn-primary">{loading ? <Spinner size={16} className="text-white" /> : 'Save'}</button>
      </div>
    </form>
  )
}

// ─── Expected tasks tab ───────────────────────────────────────────────────────
function TasksTab() {
  const { data, isLoading } = useQuery({ queryKey: ['repro-tasks'], queryFn: () => reproAPI.tasks({ days: 21 }).then(r => r.data) })
  const tasks = Array.isArray(data) ? data : []
  const cols = [
    { key: 'task_type', label: 'Task', render: v => <span className={`badge ${v === 'calving_due' ? 'badge-blue' : 'badge-purple'}`}>{v.replace(/_/g, ' ')}</span> },
    { key: 'animal_tag', label: 'Tag' },
    { key: 'animal_name', label: 'Name' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'days_until', label: 'Days', render: v => <span className={`badge ${v <= 2 ? 'badge-red' : v <= 7 ? 'badge-yellow' : 'badge-green'}`}>{v}d</span> },
  ]
  return <div className="card p-0"><DataTable columns={cols} data={tasks} loading={isLoading} emptyMessage="No upcoming tasks." /></div>
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReproductionPage() {
  const insColums = [
    { key: 'date', label: 'Date' },
    { key: 'animal_tag', label: 'Tag' },
    { key: 'animal_name', label: 'Name' },
    { key: 'insemination_type', label: 'Type', render: v => v === 'ai' ? 'AI' : 'Bull' },
    { key: 'semen_batch', label: 'Batch/Bull' },
    { key: 'technician_name', label: 'Technician' },
    { key: 'repeat_number', label: 'Repeat #' },
    { key: 'expected_calving_date', label: 'ECD' },
  ]

  const pregCols = [
    { key: 'date', label: 'Date' },
    { key: 'animal_tag', label: 'Tag' },
    { key: 'animal_name', label: 'Name' },
    { key: 'method', label: 'Method' },
    { key: 'result', label: 'Result', render: v => <span className={`badge ${v === 'positive' ? 'badge-green' : v === 'negative' ? 'badge-red' : 'badge-yellow'}`}>{v}</span> },
    { key: 'conducted_by_name', label: 'By' },
  ]

  const calvingCols = [
    { key: 'calving_date', label: 'Date' },
    { key: 'dam_tag', label: 'Dam Tag' },
    { key: 'dam_name', label: 'Dam Name' },
    { key: 'calving_type', label: 'Type' },
    { key: 'calf_tag', label: 'Calf Tag' },
    { key: 'calf_sex', label: 'Calf Sex' },
    { key: 'calf_weight_kg', label: 'Weight (kg)' },
    { key: 'dam_condition', label: 'Dam Cond.' },
  ]

  const dryOffCols = [
    { key: 'dry_off_date', label: 'Date' },
    { key: 'animal_tag', label: 'Tag' },
    { key: 'animal_name', label: 'Name' },
    { key: 'expected_calving_date', label: 'Expected Calving' },
  ]

  const abortionCols = [
    { key: 'date', label: 'Date' },
    { key: 'animal_tag', label: 'Tag' },
    { key: 'animal_name', label: 'Name' },
    { key: 'gestation_stage_days', label: 'Gestation Days' },
    { key: 'cause', label: 'Cause' },
  ]

  return (
    <div>
      <h1 className="page-title mb-4">Reproduction Management</h1>
      <TabBar />
      <Routes>
        <Route index element={<ReprodashboardTab />} />
        <Route path="inseminations" element={<EventListTab title="Insemination" fetchFn={reproAPI.listInseminations} queryKey="inseminations" createFn={reproAPI.createInsemination} FormComponent={InseminationForm} columns={insColums} />} />
        <Route path="preg-tests" element={<EventListTab title="Pregnancy Test" fetchFn={reproAPI.listPregTests} queryKey="preg-tests" createFn={reproAPI.createPregTest} FormComponent={PregTestForm} columns={pregCols} />} />
        <Route path="calvings" element={<EventListTab title="Calving" fetchFn={reproAPI.listCalvings} queryKey="calvings" createFn={reproAPI.createCalving} FormComponent={CalvingForm} columns={calvingCols} />} />
        <Route path="dry-offs" element={<EventListTab title="Dry-off" fetchFn={reproAPI.listDryOffs} queryKey="dry-offs" createFn={reproAPI.createDryOff} FormComponent={DryOffForm} columns={dryOffCols} />} />
        <Route path="abortions" element={<EventListTab title="Abortion" fetchFn={reproAPI.listAbortions} queryKey="abortions" createFn={reproAPI.createAbortion} FormComponent={AbortionForm} columns={abortionCols} />} />
        <Route path="tasks" element={<TasksTab />} />
      </Routes>
    </div>
  )
}
