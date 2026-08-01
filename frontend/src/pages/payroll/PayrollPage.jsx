import { useState } from 'react'
import { Routes, Route, NavLink, Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payrollAPI } from '@/api/endpoints'
import { DataTable, Modal, PageSpinner, FormField, Spinner, StatCard } from '@/components/ui'
import { Plus, Users, DollarSign, Wallet, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'

const TABS = [
  { to: '/payroll', label: 'Employees', end: true },
  { to: '/payroll/payments', label: 'Salary Payments' },
  { to: '/payroll/advances', label: 'Advances' },
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

function EmployeesTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['employees'], queryFn: () => payrollAPI.listEmployees().then(r => r.data) })
  const { data: dash } = useQuery({ queryKey: ['payroll-dashboard'], queryFn: () => payrollAPI.dashboard().then(r => r.data) })
  const { register, handleSubmit, reset } = useForm({ defaultValues: { joining_date: format(new Date(), 'yyyy-MM-dd'), is_active: true } })
  const mut = useMutation({
    mutationFn: payrollAPI.createEmployee,
    onSuccess: () => { toast.success('Employee added'); qc.invalidateQueries(['employees']); qc.invalidateQueries(['payroll-dashboard']); reset(); setModal(false) },
    onError: (e) => toast.error(Object.values(e.response?.data ?? {}).flat()[0] ?? 'Error'),
  })
  const employees = Array.isArray(data) ? data : (data?.results ?? [])
  const cols = [
    { key: 'name', label: 'Name', render: (v, row) => <Link to={`/payroll/employees/${row.id}`} className="text-primary-700 font-medium hover:underline">{v}</Link> },
    { key: 'designation', label: 'Designation' },
    { key: 'phone', label: 'Phone' },
    { key: 'joining_date', label: 'Joined' },
    { key: 'monthly_salary', label: 'Monthly Salary', render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'is_active', label: 'Status', render: v => <span className={`badge ${v ? 'badge-green' : 'badge-gray'}`}>{v ? 'Active' : 'Inactive'}</span> },
  ]
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Active Employees" value={dash?.active_employee_count ?? '—'} icon={Users} color="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Monthly Payroll Cost" value={dash?.total_monthly_payroll != null ? `PKR ${Number(dash.total_monthly_payroll).toLocaleString()}` : '—'} icon={DollarSign} color="bg-green-50" iconColor="text-green-600" />
        <StatCard label="Total Owed to Employees" value={dash?.total_owed_to_employees != null ? `PKR ${Number(dash.total_owed_to_employees).toLocaleString()}` : '—'} icon={Wallet} color="bg-amber-50" iconColor="text-amber-600" />
      </div>
      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Add Employee</button>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={employees} loading={isLoading} /></div>
      <Modal open={modal} onClose={() => setModal(false)} title="Add Employee" size="lg">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Name" required><input {...register('name', { required: true })} className="form-input" /></FormField>
            <FormField label="Designation"><input {...register('designation')} className="form-input" /></FormField>
            <FormField label="Phone"><input {...register('phone')} className="form-input" /></FormField>
            <FormField label="CNIC / ID Number"><input {...register('cnic')} className="form-input" /></FormField>
            <FormField label="Joining Date" required><input type="date" {...register('joining_date', { required: true })} className="form-input" /></FormField>
            <FormField label="Monthly Salary" required><input type="number" step="0.01" {...register('monthly_salary', { required: true })} className="form-input" /></FormField>
          </div>
          <FormField label="Notes"><textarea {...register('notes')} rows={2} className="form-input" /></FormField>
          <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Save Employee'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

