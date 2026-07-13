import { useState } from 'react'
import { vetassistAPI } from '@/api/endpoints'
import { Spinner, EmptyState } from '@/components/ui'
import { Sparkles, Send, FileText, TrendingUp, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'ask',      label: 'Ask a Question', icon: Sparkles },
  { key: 'reports',  label: 'Generate Report', icon: FileText },
  { key: 'forecast', label: 'Forecast & Analysis', icon: TrendingUp },
]

function ErrorNote({ error }) {
  if (!error) return null
  return (
    <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
      <span>{error}</span>
    </div>
  )
}

function AnswerCard({ children, label = 'VetAssist' }) {
  return (
    <div className="card mt-4 border-l-4 border-l-primary-500">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-primary-600" />
        <span className="text-xs font-semibold text-primary-700 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{children}</p>
    </div>
  )
}

// ─── Ask ────────────────────────────────────────────────────────────────────
function AskTab() {
  const [question, setQuestion] = useState('')
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  const ask = async (e) => {
    e.preventDefault()
    if (!question.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await vetassistAPI.ask({
        question,
        entity_type: entityType || undefined,
        entity_id: entityId || undefined,
      })
      setHistory((h) => [data, ...h])
      setQuestion('')
    } catch (err) {
      setError(err.response?.data?.detail || 'VetAssist could not answer that. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={ask} className="card">
        <label className="form-label">Ask about one animal, a herd, or the farm</label>
        <textarea
          className="form-input min-h-[80px]"
          placeholder='e.g. "Why has COW-014&apos;s milk yield dropped this week?"'
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <select className="form-select w-40" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">Whole farm</option>
            <option value="animal">Specific animal</option>
            <option value="shed">Shed</option>
            <option value="group">Animal group</option>
          </select>
          {entityType && (
            <input
              className="form-input w-48"
              placeholder={entityType === 'animal' ? 'Tag number, e.g. COW-014' : 'ID'}
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
            />
          )}
          <button className="btn btn-primary ml-auto" disabled={loading || !question.trim()}>
            {loading ? <Spinner size={16} className="text-white" /> : <Send size={14} />}
            Ask VetAssist
          </button>
        </div>
        <ErrorNote error={error} />
      </form>

      {history.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No questions yet"
          description="Ask VetAssist anything about your animals, herd, or finances — it answers from your farm's own data."
        />
      ) : (
        <div className="mt-6 space-y-4">
          {history.map((h) => (
            <div key={h.id}>
              <p className="text-sm font-medium text-gray-900">{h.question}</p>
              <AnswerCard>{h.answer}</AnswerCard>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Reports ────────────────────────────────────────────────────────────────
function ReportsTab() {
  const [entityType, setEntityType] = useState('animal')
  const [entityId, setEntityId] = useState('')
  const [includeResearch, setIncludeResearch] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)

  const generate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setReport(null)
    try {
      const { data } = await vetassistAPI.createReport({
        entity_type: entityType,
        entity_id: entityType === 'farm' ? undefined : entityId,
        include_research: includeResearch,
      })
      setReport(data)
      toast.success('Report generated')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not generate a report for that entity.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={generate} className="card">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="form-label">Report for</label>
            <select className="form-select w-40" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="animal">Animal</option>
              <option value="shed">Shed</option>
              <option value="group">Animal group</option>
              <option value="farm">Whole farm</option>
            </select>
          </div>
          {entityType !== 'farm' && (
            <div>
              <label className="form-label">{entityType === 'animal' ? 'Tag number' : 'ID'}</label>
              <input
                className="form-input w-48"
                placeholder={entityType === 'animal' ? 'e.g. COW-014' : 'ID'}
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                required
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-600 mb-2.5">
            <input type="checkbox" checked={includeResearch} onChange={(e) => setIncludeResearch(e.target.checked)} />
            Include diet/treatment research if needed
          </label>
          <button className="btn btn-primary ml-auto mb-0.5" disabled={loading}>
            {loading ? <Spinner size={16} className="text-white" /> : <FileText size={14} />}
            Generate Report
          </button>
        </div>
        <ErrorNote error={error} />
      </form>

      {report && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            {report.entity_type} {report.entity_id && `· ${report.entity_id}`} ·{' '}
            {new Date(report.created_at).toLocaleString()}
            {report.used_external_research && <span className="badge badge-blue ml-1">includes research</span>}
          </div>
          <AnswerCard label="Report">{report.content}</AnswerCard>
        </div>
      )}
    </div>
  )
}

// ─── Forecast ───────────────────────────────────────────────────────────────
function ForecastTab() {
  const [metric, setMetric] = useState('milk_yield')
  const [scope, setScope] = useState('farm')
  const [scopeId, setScopeId] = useState('')
  const [horizon, setHorizon] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const run = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data } = await vetassistAPI.forecast({
        metric,
        scope,
        scope_id: scope === 'farm' ? undefined : scopeId,
        horizon_days: Number(horizon),
      })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not generate a forecast.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={run} className="card">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="form-label">Metric</label>
            <select className="form-select w-44" value={metric} onChange={(e) => setMetric(e.target.value)}>
              <option value="milk_yield">Milk Yield</option>
              <option value="milk_revenue">Milk Revenue</option>
              <option value="feed_cost">Feed Cost</option>
              <option value="cash_position">Cash Position</option>
            </select>
          </div>
          <div>
            <label className="form-label">Scope</label>
            <select className="form-select w-36" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="farm">Whole farm</option>
              <option value="shed">Shed</option>
              <option value="group">Animal group</option>
              <option value="animal">Animal</option>
            </select>
          </div>
          {scope !== 'farm' && (
            <div>
              <label className="form-label">ID</label>
              <input className="form-input w-36" value={scopeId} onChange={(e) => setScopeId(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="form-label">Horizon (days)</label>
            <input
              type="number"
              className="form-input w-28"
              value={horizon}
              min={1}
              max={365}
              onChange={(e) => setHorizon(e.target.value)}
            />
          </div>
          <button className="btn btn-primary ml-auto mb-0.5" disabled={loading}>
            {loading ? <Spinner size={16} className="text-white" /> : <TrendingUp size={14} />}
            Run Forecast
          </button>
        </div>
        <ErrorNote error={error} />
      </form>

      {result && (
        <div className="mt-4">
          <div className="text-xs text-gray-400 mb-1">
            {result.metric.replace(/_/g, ' ')} · {result.scope} {result.scope_id && `· ${result.scope_id}`} ·{' '}
            {result.horizon_days}-day horizon
          </div>
          <AnswerCard label="Forecast">{result.content}</AnswerCard>
        </div>
      )}
    </div>
  )
}

export default function VetAssistPage() {
  const [tab, setTab] = useState('ask')

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Sparkles size={22} className="text-primary-600" />
          VetAssist
        </h1>
        <p className="text-sm text-gray-500">
          Ask questions, generate reports, and forecast trends — grounded in your farm's own data.
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-100 mb-5">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition',
                tab === t.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'ask' && <AskTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'forecast' && <ForecastTab />}
    </div>
  )
}
