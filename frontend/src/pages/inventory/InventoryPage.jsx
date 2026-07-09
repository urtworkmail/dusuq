import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryAPI } from '@/api/endpoints'
import { DataTable, Pagination, Modal, DateRangeFilter, PageSpinner, FormField, Spinner, StatCard } from '@/components/ui'
import { Plus, Package, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import clsx from 'clsx'

const TABS = [
  { to: '/inventory', label: 'Dashboard', end: true },
  { to: '/inventory/products', label: 'Products' },
  { to: '/inventory/stock-in', label: 'Stock In' },
  { to: '/inventory/consumption', label: 'Consumption' },
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

function InventoryDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['inventory-dashboard'], queryFn: () => inventoryAPI.dashboard().then(r => r.data) })
  if (isLoading) return <PageSpinner />
  const summary = data?.summary ?? []
  const lowCount = data?.low_stock_count ?? 0
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['feed','medicine','semen','general'].map(cat => {
          const items = (data?.by_category?.[cat] ?? [])
          return (
            <div key={cat} className="card text-center">
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              <p className="text-xs text-gray-500 capitalize mt-0.5">{cat} products</p>
            </div>
          )
        })}
      </div>
      {lowCount > 0 && (
        <div className="card bg-red-50 border-red-100 flex items-center gap-3">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
          <p className="text-sm text-red-700 font-medium">{lowCount} product{lowCount > 1 ? 's' : ''} at or below reorder level</p>
        </div>
      )}
      <div className="card p-0">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">Current Stock Levels</div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Product</th><th>Category</th><th>Unit</th><th>In Stock</th><th>Reorder Level</th><th>Status</th></tr></thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {summary.map((p, i) => (
                <tr key={i} className={p.is_low_stock ? 'bg-red-50/30' : ''}>
                  <td className="font-medium">{p.name}</td>
                  <td><span className="capitalize badge badge-gray">{p.category}</span></td>
                  <td>{p.unit}</td>
                  <td className={`font-semibold ${p.is_low_stock ? 'text-red-600' : 'text-gray-800'}`}>{p.current_stock}</td>
                  <td className="text-gray-400">{p.reorder_level}</td>
                  <td>{p.is_low_stock ? <span className="badge badge-red">Low Stock</span> : <span className="badge badge-green">OK</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ProductsTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: () => inventoryAPI.listProducts().then(r => r.data) })
  const { register, handleSubmit, reset, setValue } = useForm({ defaultValues: { category: 'feed', unit: 'kg', reorder_level: 0, cost_per_unit: 0 } })
  const mut = useMutation({
    mutationFn: (d) => editTarget ? inventoryAPI.updateProduct(editTarget.id, d) : inventoryAPI.createProduct(d),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries(['products']); qc.invalidateQueries(['inventory-dashboard']); reset(); setModal(false); setEditTarget(null) },
    onError: () => toast.error('Error saving product'),
  })
  const openEdit = (p) => { setEditTarget(p); Object.entries(p).forEach(([k, v]) => setValue(k, v)); setModal(true) }
  const products = Array.isArray(data) ? data : (data?.results ?? [])
  const cols = [
    { key: 'name', label: 'Product' },
    { key: 'category', label: 'Category', render: v => <span className="capitalize badge badge-gray">{v}</span> },
    { key: 'unit', label: 'Unit' },
    { key: 'current_stock', label: 'In Stock', render: (v, row) => <span className={clsx('font-semibold', row.is_low_stock ? 'text-red-600' : 'text-gray-800')}>{v}</span> },
    { key: 'reorder_level', label: 'Reorder At' },
    { key: 'cost_per_unit', label: 'Cost/Unit' },
    { key: 'is_low_stock', label: 'Status', render: v => v ? <span className="badge badge-red">Low</span> : <span className="badge badge-green">OK</span> },
    { key: 'actions', label: '', render: (_, row) => <button onClick={() => openEdit(row)} className="text-xs text-primary-600 hover:underline">Edit</button> },
  ]
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-primary" onClick={() => { setEditTarget(null); reset(); setModal(true) }}><Plus size={16} />Add Product</button>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={products} loading={isLoading} /></div>
      <Modal open={modal} onClose={() => { setModal(false); setEditTarget(null); reset() }} title={editTarget ? 'Edit Product' : 'Add Product'} size="md">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Name" required><input {...register('name', { required: true })} className="form-input" /></FormField>
            <FormField label="Category">
              <select {...register('category')} className="form-select">
                <option value="feed">Feed</option>
                <option value="medicine">Medicine</option>
                <option value="semen">Semen</option>
                <option value="general">General</option>
              </select>
            </FormField>
            <FormField label="Unit"><input {...register('unit')} className="form-input" placeholder="kg, L, straw, bag…" /></FormField>
            <FormField label="Reorder Level"><input type="number" step="0.1" {...register('reorder_level')} className="form-input" /></FormField>
            <FormField label="Cost Per Unit"><input type="number" step="0.01" {...register('cost_per_unit')} className="form-input" /></FormField>
          </div>
          <FormField label="Notes"><textarea {...register('notes')} rows={2} className="form-input" /></FormField>
          <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Save'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

function StockInTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [page, setPage] = useState(1)
  const [df, setDf] = useState('')
  const [dt, setDt] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['stock-ins', page, df, dt], queryFn: () => inventoryAPI.listStockIns({ page, date_from: df || undefined, date_to: dt || undefined }).then(r => r.data) })
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => inventoryAPI.listProducts().then(r => r.data) })
  const { register, handleSubmit, reset } = useForm({ defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), quantity: '', cost_per_unit: 0 } })
  const mut = useMutation({ mutationFn: inventoryAPI.createStockIn, onSuccess: () => { toast.success('Stock-in saved'); qc.invalidateQueries(['stock-ins']); qc.invalidateQueries(['inventory-dashboard']); qc.invalidateQueries(['products']); reset(); setModal(false) } })
  const productList = Array.isArray(products) ? products : (products?.results ?? [])
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'product_name', label: 'Product' },
    { key: 'product_unit', label: 'Unit' },
    { key: 'quantity', label: 'Qty' },
    { key: 'cost_per_unit', label: 'Rate' },
    { key: 'total_cost', label: 'Total', render: v => `PKR ${Number(v).toLocaleString()}` },
    { key: 'supplier', label: 'Supplier' },
    { key: 'batch_number', label: 'Batch' },
    { key: 'expiry_date', label: 'Expiry' },
  ]
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <DateRangeFilter from={df} to={dt} onFrom={setDf} onTo={setDt} />
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Receive Stock</button>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={data?.results ?? []} loading={isLoading} /></div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
      <Modal open={modal} onClose={() => { setModal(false); reset() }} title="Receive Stock" size="lg">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Product" required>
              <select {...register('product', { required: true })} className="form-select">
                <option value="">— Select product —</option>
                {productList.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
              </select>
            </FormField>
            <FormField label="Date" required><input type="date" {...register('date', { required: true })} className="form-input" /></FormField>
            <FormField label="Quantity" required><input type="number" step="0.1" {...register('quantity', { required: true })} className="form-input" /></FormField>
            <FormField label="Cost Per Unit"><input type="number" step="0.01" {...register('cost_per_unit')} className="form-input" /></FormField>
            <FormField label="Supplier"><input {...register('supplier')} className="form-input" /></FormField>
            <FormField label="Invoice Number"><input {...register('invoice_number')} className="form-input" /></FormField>
            <FormField label="Batch Number"><input {...register('batch_number')} className="form-input" /></FormField>
            <FormField label="Expiry Date"><input type="date" {...register('expiry_date')} className="form-input" /></FormField>
          </div>
          <FormField label="Notes"><textarea {...register('notes')} rows={2} className="form-input" /></FormField>
          <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Save Stock-In'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

function ConsumptionTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [page, setPage] = useState(1)
  const [df, setDf] = useState('')
  const [dt, setDt] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['consumptions', page, df, dt], queryFn: () => inventoryAPI.listConsumptions({ page, date_from: df || undefined, date_to: dt || undefined }).then(r => r.data) })
  const { data: products } = useQuery({ queryKey: ['products'], queryFn: () => inventoryAPI.listProducts().then(r => r.data) })
  const { register, handleSubmit, reset } = useForm({ defaultValues: { date: format(new Date(), 'yyyy-MM-dd') } })
  const mut = useMutation({ mutationFn: inventoryAPI.createConsumption, onSuccess: () => { toast.success('Consumption logged'); qc.invalidateQueries(['consumptions']); qc.invalidateQueries(['inventory-dashboard']); qc.invalidateQueries(['products']); reset(); setModal(false) }, onError: (e) => toast.error(e.response?.data?.quantity?.[0] ?? 'Error') })
  const productList = Array.isArray(products) ? products : (products?.results ?? [])
  const cols = [
    { key: 'date', label: 'Date' },
    { key: 'product_name', label: 'Product' },
    { key: 'product_unit', label: 'Unit' },
    { key: 'quantity', label: 'Qty' },
    { key: 'shed_name', label: 'Shed' },
    { key: 'notes', label: 'Notes' },
  ]
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <DateRangeFilter from={df} to={dt} onFrom={setDf} onTo={setDt} />
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Log Consumption</button>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={data?.results ?? []} loading={isLoading} /></div>
      <Pagination count={data?.count} page={page} onPage={setPage} />
      <Modal open={modal} onClose={() => { setModal(false); reset() }} title="Log Consumption" size="md">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Product" required>
              <select {...register('product', { required: true })} className="form-select">
                <option value="">— Select product —</option>
                {productList.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock} {p.unit})</option>)}
              </select>
            </FormField>
            <FormField label="Date" required><input type="date" {...register('date', { required: true })} className="form-input" /></FormField>
            <FormField label="Quantity" required><input type="number" step="0.1" {...register('quantity', { required: true })} className="form-input" /></FormField>
          </div>
          <FormField label="Notes"><textarea {...register('notes')} rows={2} className="form-input" /></FormField>
          <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Save'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

export default function InventoryPage() {
  return (
    <div>
      <h1 className="page-title mb-4">Stock & Inventory</h1>
      <TabBar />
      <Routes>
        <Route index element={<InventoryDashboard />} />
        <Route path="products" element={<ProductsTab />} />
        <Route path="stock-in" element={<StockInTab />} />
        <Route path="consumption" element={<ConsumptionTab />} />
      </Routes>
    </div>
  )
}