function EmployeeLedgerTab() {
  const { id } = useParams()
  const { data, isLoading } = useQuery({ queryKey: ['employee-ledger', id], queryFn: () => payrollAPI.ledger(id).then(r => r.data) })
  if (isLoading) return <PageSpinner />
  return (
    <div className="space-y-4">
      <Link to="/payroll" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={14} />Back to Employees</Link>
      <div className="card flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800">{data?.employee}</h2>
          <p className="text-sm text-gray-500">Monthly salary: PKR {Number(data?.monthly_salary ?? 0).toLocaleString()}</p>
        </div>
        <div className={`text-lg font-bold ${(data?.balance_owed ?? 0) >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
          {(data?.balance_owed ?? 0) >= 0 ? 'Owed: ' : 'Overpaid: '}
          PKR {Math.abs(data?.balance_owed ?? 0).toLocaleString()}
        </div>
      </div>
      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Balance</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {(data?.rows ?? []).map((r, i) => (
                <tr key={i}>
                  <td>{r.date}</td>
                  <td><span className="badge badge-gray capitalize">{r.type}</span></td>
                  <td>{r.description}</td>
                  <td className={r.amount >= 0 ? 'text-amber-600' : 'text-green-700'}>{r.amount >= 0 ? '+' : ''}{Number(r.amount).toLocaleString()}</td>
                  <td className="font-semibold">{Number(r.balance).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function PaymentsTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['salary-payments'], queryFn: () => payrollAPI.listPayments().then(r => r.data) })
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: () => payrollAPI.listEmployees().then(r => r.data) })
  const { register, handleSubmit, reset } = useForm({ defaultValues: { payment_date: format(new Date(), 'yyyy-MM-dd'), month: format(new Date(), 'yyyy-MM-dd') } })
  const mut = useMutation({
    mutationFn: payrollAPI.createPayment,
    onSuccess: () => { toast.success('Payment recorded'); qc.invalidateQueries(['salary-payments']); qc.invalidateQueries(['payroll-dashboard']); reset(); setModal(false) },
    onError: (e) => toast.error(Object.values(e.response?.data ?? {}).flat()[0] ?? 'Error'),
  })
  const rows = Array.isArray(data) ? data : (data?.results ?? [])
  const empList = Array.isArray(employees) ? employees : (employees?.results ?? [])
  const cols = [
    { key: 'employee_name', label: 'Employee' },
    { key: 'month', label: 'For Month' },
    { key: 'amount_paid', label: 'Amount', render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'payment_date', label: 'Paid On' },
    { key: 'notes', label: 'Notes' },
  ]
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Record Payment</button>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={rows} loading={isLoading} /></div>
      <Modal open={modal} onClose={() => setModal(false)} title="Record Salary Payment" size="lg">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Employee" required>
              <select {...register('employee', { required: true })} className="form-select">
                <option value="">— Select —</option>
                {empList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </FormField>
            <FormField label="For Month" required><input type="date" {...register('month', { required: true })} className="form-input" /></FormField>
            <FormField label="Amount Paid" required><input type="number" step="0.01" {...register('amount_paid', { required: true })} className="form-input" /></FormField>
            <FormField label="Payment Date" required><input type="date" {...register('payment_date', { required: true })} className="form-input" /></FormField>
          </div>
          <FormField label="Notes"><textarea {...register('notes')} rows={2} className="form-input" /></FormField>
          <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Save Payment'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

function AdvancesTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['advances'], queryFn: () => payrollAPI.listAdvances().then(r => r.data) })
  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: () => payrollAPI.listEmployees().then(r => r.data) })
  const { register, handleSubmit, reset } = useForm({ defaultValues: { date: format(new Date(), 'yyyy-MM-dd') } })
  const mut = useMutation({
    mutationFn: payrollAPI.createAdvance,
    onSuccess: () => { toast.success('Advance recorded'); qc.invalidateQueries(['advances']); qc.invalidateQueries(['payroll-dashboard']); reset(); setModal(false) },
    onError: (e) => toast.error(Object.values(e.response?.data ?? {}).flat()[0] ?? 'Error'),
  })
  const rows = Array.isArray(data) ? data : (data?.results ?? [])
  const empList = Array.isArray(employees) ? employees : (employees?.results ?? [])
  const cols = [
    { key: 'employee_name', label: 'Employee' },
    { key: 'amount', label: 'Amount', render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'date', label: 'Date' },
    { key: 'reason', label: 'Reason' },
    { key: 'is_settled', label: 'Settled', render: v => <span className={`badge ${v ? 'badge-green' : 'badge-gray'}`}>{v ? 'Yes' : 'No'}</span> },
  ]
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Record Advance</button>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={rows} loading={isLoading} /></div>
      <Modal open={modal} onClose={() => setModal(false)} title="Record Advance" size="lg">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Employee" required>
              <select {...register('employee', { required: true })} className="form-select">
                <option value="">— Select —</option>
                {empList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </FormField>
            <FormField label="Amount" required><input type="number" step="0.01" {...register('amount', { required: true })} className="form-input" /></FormField>
            <FormField label="Date" required><input type="date" {...register('date', { required: true })} className="form-input" /></FormField>
            <FormField label="Reason"><input {...register('reason')} className="form-input" /></FormField>
          </div>
          <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Save Advance'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

export default function PayrollPage() {
  return (
    <div>
      <h1 className="page-title mb-4">Payroll</h1>
      <TabBar />
      <Routes>
        <Route index element={<EmployeesTab />} />
        <Route path="employees/:id" element={<EmployeeLedgerTab />} />
        <Route path="payments" element={<PaymentsTab />} />
        <Route path="advances" element={<AdvancesTab />} />
      </Routes>
    </div>
  )
}
