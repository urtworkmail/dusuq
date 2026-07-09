import { useState } from 'react'
import { reportsAPI } from '@/api/endpoints'
import { DataTable, DateRangeFilter, FormField } from '@/components/ui'
import { useQuery } from '@tanstack/react-query'
import { Download, BarChart2 } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const today = format(new Date(), 'yyyy-MM-dd')
const monthStart = today.slice(0, 8) + '01'

function downloadBlob(blobData, filename) {
  const url = URL.createObjectURL(new Blob([blobData]))
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function ReportCard({ title, description, apiKey, endpoint, columns, extraParams = {}, paramFields = [] }) {
  const [df, setDf] = useState(monthStart)
  const [dt, setDt] = useState(today)
  const [extra, setExtra] = useState({})
  const [enabled, setEnabled] = useState(false)
  const params = { date_from: df || undefined, date_to: dt || undefined, ...extraParams, ...extra }
  const { data, isLoading } = useQuery({
    queryKey: [apiKey, params],
    queryFn: () => endpoint(params).then(r => r.data),
    enabled,
  })
  const handleExcel = async () => {
    try {
      const res = await reportsAPI.downloadExcel(`/reports/${apiKey.replace(/-/g, '/')}/`, params)
      downloadBlob(res.data, `${apiKey}_${today}.xlsx`)
    } catch {
      toast.error('Export failed')
    }
  }
  const rows = data?.results ?? []

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        <button onClick={handleExcel} className="btn btn-secondary btn-sm">
          <Download size={14} />Excel
        </button>
      </div>
      <div className="flex flex-wrap gap-2 items-end mb-3">
        <DateRangeFilter from={df} to={dt} onFrom={setDf} onTo={setDt} />
        {paramFields.map(f => (
          <div key={f.key} className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">{f.label}</label>
            {f.type === 'select' ? (
              <select value={extra[f.key] ?? ''} onChange={e => setExtra(p => ({ ...p, [f.key]: e.target.value || undefined }))} className="form-select text-xs w-32">
                <option value="">All</option>
                {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input value={extra[f.key] ?? ''} onChange={e => setExtra(p => ({ ...p, [f.key]: e.target.value }))} className="form-input text-xs w-32" placeholder={f.placeholder} />
            )}
          </div>
        ))}
        <button className="btn btn-primary btn-sm" onClick={() => setEnabled(true)}>Run Report</button>
      </div>
      {enabled && (
        <div className="card p-0">
          <DataTable columns={columns} data={rows} loading={isLoading} emptyMessage="No data for the selected period." />
          {data?.count != null && <p className="text-xs text-gray-400 px-4 py-2">{data.count} records</p>}
        </div>
      )}
    </div>
  )
}

const REPORTS = [
  {
    group: '🐄 Reproduction',
    items: [
      { title: 'Insemination Report', description: 'All AI & bull service events', apiKey: 'inseminations', endpoint: reportsAPI.inseminations, columns: [
        { key: 'date', label: 'Date' }, { key: 'animal_tag', label: 'Tag' }, { key: 'animal_name', label: 'Name' },
        { key: 'type', label: 'Type' }, { key: 'semen_batch', label: 'Batch' }, { key: 'technician', label: 'Technician' },
        { key: 'repeat', label: 'Repeat #' }, { key: 'expected_calving', label: 'Expected Calving' },
      ]},
      { title: 'Calving Report', description: 'All calving events with calf details', apiKey: 'calvings', endpoint: reportsAPI.calvings, columns: [
        { key: 'date', label: 'Date' }, { key: 'dam_tag', label: 'Dam Tag' }, { key: 'dam_name', label: 'Dam Name' },
        { key: 'type', label: 'Type' }, { key: 'dam_condition', label: 'Dam Cond.' }, { key: 'calf_tag', label: 'Calf Tag' },
        { key: 'calf_sex', label: 'Sex' }, { key: 'calf_weight_kg', label: 'Wt (kg)' },
      ]},
      { title: 'Abortion Report', description: 'All recorded abortion events', apiKey: 'abortions', endpoint: reportsAPI.abortions, columns: [
        { key: 'date', label: 'Date' }, { key: 'animal_tag', label: 'Tag' }, { key: 'animal_name', label: 'Name' },
        { key: 'gestation_days', label: 'Gestation Days' }, { key: 'cause', label: 'Cause' },
      ]},
    ],
  },
  {
    group: '🏥 Health',
    items: [
      { title: 'Treatment Report', description: 'All treatment events with drugs and costs', apiKey: 'treatments', endpoint: reportsAPI.treatments, columns: [
        { key: 'date', label: 'Date' }, { key: 'animal_tag', label: 'Tag' }, { key: 'diagnosis', label: 'Diagnosis' },
        { key: 'drug', label: 'Drug' }, { key: 'dosage', label: 'Dosage' }, { key: 'route', label: 'Route' },
        { key: 'withdrawal_days', label: 'W/D' }, { key: 'cost', label: 'Cost' }, { key: 'outcome', label: 'Outcome' },
      ]},
      { title: 'Vaccination Report', description: 'All vaccination events', apiKey: 'vaccinations', endpoint: reportsAPI.vaccinations, columns: [
        { key: 'date', label: 'Date' }, { key: 'vaccine', label: 'Vaccine' }, { key: 'batch', label: 'Batch' },
        { key: 'animal_tag', label: 'Tag' }, { key: 'shed', label: 'Shed' }, { key: 'group', label: 'Group?' },
        { key: 'next_due', label: 'Next Due' }, { key: 'cost', label: 'Cost' },
      ]},
    ],
  },
  {
    group: '🥛 Milk',
    items: [
      { title: 'Day-wise Milk Report', description: 'Daily AM/PM production totals', apiKey: 'milk/daywise', endpoint: reportsAPI.milkDaywise, columns: [
        { key: 'date', label: 'Date' }, { key: 'am', label: 'AM (L)' }, { key: 'pm', label: 'PM (L)' }, { key: 'total', label: 'Total (L)' },
      ]},
      { title: 'Per-Animal Milk Report', description: 'Milk totals per animal for the period', apiKey: 'milk/per-animal', endpoint: reportsAPI.milkAnimal, columns: [
        { key: 'tag', label: 'Tag' }, { key: 'name', label: 'Name' }, { key: 'total_litres', label: 'Total (L)' },
        { key: 'avg_daily', label: 'Avg Daily (L)' }, { key: 'days_recorded', label: 'Days' },
      ]},
    ],
  },
  {
    group: '💰 Finance',
    items: [
      { title: 'Transaction Report', description: 'All financial transactions', apiKey: 'transactions', endpoint: reportsAPI.transactions,
        paramFields: [{ key: 'type', label: 'Type', type: 'select', options: [
          { value: 'cash_in', label: 'Cash In' }, { value: 'cash_out', label: 'Cash Out' },
          { value: 'purchase', label: 'Purchase' }, { value: 'milk_sale', label: 'Milk Sale' },
        ]}],
        columns: [
          { key: 'date', label: 'Date' }, { key: 'type', label: 'Type' }, { key: 'description', label: 'Description' },
          { key: 'debit_account', label: 'Debit' }, { key: 'credit_account', label: 'Credit' },
          { key: 'amount', label: 'Amount', render: v => `PKR ${Number(v).toLocaleString()}` },
        ],
      },
    ],
  },
  {
    group: '📦 Inventory',
    items: [
      { title: 'Stock Summary', description: 'Current stock levels for all products', apiKey: 'stock', endpoint: reportsAPI.stock,
        paramFields: [{ key: 'category', label: 'Category', type: 'select', options: [
          { value: 'feed', label: 'Feed' }, { value: 'medicine', label: 'Medicine' },
          { value: 'semen', label: 'Semen' }, { value: 'general', label: 'General' },
        ]}],
        columns: [
          { key: 'name', label: 'Product' }, { key: 'category', label: 'Category' }, { key: 'unit', label: 'Unit' },
          { key: 'current_stock', label: 'In Stock' }, { key: 'reorder_level', label: 'Reorder Level' },
          { key: 'status', label: 'Status', render: v => <span className={`badge ${v === 'Low' ? 'badge-red' : 'badge-green'}`}>{v}</span> },
        ],
      },
      { title: 'Consumption Report', description: 'Product consumption by period', apiKey: 'consumption', endpoint: reportsAPI.consumption,
        paramFields: [{ key: 'category', label: 'Category', type: 'select', options: [
          { value: 'feed', label: 'Feed' }, { value: 'medicine', label: 'Medicine' },
          { value: 'semen', label: 'Semen' }, { value: 'general', label: 'General' },
        ]}],
        columns: [
          { key: 'product', label: 'Product' }, { key: 'unit', label: 'Unit' }, { key: 'category', label: 'Category' },
          { key: 'total_consumed', label: 'Total Consumed' },
        ],
      },
    ],
  },
]

export default function ReportsPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reports Hub</h1>
        <p className="text-sm text-gray-500">Run any report and export to Excel</p>
      </div>
      <div className="space-y-8">
        {REPORTS.map(group => (
          <div key={group.group}>
            <h2 className="text-base font-semibold text-gray-700 mb-3">{group.group}</h2>
            <div className="space-y-4">
              {group.items.map(r => (
                <ReportCard key={r.apiKey} {...r} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
