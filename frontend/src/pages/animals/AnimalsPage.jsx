import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { animalAPI, tenantAPI } from '@/api/endpoints'
import { DataTable, Pagination, Modal, ConfirmDialog, StatusBadge, SearchInput, FormField, EmptyState, Spinner } from '@/components/ui'
import { Plus, Beef, Eye, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'

const STATUSES = ['heifer','open','inseminated','pregnant','dry','sick','sold','dead','culled']

function AnimalForm({ defaultValues, onSubmit, loading, breeds = [], sheds = [], groups = [], animals = [] }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Tag Number" required error={errors.tag_number?.message}>
          <input {...register('tag_number', { required: 'Required' })} className="form-input" />
        </FormField>
        <FormField label="Name">
          <input {...register('name')} className="form-input" />
        </FormField>
        <FormField label="Breed">
          <select {...register('breed')} className="form-select">
            <option value="">— Select breed —</option>
            {breeds.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </FormField>
        <FormField label="Sex" required>
          <select {...register('sex')} className="form-select">
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </FormField>
        <FormField label="Date of Birth">
          <input type="date" {...register('date_of_birth')} className="form-input" />
        </FormField>
        <FormField label="Status">
          <select {...register('status')} className="form-select">
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="Shed">
          <select {...register('shed')} className="form-select">
            <option value="">— No shed —</option>
            {sheds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FormField>
        <FormField label="Group">
          <select {...register('group')} className="form-select">
            <option value="">— No group —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </FormField>
        <FormField label="Dam (Mother)">
          <select {...register('dam')} className="form-select">
            <option value="">— Unknown —</option>
            {animals.filter(a => a.sex === 'female').map(a => (
              <option key={a.id} value={a.id}>{a.tag_number} {a.name ? `— ${a.name}` : ''}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Sire Tag">
          <input {...register('sire_tag')} className="form-input" placeholder="Bull ID / tag" />
        </FormField>
        <FormField label="Purchase Date">
          <input type="date" {...register('purchase_date')} className="form-input" />
        </FormField>
        <FormField label="Purchase Price">
          <input type="number" step="0.01" {...register('purchase_price')} className="form-input" placeholder="0.00" />
        </FormField>
        <FormField label="Weight (kg)">
          <input type="number" step="0.1" {...register('weight_kg')} className="form-input" />
        </FormField>
        <FormField label="Lactation Number">
          <input type="number" {...register('lactation_number')} className="form-input" defaultValue={0} />
        </FormField>
      </div>
      <FormField label="Notes">
        <textarea {...register('notes')} rows={2} className="form-input" />
      </FormField>
      <div className="flex justify-end gap-2 pt-2">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? <Spinner size={16} className="text-white" /> : 'Save Animal'}
        </button>
      </div>
    </form>
  )
}

export default function AnimalsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(null)   // null | 'create' | { animal }
  const [delTarget, setDelTarget] = useState(null)

  const params = { page, search: search || undefined, status: statusFilter || undefined }

  const { data, isLoading } = useQuery({
    queryKey: ['animals', params],
    queryFn: () => animalAPI.list(params).then(r => r.data),
  })
  const { data: breeds }  = useQuery({ queryKey: ['breeds'],  queryFn: () => tenantAPI.listBreeds().then(r => r.data.results ?? r.data) })
  const { data: shedsRaw }   = useQuery({ queryKey: ['sheds'],   queryFn: () => tenantAPI.listSheds().then(r => r.data) })
  const { data: groupsRaw }  = useQuery({ queryKey: ['groups'],  queryFn: () => tenantAPI.listGroups().then(r => r.data) })
  const sheds = Array.isArray(shedsRaw) ? shedsRaw : (shedsRaw?.results ?? [])
  const groups = Array.isArray(groupsRaw) ? groupsRaw : (groupsRaw?.results ?? [])
  const { data: allAnimals } = useQuery({ queryKey: ['animals-all'], queryFn: () => animalAPI.list({ page_size: 500 }).then(r => r.data.results ?? []) })

  const invalidate = () => { qc.invalidateQueries(['animals']); qc.invalidateQueries(['animal-summary']) }

  const createMut = useMutation({
    mutationFn: (data) => animalAPI.create(data),
    onSuccess: () => { toast.success('Animal added'); setModal(null); invalidate() },
    onError: (e) => toast.error(e.response?.data?.tag_number?.[0] ?? 'Error saving animal'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => animalAPI.update(id, data),
    onSuccess: () => { toast.success('Animal updated'); setModal(null); invalidate() },
    onError: () => toast.error('Error updating animal'),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => animalAPI.delete(id),
    onSuccess: () => { toast.success('Animal deactivated'); setDelTarget(null); invalidate() },
  })

  const animals = data?.results ?? []

  const columns = [
    { key: 'tag_number', label: 'Tag', render: (v, row) => (
      <Link to={`/animals/${row.id}`} className="font-semibold text-primary-600 hover:underline">{v}</Link>
    )},
    { key: 'name', label: 'Name' },
    { key: 'breed_name', label: 'Breed' },
    { key: 'sex', label: 'Sex', render: v => <span className="capitalize">{v}</span> },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'shed_name', label: 'Shed' },
    { key: 'lactation_number', label: 'Lact #' },
    { key: 'age_months', label: 'Age', render: v => v ? `${v} mo` : '—' },
    { key: 'actions', label: '', render: (_, row) => (
      <div className="flex items-center gap-1">
        <Link to={`/animals/${row.id}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Eye size={14} /></Link>
        <button onClick={() => setModal(row)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil size={14} /></button>
        <button onClick={() => setDelTarget(row)} className="p-1.5 rounded hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
      </div>
    )},
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Animal Registry</h1>
        <button className="btn btn-primary" onClick={() => setModal('create')}><Plus size={16} />Add Animal</button>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap gap-3 items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search tag, name…" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select w-40">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card p-0">
        <DataTable
          columns={columns}
          data={animals}
          loading={isLoading}
          emptyMessage="No animals found. Add your first animal."
        />
      </div>
      <Pagination count={data?.count} page={page} onPage={setPage} />

      {/* Create modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Add Animal" size="lg">
        <AnimalForm
          onSubmit={(d) => createMut.mutate(d)}
          loading={createMut.isPending}
          breeds={breeds ?? []}
          sheds={sheds ?? []}
          groups={groups ?? []}
          animals={allAnimals ?? []}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={modal && modal !== 'create'} onClose={() => setModal(null)} title="Edit Animal" size="lg">
        {modal && modal !== 'create' && (
          <AnimalForm
            defaultValues={{ ...modal, breed: modal.breed ?? '', shed: modal.shed ?? '', group: modal.group ?? '', dam: modal.dam ?? '' }}
            onSubmit={(d) => updateMut.mutate({ id: modal.id, data: d })}
            loading={updateMut.isPending}
            breeds={breeds ?? []}
            sheds={sheds ?? []}
            groups={groups ?? []}
            animals={(allAnimals ?? []).filter(a => a.id !== modal.id)}
          />
        )}
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={() => deleteMut.mutate(delTarget.id)}
        title="Deactivate Animal"
        message={`Deactivate ${delTarget?.tag_number}? The animal's history will be preserved.`}
        confirmLabel="Deactivate"
      />
    </div>
  )
}
