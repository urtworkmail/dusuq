import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { importAPI } from '@/api/endpoints'
import { DataTable, Spinner, StatCard, EmptyState } from '@/components/ui'
import {
  UploadCloud, Download, FileSpreadsheet, CheckCircle2, AlertTriangle,
  XCircle, RotateCcw, History, Beef, Droplets, Syringe,
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format, parseISO } from 'date-fns'

const ROW_STYLE = {
  ok: { icon: CheckCircle2, className: 'text-green-600' },
  warning: { icon: AlertTriangle, className: 'text-amber-600' },
  error: { icon: XCircle, className: 'text-red-600' },
}

function RowStatusIcon({ status }) {
  const s = ROW_STYLE[status] ?? ROW_STYLE.ok
  const Icon = s.icon
  return <Icon size={16} className={clsx('flex-shrink-0', s.className)} />
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

const IMPORT_TYPES = [
  {
    key: 'animals',
    label: 'Animals',
    icon: Beef,
    hint: 'Any column layout is fine — we match common header names automatically.',
    dataCols: [
      { key: 'tag_number', label: 'Tag', render: (_v, r) => r.data?.tag_number ?? '—' },
      { key: 'name', label: 'Name', render: (_v, r) => r.data?.name || '—' },
      { key: 'sex', label: 'Sex', render: (_v, r) => r.data?.sex ?? '—' },
      { key: 'status_field', label: 'Status', render: (_v, r) => r.data?.status ?? '—' },
      { key: 'breed', label: 'Breed', render: (_v, r) => r.data?.breed ?? '—' },
      { key: 'dam_tag', label: 'Dam', render: (_v, r) => r.data?.dam_tag ?? '—' },
      { key: 'sire_tag', label: 'Sire', render: (_v, r) => r.data?.sire_tag ?? '—' },
    ],
  },
  {
    key: 'milk',
    label: 'Milk Records',
    icon: Droplets,
    hint: 'Every row must reference an animal that already exists in this farm — import or add animals first.',
    dataCols: [
      { key: 'tag_number', label: 'Tag', render: (_v, r) => r.data?.tag_number ?? '—' },
      { key: 'date', label: 'Date', render: (_v, r) => r.data?.date ?? '—' },
      { key: 'session', label: 'Session', render: (_v, r) => r.data?.session ?? '—' },
      { key: 'litres', label: 'Litres', render: (_v, r) => r.data?.litres ?? '—' },
      { key: 'fat_percent', label: 'Fat %', render: (_v, r) => r.data?.fat_percent ?? '—' },
      { key: 'snf_percent', label: 'SNF %', render: (_v, r) => r.data?.snf_percent ?? '—' },
    ],
  },
  {
    key: 'inseminations',
    label: 'Inseminations',
    icon: Syringe,
    hint: 'Every row must reference an animal that already exists in this farm — import or add animals first.',
    dataCols: [
      { key: 'tag_number', label: 'Tag', render: (_v, r) => r.data?.tag_number ?? '—' },
      { key: 'date', label: 'Date', render: (_v, r) => r.data?.date ?? '—' },
      { key: 'insemination_type', label: 'Type', render: (_v, r) => r.data?.insemination_type ?? '—' },
      { key: 'technician_name', label: 'Technician', render: (_v, r) => r.data?.technician_name ?? '—' },
      { key: 'semen_batch', label: 'Batch', render: (_v, r) => r.data?.semen_batch || '—' },
      { key: 'bull_breed', label: 'Sire Breed', render: (_v, r) => r.data?.bull_breed || '—' },
    ],
  },
]

function ImportTypeSection({ type, onImported }) {
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [stage, setStage] = useState('idle') // idle | previewing | previewed | committing | committed
  const [preview, setPreview] = useState(null)
  const [commitResult, setCommitResult] = useState(null)
  const [error, setError] = useState('')

  function reset() {
    setFile(null)
    setStage('idle')
    setPreview(null)
    setCommitResult(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setCommitResult(null)
    setError('')
    setStage('previewing')
    try {
      const res = await importAPI.preview(type.key, f)
      setPreview(res.data)
      setStage('previewed')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Could not read this file.')
      setStage('idle')
    }
  }

  async function handleConfirm() {
    if (!file) return
    setStage('committing')
    try {
      const res = await importAPI.commit(type.key, file)
      setCommitResult(res.data)
      setStage('committed')
      toast.success(`Imported ${res.data.imported} record${res.data.imported === 1 ? '' : 's'}`)
      onImported?.()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Import failed.')
      setStage('previewed')
    }
  }

  async function handleTemplate() {
    try {
      const res = await importAPI.template(type.key)
      downloadBlob(res.data, `dusuq_${type.key}_template.xlsx`)
    } catch {
      toast.error('Could not download template')
    }
  }

  const activeResult = stage === 'committed' ? commitResult : preview
  const rows = activeResult?.rows ?? []

  const rowCols = [
    { key: 'row', label: '#', width: 48 },
    { key: 'status', label: '', width: 32, render: (v) => <RowStatusIcon status={v} /> },
    ...type.dataCols,
    {
      key: 'messages', label: 'Notes',
      render: (_v, r) => {
        const msgs = [...(r.errors ?? []), ...(r.warnings ?? [])]
        if (!msgs.length) return <span className="text-gray-300">—</span>
        return (
          <ul className="space-y-0.5">
            {msgs.map((m, i) => (
              <li key={i} className={clsx('text-xs', r.errors?.includes(m) ? 'text-red-600' : 'text-amber-600')}>{m}</li>
            ))}
          </ul>
        )
      },
    },
  ]

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <type.icon size={18} className="text-primary-600" />
          {type.label}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleTemplate}>
          <Download size={14} />Download Template
        </button>
      </div>

      {stage === 'idle' && (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-10 cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition">
          <UploadCloud size={28} className="text-gray-400" />
          <span className="text-sm text-gray-600">Click to choose an .xlsx file, or drag it here</span>
          <span className="text-xs text-gray-400 text-center max-w-md px-4">{type.hint}</span>
          <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
        </label>
      )}

      {stage === 'previewing' && (
        <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
          <Spinner size={20} /> Reading {file?.name}…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
          <XCircle size={16} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {(stage === 'previewed' || stage === 'committing' || stage === 'committed') && activeResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileSpreadsheet size={15} />
            <span className="font-medium">{file?.name}</span>
            <button onClick={reset} className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
              <RotateCcw size={13} />Start over
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Rows" value={activeResult.total_rows} icon={FileSpreadsheet} color="bg-gray-50" iconColor="text-gray-500" />
            <StatCard
              label={stage === 'committed' ? 'Imported' : 'Would Import'}
              value={stage === 'committed' ? activeResult.imported : activeResult.would_import}
              icon={CheckCircle2} color="bg-green-50" iconColor="text-green-600"
            />
            <StatCard
              label={stage === 'committed' ? 'Errors' : 'Would Error'}
              value={stage === 'committed' ? activeResult.errors : activeResult.would_error}
              icon={XCircle} color="bg-red-50" iconColor="text-red-600"
            />
          </div>

          <div className="card p-0"><DataTable columns={rowCols} data={rows} /></div>

          {stage === 'previewed' && (
            <div className="flex items-center justify-end gap-2">
              <button className="btn btn-secondary" onClick={reset}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!activeResult.would_import}
                onClick={handleConfirm}
                title={!activeResult.would_import ? 'Nothing importable in this file' : undefined}
              >
                Confirm Import ({activeResult.would_import})
              </button>
            </div>
          )}

          {stage === 'committing' && (
            <div className="flex items-center justify-center gap-2 py-4 text-gray-500">
              <Spinner size={18} /> Importing…
            </div>
          )}

          {stage === 'committed' && (
            <div className="flex justify-end">
              <button className="btn btn-secondary" onClick={reset}>Import Another File</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ImportPage() {
  const qc = useQueryClient()
  const [activeType, setActiveType] = useState(IMPORT_TYPES[0].key)
  const [historyFilter, setHistoryFilter] = useState('')

  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ['import-jobs', historyFilter],
    queryFn: () => importAPI.listJobs(historyFilter ? { data_type: historyFilter } : undefined).then(r => r.data),
  })
  const jobs = Array.isArray(jobsData) ? jobsData : (jobsData?.results ?? [])

  function handleImported() {
    qc.invalidateQueries(['animals'])
    qc.invalidateQueries(['milk-records-list'])
    qc.invalidateQueries(['milk-dashboard'])
    qc.invalidateQueries(['inseminations'])
    qc.invalidateQueries(['repro-dashboard'])
    qc.invalidateQueries(['import-jobs'])
    qc.invalidateQueries(['onboarding-status'])
  }

  const historyCols = [
    { key: 'created_at', label: 'Date', render: v => v ? format(parseISO(v), 'dd MMM yyyy, h:mm a') : '—' },
    { key: 'file_name', label: 'File' },
    { key: 'data_type', label: 'Type', render: v => <span className="capitalize">{v}</span> },
    { key: 'total_rows', label: 'Rows' },
    { key: 'success_count', label: 'Imported', render: v => <span className="text-green-700 font-medium">{v}</span> },
    { key: 'error_count', label: 'Errors', render: v => v > 0 ? <span className="text-red-600 font-medium">{v}</span> : <span className="text-gray-400">0</span> },
    { key: 'user', label: 'By', render: (_v, r) => r.user_name ?? '—' },
  ]

  const activeTypeDef = IMPORT_TYPES.find(t => t.key === activeType)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Import Data</h1>
        <p className="text-sm text-gray-500">Bring existing records in from a spreadsheet — animals, milk history and inseminations, all in one place.</p>
      </div>

      <div className="flex overflow-x-auto gap-1 border-b border-gray-200">
        {IMPORT_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveType(t.key)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              activeType === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      <ImportTypeSection key={activeTypeDef.key} type={activeTypeDef} onImported={handleImported} />

      <div className="card space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <History size={18} className="text-primary-600" />
            Import History
          </div>
          <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)} className="form-select w-44 text-sm">
            <option value="">All types</option>
            {IMPORT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        {jobsLoading ? (
          <div className="flex justify-center py-8"><Spinner size={24} /></div>
        ) : jobs.length === 0 ? (
          <EmptyState icon={History} title="No imports yet" description="Completed imports will show up here." />
        ) : (
          <DataTable columns={historyCols} data={jobs} />
        )}
      </div>
    </div>
  )
}
