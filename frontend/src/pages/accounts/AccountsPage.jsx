import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsAPI } from '@/api/endpoints'
import { DataTable, Pagination, Modal, DateRangeFilter, PageSpinner, FormField, Spinner, StatCard } from '@/components/ui'
import { Plus, DollarSign, TrendingUp, TrendingDown, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format } from 'date-fns'

const TABS = [
  { to: '/accounts', label: 'Dashboard', end: true },
  { to: '/accounts/transactions', label: 'Transactions' },
  { to: '/accounts/heads', label: 'Chart of Accounts' },
  { to: '/accounts/assets', label: 'Assets' },
  { to: '/accounts/pnl', label: 'P&L Report' },
  { to: '/accounts/ledger', label: 'Ledger' },
  { to: '/accounts/trial-balance', label: 'Trial Balance' },
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

function AccountsDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['accounts-dashboard'], queryFn: () => accountsAPI.dashboard().then(r => r.data) })
  if (isLoading) return <PageSpinner />
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Income (FY)"   value={data?.income_fy != null ? `PKR ${Number(data.income_fy).toLocaleString()}` : '—'}   icon={TrendingUp}   color="bg-green-50"  iconColor="text-green-600" />
        <StatCard label="Expense (FY)"  value={data?.expense_fy != null ? `PKR ${Number(data.expense_fy).toLocaleString()}` : '—'}  icon={TrendingDown} color="bg-red-50"    iconColor="text-red-600" />
        <StatCard label="Net Profit (FY)" value={data?.profit_fy != null ? `PKR ${Number(data.profit_fy).toLocaleString()}` : '—'} icon={DollarSign}   color={data?.profit_fy >= 0 ? 'bg-blue-50' : 'bg-red-50'} iconColor={data?.profit_fy >= 0 ? 'text-blue-600' : 'text-red-600'} />
        <StatCard label="Total Asset Value" value={data?.total_asset_value != null ? `PKR ${Number(data.total_asset_value).toLocaleString()}` : '—'} icon={Package} color="bg-purple-50" iconColor="text-purple-600" />
      </div>
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">Monthly P&L (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data?.monthly_pl ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={v => `PKR ${Number(v).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="income"  fill="#1A6B3C" radius={[4,4,0,0]} name="Income" />
            <Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]} name="Expense" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function TransactionsTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [df, setDf] = useState('')
  const [dt, setDt] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['transactions', page, df, dt],
    queryFn: () => accountsAPI.listTransactions({ page, date_from: df || undefined, date_to: dt || undefined }).then(r => r.data),
  })
  const { data: heads } = useQuery({ queryKey: ['account-heads-flat'], queryFn: () => accountsAPI.listHeads().then(r => { const all = []; const flatten = (arr) => arr.forEach(h => { all.push(h); if (h.children) flatten(h.children) }); flatten(Array.isArray(r.data) ? r.data : (r.data?.results ?? [])); return all }) })
  const { register, handleSubmit, reset } = useForm({ defaultValues: { transaction_type: 'cash_out', date: format(new Date(), 'yyyy-MM-dd'), amount: '' } })
  const mut = useMutation({
    mutationFn: accountsAPI.createTransaction,
    onSuccess: () => { toast.success('Transaction saved'); qc.invalidateQueries(['transactions']); qc.invalidateQueries(['accounts-dashboard']); reset(); setModal(false) },
    onError: (e) => toast.error(Object.values(e.response?.data ?? {}).flat()[0] ?? 'Error'),
  })
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'transaction_type', label: 'Type', render: v => <span className="badge badge-blue text-[10px]">{v?.replace(/_/g,' ')}</span> },
    { key: 'description', label: 'Description' },
    { key: 'debit_account_name', label: 'Debit' },
    { key: 'credit_account_name', label: 'Credit' },
    { key: 'amount', label: 'Amount', render: v => <span className="font-semibold">PKR {Number(v).toLocaleString()}</span> },
    { key: 'reference', label: 'Ref.' },
  ]
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <DateRangeFilter from={df} to={dt} onFrom={setDf} onTo={setDt} />
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Add Transaction</button>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={data?.results ?? []} loading={isLoading} /></div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
      <Modal open={modal} onClose={() => setModal(false)} title="Add Transaction" size="lg">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Type" required>
              <select {...register('transaction_type')} className="form-select">
                <option value="cash_in">Cash Receipt</option>
                <option value="cash_out">Cash Payment</option>
                <option value="journal">Journal Entry</option>
                <option value="purchase">Purchase</option>
                <option value="milk_sale">Milk Sale</option>
                <option value="corp_payment">Corporate Milk Payment</option>
              </select>
            </FormField>
            <FormField label="Date" required><input type="date" {...register('date', { required: true })} className="form-input" /></FormField>
            <FormField label="Amount" required><input type="number" step="0.01" {...register('amount', { required: true })} className="form-input" /></FormField>
            <FormField label="Reference"><input {...register('reference')} className="form-input" /></FormField>
            <FormField label="Debit Account" required>
              <select {...register('debit_account', { required: true })} className="form-select">
                <option value="">— Select —</option>
                {(heads ?? []).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </FormField>
            <FormField label="Credit Account" required>
              <select {...register('credit_account', { required: true })} className="form-select">
                <option value="">— Select —</option>
                {(heads ?? []).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </FormField>
            <FormField label="Supplier Name"><input {...register('supplier_name')} className="form-input" /></FormField>
            <FormField label="Invoice Number"><input {...register('invoice_number')} className="form-input" /></FormField>
          </div>
          <FormField label="Description"><textarea {...register('description')} rows={2} className="form-input" /></FormField>
          <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Save Transaction'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

function AccountHeadsTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['account-heads'], queryFn: () => accountsAPI.listHeads().then(r => r.data) })
  const { register, handleSubmit, reset } = useForm({ defaultValues: { account_type: 'expense' } })
  const mut = useMutation({ mutationFn: accountsAPI.createHead, onSuccess: () => { toast.success('Account head created'); qc.invalidateQueries(['account-heads']); reset(); setModal(false) } })
  const heads = Array.isArray(data) ? data : []
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Add Account Head</button>
      </div>
      <div className="space-y-3">
        {['asset','liability','income','expense','equity'].map(type => {
          const group = heads.filter(h => h.account_type === type)
          if (!group.length) return null
          return (
            <div key={type} className="card">
              <h3 className="font-semibold text-gray-700 capitalize mb-2 text-sm">{type}</h3>
              <div className="divide-y divide-gray-50">
                {group.map(h => (
                  <div key={h.id} className="py-1.5 text-sm flex justify-between">
                    <span className="text-gray-800">{h.name}</span>
                    <span className="text-gray-400 text-xs">{h.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Add Account Head" size="sm">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <FormField label="Name" required><input {...register('name', { required: true })} className="form-input" /></FormField>
          <FormField label="Type" required>
            <select {...register('account_type')} className="form-select">
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="equity">Equity</option>
            </select>
          </FormField>
          <FormField label="Code"><input {...register('code')} className="form-input" /></FormField>
          <FormField label="Opening Balance"><input type="number" step="0.01" {...register('opening_balance')} className="form-input" defaultValue={0} /></FormField>
          <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Create'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

function AssetsTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['assets'], queryFn: () => accountsAPI.listAssets().then(r => r.data) })
  const { register, handleSubmit, reset } = useForm({ defaultValues: { depreciation_method: 'straight_line', useful_life_years: 5, salvage_value: 0 } })
  const mut = useMutation({ mutationFn: accountsAPI.createAsset, onSuccess: () => { toast.success('Asset saved'); qc.invalidateQueries(['assets']); reset(); setModal(false) } })
  const assets = Array.isArray(data) ? data : (data?.results ?? [])
  const cols = [
    { key: 'name', label: 'Asset' },
    { key: 'category', label: 'Category', render: v => <span className="capitalize">{v}</span> },
    { key: 'purchase_date', label: 'Purchase Date' },
    { key: 'purchase_value', label: 'Purchase Value', render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'current_value', label: 'Current Value', render: v => <span className="font-semibold text-primary-700">PKR {Number(v).toLocaleString()}</span> },
    { key: 'total_depreciation', label: 'Depreciated', render: v => <span className="text-red-500">PKR {Number(v).toLocaleString()}</span> },
    { key: 'useful_life_years', label: 'Life (yrs)' },
  ]
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Add Asset</button>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={assets} loading={isLoading} /></div>
      <Modal open={modal} onClose={() => setModal(false)} title="Add Asset" size="lg">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Name" required><input {...register('name', { required: true })} className="form-input" /></FormField>
            <FormField label="Category">
              <select {...register('category')} className="form-select">
                <option value="machinery">Machinery</option>
                <option value="vehicle">Vehicle</option>
                <option value="equipment">Equipment</option>
                <option value="land">Land</option>
                <option value="building">Building</option>
                <option value="other">Other</option>
              </select>
            </FormField>
            <FormField label="Purchase Date" required><input type="date" {...register('purchase_date', { required: true })} className="form-input" /></FormField>
            <FormField label="Purchase Value" required><input type="number" step="0.01" {...register('purchase_value', { required: true })} className="form-input" /></FormField>
            <FormField label="Useful Life (years)"><input type="number" {...register('useful_life_years')} className="form-input" /></FormField>
            <FormField label="Salvage Value"><input type="number" step="0.01" {...register('salvage_value')} className="form-input" /></FormField>
          </div>
          <FormField label="Notes"><textarea {...register('notes')} rows={2} className="form-input" /></FormField>
          <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Save Asset'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

function PnLTab() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const yearStart = today.slice(0, 4) + '-01-01'
  const [df, setDf] = useState(yearStart)
  const [dt, setDt] = useState(today)
  const { data, isLoading } = useQuery({ queryKey: ['pnl', df, dt], queryFn: () => accountsAPI.pnl({ date_from: df, date_to: dt }).then(r => r.data) })
  if (isLoading) return <PageSpinner />
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap gap-3 items-center">
        <DateRangeFilter from={df} to={dt} onFrom={setDf} onTo={setDt} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Income"  value={`PKR ${Number(data?.total_income ?? 0).toLocaleString()}`}  icon={TrendingUp}   color="bg-green-50" iconColor="text-green-600" />
        <StatCard label="Total Expense" value={`PKR ${Number(data?.total_expenses ?? 0).toLocaleString()}`} icon={TrendingDown} color="bg-red-50"   iconColor="text-red-600" />
        <StatCard label="Net Profit"    value={`PKR ${Number(data?.net_profit ?? 0).toLocaleString()}`}    icon={DollarSign}   color={(data?.net_profit ?? 0) >= 0 ? 'bg-blue-50' : 'bg-red-50'} iconColor={(data?.net_profit ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Income Breakdown</h3>
          {(data?.income_breakdown ?? []).map((r, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
              <span>{r.credit_account__name}</span>
              <span className="font-medium text-green-700">PKR {Number(r.total).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 text-sm">Expense Breakdown</h3>
          {(data?.expense_breakdown ?? []).map((r, i) => (
            <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
              <span>{r.debit_account__name}</span>
              <span className="font-medium text-red-600">PKR {Number(r.total).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LedgerTab() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [accountId, setAccountId] = useState('')
  const [df, setDf] = useState('')
  const [dt, setDt] = useState(today)
  const { data: heads } = useQuery({ queryKey: ['account-heads-flat-ledger'], queryFn: () => accountsAPI.listHeads().then(r => { const all = []; const flatten = (arr) => arr.forEach(h => { all.push(h); if (h.children?.length) flatten(h.children) }); flatten(Array.isArray(r.data) ? r.data : (r.data?.results ?? [])); return all }) })
  const { data, isLoading } = useQuery({
    queryKey: ['ledger', accountId, df, dt],
    queryFn: () => accountsAPI.ledger({ account_id: accountId, date_from: df || undefined, date_to: dt }).then(r => r.data),
    enabled: !!accountId,
  })
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap gap-3 items-end">
        <FormField label="Account">
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="form-select w-48">
            <option value="">— Select account —</option>
            {(heads ?? []).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </FormField>
        <DateRangeFilter from={df} to={dt} onFrom={setDf} onTo={setDt} />
      </div>
      {accountId && (
        isLoading ? <PageSpinner /> : (
          <div className="card p-0">
            <div className="px-4 py-3 bg-gray-50 border-b flex justify-between text-sm font-medium">
              <span>{data?.account} <span className="text-gray-400 capitalize">({data?.account_type})</span></span>
              <span>Opening: PKR {Number(data?.opening_balance ?? 0).toLocaleString()} → Closing: PKR {Number(data?.closing_balance ?? 0).toLocaleString()}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Date</th><th>Description</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {(data?.rows ?? []).map((r, i) => (
                    <tr key={i}>
                      <td>{r.date}</td>
                      <td>{r.description}</td>
                      <td className="text-gray-400">{r.reference}</td>
                      <td className="text-green-700">{r.debit > 0 ? Number(r.debit).toLocaleString() : ''}</td>
                      <td className="text-red-600">{r.credit > 0 ? Number(r.credit).toLocaleString() : ''}</td>
                      <td className="font-semibold">{Number(r.balance).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  )
}

function TrialBalanceTab() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [dt, setDt] = useState(today)
  const { data, isLoading } = useQuery({ queryKey: ['trial-balance', dt], queryFn: () => accountsAPI.trialBalance({ date_to: dt }).then(r => r.data) })
  const rows = Array.isArray(data) ? data : []
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  return (
    <div className="space-y-4">
      <div className="card flex items-end gap-3">
        <FormField label="As of Date">
          <input type="date" value={dt} onChange={e => setDt(e.target.value)} className="form-input w-40" />
        </FormField>
      </div>
      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Account</th><th>Type</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {isLoading ? <tr><td colSpan={5} className="py-8 text-center text-gray-400">Loading…</td></tr> :
                rows.map((r, i) => (
                  <tr key={i}>
                    <td className="font-medium">{r.account}</td>
                    <td><span className="badge badge-gray capitalize">{r.account_type}</span></td>
                    <td className="text-green-700">{r.debit > 0 ? Number(r.debit).toLocaleString() : '—'}</td>
                    <td className="text-red-600">{r.credit > 0 ? Number(r.credit).toLocaleString() : '—'}</td>
                    <td className={`font-semibold ${r.balance < 0 ? 'text-red-600' : ''}`}>{Number(r.balance).toLocaleString()}</td>
                  </tr>
                ))
              }
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={2} className="px-4 py-3 text-sm">TOTALS</td>
                <td className="px-4 py-3 text-sm text-green-700">{Number(totalDebit).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-red-600">{Number(totalCredit).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm">{Number(totalDebit - totalCredit).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function AccountsPage() {
  return (
    <div>
      <h1 className="page-title mb-4">Finance & Accounts</h1>
      <TabBar />
      <Routes>
        <Route index element={<AccountsDashboard />} />
        <Route path="transactions" element={<TransactionsTab />} />
        <Route path="heads" element={<AccountHeadsTab />} />
        <Route path="assets" element={<AssetsTab />} />
        <Route path="pnl" element={<PnLTab />} />
        <Route path="ledger" element={<LedgerTab />} />
        <Route path="trial-balance" element={<TrialBalanceTab />} />
      </Routes>
    </div>
  )
}
