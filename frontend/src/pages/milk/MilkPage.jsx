import { useState, useRef } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { milkAPI, animalAPI } from '@/api/endpoints'
import { DataTable, Pagination, Modal, DateRangeFilter, PageSpinner, FormField, Spinner, StatCard } from '@/components/ui'
import { Plus, Droplets, Download, Upload, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format } from 'date-fns'

const TABS = [
  { to: '/milk', label: 'Dashboard', end: true },
  { to: '/milk/bulk-entry', label: 'Bulk Entry' },
  { to: '/milk/chiller', label: 'Chiller' },
  { to: '/milk/consumption', label: 'Consumption' },
  { to: '/milk/dispatch', label: 'Dispatch' },
  { to: '/milk/records', label: 'Records' },
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

function MilkDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['milk-dashboard'], queryFn: () => milkAPI.dashboard().then(r => r.data) })
  if (isLoading) return <PageSpinner />
  const COLORS = ['#1A6B3C', '#2e8b57', '#4db37f', '#87d0aa']
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Milking Animals"   value={data?.milking_animals}                                  icon={Droplets} color="bg-blue-50"   iconColor="text-blue-600" />
        <StatCard label="Today's Milk (L)"  value={data?.today_total_litres != null ? `${data.today_total_litres}L` : '—'} icon={Droplets} color="bg-green-50"  iconColor="text-green-600" />
        <StatCard label="Month Total (L)"   value={data?.month_total_litres != null ? `${Number(data.month_total_litres).toLocaleString()}L` : '—'} icon={Droplets} color="bg-cyan-50" iconColor="text-cyan-600" />
        <StatCard label="Chiller Balance"   value={data?.chiller_balance_today != null ? `${data.chiller_balance_today.toFixed(1)}L` : '—'} icon={Droplets} color="bg-purple-50" iconColor="text-purple-600" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Daily Production This Month</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data?.daily_totals ?? []}>
              <defs>
                <linearGradient id="milkG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A6B3C" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1A6B3C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => `${v}L`} />
              <Area type="monotone" dataKey="total" stroke="#1A6B3C" strokeWidth={2} fill="url(#milkG)" name="Litres" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Top 10 Animals This Month</h3>
          <div className="overflow-y-auto max-h-52">
            {(data?.top_animals ?? []).map((a, i) => (
              <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50">
                <span className="text-gray-700 font-mono">{a.animal__tag_number}</span>
                <span className="text-gray-500 text-xs">{a.animal__name || ''}</span>
                <span className="badge badge-green">{Number(a.total).toFixed(1)}L</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function BulkEntryTab() {
  const qc = useQueryClient()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [entryDate, setEntryDate] = useState(today)
  const [session, setSession] = useState('am')
  const [amounts, setAmounts] = useState({})
  const fileRef = useRef()

  const { data: sheet, isLoading, refetch } = useQuery({
    queryKey: ['milk-entry-sheet', entryDate, session],
    queryFn: () => milkAPI.entrySheet({ date: entryDate, session }).then(r => r.data),
  })

  const saveMut = useMutation({
    mutationFn: (records) => milkAPI.bulkSave({ records }),
    onSuccess: (d) => { toast.success(`${d.data.saved} records saved`); qc.invalidateQueries(['milk-dashboard']); qc.invalidateQueries(['milk-entry-sheet']) },
    onError: (e) => toast.error(e.response?.data?.detail ?? 'Error saving'),
  })

  const importMut = useMutation({
    mutationFn: (file) => milkAPI.importExcel(file),
    onSuccess: (d) => {
      const { saved, errors } = d.data
      toast.success(`Imported ${saved} records`)
      if (errors.length) toast.error(`${errors.length} rows failed`)
      qc.invalidateQueries(['milk-entry-sheet'])
    },
    onError: () => toast.error('Import failed'),
  })

  const animals = sheet?.animals ?? []

  const handleSave = () => {
    const records = animals
      .filter(a => amounts[a.animal_id] !== undefined && amounts[a.animal_id] !== '')
      .map(a => ({
        animal: a.animal_id,
        date: entryDate,
        session,
        litres: parseFloat(amounts[a.animal_id]) || 0,
      }))
    if (!records.length) { toast.error('No entries to save'); return }
    saveMut.mutate(records)
  }

  const handleDownload = async () => {
    const res = await milkAPI.downloadTemplate({ date: entryDate, session })
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a'); a.href = url; a.download = `milk_template_${entryDate}_${session}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  // Pre-fill saved amounts when sheet loads
  const prefillAmounts = () => {
    const pre = {}
    animals.forEach(a => { if (a.litres !== null) pre[a.animal_id] = a.litres })
    setAmounts(pre)
  }
  useState(() => { prefillAmounts() }, [sheet])

  return (
    <div>
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <FormField label="Date">
            <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="form-input w-40" />
          </FormField>
          <FormField label="Session">
            <select value={session} onChange={e => setSession(e.target.value)} className="form-select w-36">
              <option value="am">Morning (AM)</option>
              <option value="pm">Evening (PM)</option>
            </select>
          </FormField>
          <button onClick={() => refetch()} className="btn btn-secondary self-end"><RefreshCw size={14} />Refresh</button>
          <button onClick={handleDownload} className="btn btn-secondary self-end"><Download size={14} />Excel Template</button>
          <label className="btn btn-secondary self-end cursor-pointer">
            <Upload size={14} />Import Excel
            <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileRef}
              onChange={e => { if (e.target.files[0]) importMut.mutate(e.target.files[0]); e.target.value = '' }} />
          </label>
        </div>
      </div>

      {isLoading ? <PageSpinner /> : (
        <div className="card p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Name</th>
                  <th>Shed</th>
                  <th className="w-36">Litres</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {animals.map(a => (
                  <tr key={a.animal_id} className={amounts[a.animal_id] ? 'bg-primary-50/20' : ''}>
                    <td className="font-mono font-semibold text-primary-700">{a.tag_number}</td>
                    <td>{a.name || '—'}</td>
                    <td className="text-gray-400">{a.shed || '—'}</td>
                    <td>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={amounts[a.animal_id] ?? ''}
                        onChange={e => setAmounts(prev => ({ ...prev, [a.animal_id]: e.target.value }))}
                        className="form-input w-28 text-center"
                        placeholder="0.0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between items-center p-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">{animals.length} milking animals · Session total: <strong>{Object.values(amounts).reduce((s, v) => s + (parseFloat(v) || 0), 0).toFixed(1)}L</strong></span>
            <button onClick={handleSave} disabled={saveMut.isPending} className="btn btn-primary">
              {saveMut.isPending ? <Spinner size={16} className="text-white" /> : 'Save All Records'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ChillerTab() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthStart = today.slice(0, 8) + '01'
  const [df, setDf] = useState(monthStart)
  const [dt, setDt] = useState(today)

  const { data, isLoading } = useQuery({
    queryKey: ['chiller', df, dt],
    queryFn: () => milkAPI.chiller({ date_from: df, date_to: dt }).then(r => r.data),
  })

  const rows = Array.isArray(data) ? data : []
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'produced', label: 'Produced (L)', render: v => <span className="text-green-700 font-medium">{Number(v).toFixed(1)}</span> },
    { key: 'consumed', label: 'Consumed (L)', render: v => <span className="text-orange-600">{Number(v).toFixed(1)}</span> },
    { key: 'dispatched', label: 'Dispatched (L)', render: v => <span className="text-blue-600">{Number(v).toFixed(1)}</span> },
    { key: 'balance', label: 'Balance (L)', render: v => <span className={`font-semibold ${v >= 0 ? 'text-gray-800' : 'text-red-600'}`}>{Number(v).toFixed(1)}</span> },
  ]

  return (
    <div>
      <div className="card mb-4 flex flex-wrap gap-3 items-center">
        <DateRangeFilter from={df} to={dt} onFrom={setDf} onTo={setDt} />
      </div>
      <div className="card p-0">
        <DataTable columns={cols} data={rows} loading={isLoading} />
      </div>
    </div>
  )
}

function ConsumptionTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [page, setPage] = useState(1)
  const [headModal, setHeadModal] = useState(false)

  const { data } = useQuery({ queryKey: ['milk-consumptions', page], queryFn: () => milkAPI.listConsumptions({ page }).then(r => r.data) })
  const { data: headsRaw } = useQuery({ queryKey: ['consumption-heads'], queryFn: () => milkAPI.listHeads().then(r => r.data) })
  const heads = Array.isArray(headsRaw) ? headsRaw : (headsRaw?.results ?? [])

  const { register: rHead, handleSubmit: hsHead, reset: rsHead } = useForm()
  const { register, handleSubmit, reset } = useForm({ defaultValues: { date: format(new Date(), 'yyyy-MM-dd') } })

  const headMut = useMutation({ mutationFn: milkAPI.createHead, onSuccess: () => { toast.success('Head created'); qc.invalidateQueries(['consumption-heads']); rsHead(); setHeadModal(false) } })
  const consMut = useMutation({ mutationFn: milkAPI.createConsumption, onSuccess: () => { toast.success('Saved'); qc.invalidateQueries(['milk-consumptions']); reset(); setModal(false) } })

  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'head_name', label: 'Category' },
    { key: 'litres', label: 'Litres', render: v => `${v}L` },
    { key: 'notes', label: 'Notes' },
  ]

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Log Consumption</button>
        <button className="btn btn-secondary" onClick={() => setHeadModal(true)}>Manage Categories</button>
      </div>
      <div className="card p-0">
        <DataTable columns={cols} data={data?.results ?? []} />
      </div>
      <Pagination count={data?.count} page={page} onPage={setPage} />

      <Modal open={modal} onClose={() => setModal(false)} title="Log Milk Consumption" size="sm">
        <form onSubmit={handleSubmit(consMut.mutate)} className="space-y-4">
          <FormField label="Date" required><input type="date" {...register('date', { required: true })} className="form-input" /></FormField>
          <FormField label="Category" required>
            <select {...register('head', { required: true })} className="form-select">
              <option value="">— Select —</option>
              {heads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </FormField>
          <FormField label="Litres" required><input type="number" step="0.1" {...register('litres', { required: true })} className="form-input" /></FormField>
          <FormField label="Notes"><input {...register('notes')} className="form-input" /></FormField>
          <div className="flex justify-end"><button type="submit" disabled={consMut.isPending} className="btn btn-primary">{consMut.isPending ? <Spinner size={16} className="text-white" /> : 'Save'}</button></div>
        </form>
      </Modal>

      <Modal open={headModal} onClose={() => setHeadModal(false)} title="Consumption Categories" size="sm">
        <div className="space-y-2 mb-4">
          {heads.map(h => (
            <div key={h.id} className="flex justify-between items-center text-sm px-3 py-2 bg-gray-50 rounded-lg">
              <span>{h.name}</span>
              <span className={`badge ${h.is_active ? 'badge-green' : 'badge-gray'}`}>{h.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
        </div>
        <form onSubmit={hsHead(d => headMut.mutate(d))} className="flex gap-2">
          <input {...rHead('name', { required: true })} className="form-input flex-1" placeholder="New category name" />
          <button type="submit" disabled={headMut.isPending} className="btn btn-primary">{headMut.isPending ? <Spinner size={14} className="text-white" /> : 'Add'}</button>
        </form>
      </Modal>
    </div>
  )
}

function DispatchTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({ queryKey: ['milk-dispatches', page], queryFn: () => milkAPI.listDispatches({ page }).then(r => r.data) })
  const { register, handleSubmit, watch, reset } = useForm({ defaultValues: { dispatch_type: 'corporate', date: format(new Date(), 'yyyy-MM-dd'), price_per_litre: 0 } })
  const dispType = watch('dispatch_type')
  const mut = useMutation({
    mutationFn: (d) => {
      const total = (parseFloat(d.adjusted_litres || d.gross_litres) || 0) * (parseFloat(d.price_per_litre) || 0)
      return milkAPI.createDispatch({ ...d, total_amount: total.toFixed(2) })
    },
    onSuccess: () => { toast.success('Dispatch saved'); qc.invalidateQueries(['milk-dispatches']); qc.invalidateQueries(['milk-dashboard']); reset(); setModal(false) },
    onError: () => toast.error('Error saving dispatch'),
  })
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'dispatch_type', label: 'Type', render: v => <span className={`badge ${v === 'corporate' ? 'badge-blue' : 'badge-green'}`}>{v}</span> },
    { key: 'buyer_name', label: 'Buyer' },
    { key: 'gross_litres', label: 'Gross (L)' },
    { key: 'adjusted_litres', label: 'Adj. (L)' },
    { key: 'fat_percent', label: 'Fat %' },
    { key: 'price_per_litre', label: 'Rate' },
    { key: 'total_amount', label: 'Total' },
    { key: 'outstanding', label: 'Outstanding', render: v => v > 0 ? <span className="badge badge-red">{Number(v).toLocaleString()}</span> : <span className="badge badge-green">Paid</span> },
  ]
  return (
    <div>
      <div className="flex mb-4">
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Add Dispatch</button>
      </div>
      <div className="card p-0">
        <DataTable columns={cols} data={data?.results ?? []} loading={isLoading} />
      </div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
      <Modal open={modal} onClose={() => setModal(false)} title="Add Milk Dispatch" size="lg">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Type">
              <select {...register('dispatch_type')} className="form-select">
                <option value="corporate">Corporate</option>
                <option value="local">Local / Retail</option>
              </select>
            </FormField>
            <FormField label="Date" required><input type="date" {...register('date', { required: true })} className="form-input" /></FormField>
            <FormField label="Buyer Name" required><input {...register('buyer_name', { required: true })} className="form-input" /></FormField>
            <FormField label="Gross Litres" required><input type="number" step="0.1" {...register('gross_litres', { required: true })} className="form-input" /></FormField>
            {dispType === 'corporate' && (
              <>
                <FormField label="LR Reading"><input type="number" step="0.01" {...register('lr_reading')} className="form-input" /></FormField>
                <FormField label="Fat %"><input type="number" step="0.01" {...register('fat_percent')} className="form-input" /></FormField>
                <FormField label="SNF %"><input type="number" step="0.01" {...register('snf_percent')} className="form-input" /></FormField>
                <FormField label="Adjusted Litres"><input type="number" step="0.1" {...register('adjusted_litres')} className="form-input" /></FormField>
              </>
            )}
            <FormField label="Price / Litre"><input type="number" step="0.01" {...register('price_per_litre')} className="form-input" /></FormField>
            <FormField label="Amount Received"><input type="number" step="0.01" {...register('amount_received')} className="form-input" defaultValue={0} /></FormField>
          </div>
          <FormField label="Notes"><textarea {...register('notes')} rows={2} className="form-input" /></FormField>
          <div className="flex justify-end">
            <button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Save Dispatch'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function RecordsTab() {
  const [page, setPage] = useState(1)
  const [df, setDf] = useState('')
  const [dt, setDt] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['milk-records-list', page, df, dt],
    queryFn: () => milkAPI.listRecords({ page, date_from: df || undefined, date_to: dt || undefined }).then(r => r.data),
  })
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'session', label: 'Session', render: v => <span className={`badge ${v === 'am' ? 'badge-blue' : 'badge-purple'}`}>{v.toUpperCase()}</span> },
    { key: 'animal_tag', label: 'Tag' },
    { key: 'animal_name', label: 'Name' },
    { key: 'litres', label: 'Litres', render: v => `${v}L` },
    { key: 'fat_percent', label: 'Fat %' },
    { key: 'snf_percent', label: 'SNF %' },
  ]
  return (
    <div>
      <div className="card mb-4 flex flex-wrap gap-3 items-center">
        <DateRangeFilter from={df} to={dt} onFrom={setDf} onTo={setDt} />
      </div>
      <div className="card p-0">
        <DataTable columns={cols} data={data?.results ?? []} loading={isLoading} />
      </div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
    </div>
  )
}

export default function MilkPage() {
  return (
    <div>
      <h1 className="page-title mb-4">Milk Production</h1>
      <TabBar />
      <Routes>
        <Route index element={<MilkDashboard />} />
        <Route path="bulk-entry" element={<BulkEntryTab />} />
        <Route path="chiller" element={<ChillerTab />} />
        <Route path="consumption" element={<ConsumptionTab />} />
        <Route path="dispatch" element={<DispatchTab />} />
        <Route path="records" element={<RecordsTab />} />
      </Routes>
    </div>
  )
}
