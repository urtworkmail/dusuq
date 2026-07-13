import { useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantAPI, authAPI } from '@/api/endpoints'
import { Modal, FormField, Spinner, PageSpinner, DataTable, ConfirmDialog } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { Save, Send, Plus, Trash2, Pencil, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import clsx from 'clsx'

const TABS = [
  { to: '/settings',         label: 'Farm Profile', end: true },
  { to: '/settings/smtp',    label: 'Email (SMTP)' },
  { to: '/settings/sheds',   label: 'Sheds & Groups' },
  { to: '/settings/breeds',  label: 'Breeds' },
  { to: '/settings/users',   label: 'User Management' },
  { to: '/settings/account', label: 'My Account' },
]

function TabBar() {
  return (
    <div className="flex overflow-x-auto gap-1 border-b border-gray-200 mb-6">
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

// ─── Farm Profile ─────────────────────────────────────────────────────────────
function FarmProfileTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['tenant-profile'], queryFn: () => tenantAPI.getProfile().then(r => r.data) })
  const { register, handleSubmit, formState: { isDirty } } = useForm({ values: data ?? {} })
  const mut = useMutation({
    mutationFn: tenantAPI.updateProfile,
    onSuccess: () => { toast.success('Farm profile saved'); qc.invalidateQueries(['tenant-profile']) },
    onError: () => toast.error('Failed to save'),
  })
  if (isLoading) return <PageSpinner />
  return (
    <form onSubmit={handleSubmit(mut.mutate)} className="max-w-2xl space-y-5">
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm border-b border-gray-100 pb-3">Farm Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Farm Name" required>
            <input {...register('name', { required: true })} className="form-input" />
          </FormField>
          <FormField label="Owner Email">
            <input type="email" {...register('owner_email')} className="form-input" />
          </FormField>
          <FormField label="Phone">
            <input {...register('phone')} className="form-input" />
          </FormField>
          <FormField label="City">
            <input {...register('city')} className="form-input" />
          </FormField>
          <FormField label="Country">
            <input {...register('country')} className="form-input" />
          </FormField>
          <FormField label="Currency">
            <input {...register('currency')} className="form-input" placeholder="PKR" />
          </FormField>
        </div>
        <FormField label="Address">
          <textarea {...register('address')} rows={2} className="form-input" />
        </FormField>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm border-b border-gray-100 pb-3">Farm Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Gestation Period (days)">
            <input type="number" {...register('gestation_days')} className="form-input" />
          </FormField>
          <FormField label="Financial Year Start Month">
            <select {...register('financial_year_start_month')} className="form-select">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Milk Price Per Litre">
            <input type="number" step="0.01" {...register('milk_price_per_litre')} className="form-input" />
          </FormField>
          <FormField label="Timezone">
            <input {...register('timezone')} className="form-input" placeholder="Asia/Karachi" />
          </FormField>
        </div>
      </div>

      <button type="submit" disabled={mut.isPending} className="btn btn-primary">
        {mut.isPending ? <Spinner size={16} className="text-white" /> : <><Save size={16} />Save Profile</>}
      </button>
    </form>
  )
}

// ─── SMTP ─────────────────────────────────────────────────────────────────────
function SMTPTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['smtp-config'], queryFn: () => tenantAPI.getSmtp().then(r => r.data) })
  const { register, handleSubmit, getValues } = useForm({ values: data ?? { host: 'smtp.gmail.com', port: 587, use_tls: true, use_ssl: false } })

  const saveMut = useMutation({
    mutationFn: tenantAPI.saveSmtp,
    onSuccess: () => { toast.success('SMTP configuration saved'); qc.invalidateQueries(['smtp-config']) },
    onError: () => toast.error('Failed to save SMTP config'),
  })

  const testMut = useMutation({
    mutationFn: (email) => tenantAPI.testSmtp({ to_email: email }),
    onSuccess: (d) => toast.success(d.data.detail),
    onError: (e) => toast.error(e.response?.data?.detail ?? 'SMTP test failed'),
  })

  if (isLoading) return <PageSpinner />

  return (
    <div className="max-w-2xl space-y-5">
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Outgoing Email (SMTP)</h3>
            <p className="text-xs text-gray-400 mt-0.5">Used for all system alerts and notifications sent to farm users</p>
          </div>
          {data?.is_verified && (
            <span className="badge badge-green flex items-center gap-1">
              <Shield size={11} /> Verified
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit(saveMut.mutate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="SMTP Host" required>
              <input {...register('host', { required: true })} className="form-input" placeholder="smtp.gmail.com" />
            </FormField>
            <FormField label="Port" required>
              <input type="number" {...register('port', { required: true })} className="form-input" placeholder="587" />
            </FormField>
            <FormField label="Username (Email)" required>
              <input {...register('username', { required: true })} className="form-input" placeholder="your@email.com" />
            </FormField>
            <FormField label="Password" required>
              <input type="password" {...register('password')} className="form-input" placeholder="App password / SMTP password" />
            </FormField>
            <FormField label="From Email" required>
              <input type="email" {...register('from_email', { required: true })} className="form-input" />
            </FormField>
            <FormField label="From Name">
              <input {...register('from_name')} className="form-input" placeholder="Dusuq ERP" />
            </FormField>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" {...register('use_tls')} className="w-4 h-4 accent-primary-600" />
              Use TLS (recommended)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" {...register('use_ssl')} className="w-4 h-4 accent-primary-600" />
              Use SSL
            </label>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
            <p className="font-medium text-gray-700">Gmail setup:</p>
            <p>1. Enable 2-Step Verification in your Google account</p>
            <p>2. Generate an App Password (Google Account → Security → App passwords)</p>
            <p>3. Use your Gmail address as username and the App Password here</p>
            <p>4. Host: smtp.gmail.com · Port: 587 · TLS: On</p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button type="submit" disabled={saveMut.isPending} className="btn btn-primary">
              {saveMut.isPending ? <Spinner size={16} className="text-white" /> : <><Save size={16} />Save SMTP</>}
            </button>
            <button
              type="button"
              disabled={testMut.isPending}
              onClick={() => testMut.mutate(getValues('username'))}
              className="btn btn-secondary"
            >
              {testMut.isPending ? <Spinner size={16} /> : <><Send size={16} />Send Test Email</>}
            </button>
          </div>
        </form>

        {data?.last_tested_at && (
          <p className="text-xs text-gray-400 mt-3">Last tested: {new Date(data.last_tested_at).toLocaleString()}</p>
        )}
      </div>
    </div>
  )
}

// ─── Sheds & Groups ───────────────────────────────────────────────────────────
function ShedsGroupsTab() {
  const qc = useQueryClient()
  const [shedModal, setShedModal] = useState(null)
  const [groupModal, setGroupModal] = useState(null)
  const [delShed, setDelShed] = useState(null)
  const [delGroup, setDelGroup] = useState(null)

  const { data: shedsRaw }  = useQuery({ queryKey: ['sheds'],  queryFn: () => tenantAPI.listSheds().then(r => r.data) })
  const { data: groupsRaw } = useQuery({ queryKey: ['groups'], queryFn: () => tenantAPI.listGroups().then(r => r.data) })
  const sheds = Array.isArray(shedsRaw) ? shedsRaw : (shedsRaw?.results ?? [])
  const groups = Array.isArray(groupsRaw) ? groupsRaw : (groupsRaw?.results ?? [])

  const { register: rs, handleSubmit: hs, reset: resetS, setValue: setS } = useForm()
  const { register: rg, handleSubmit: hg, reset: resetG, setValue: setG } = useForm()

  const shedMut = useMutation({
    mutationFn: (d) => shedModal?.id ? tenantAPI.updateShed(shedModal.id, d) : tenantAPI.createShed(d),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries(['sheds']); setShedModal(null); resetS() },
    onError: () => toast.error('Error saving shed'),
  })
  const delShedMut = useMutation({ mutationFn: tenantAPI.deleteShed, onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['sheds']); setDelShed(null) } })

  const groupMut = useMutation({
    mutationFn: (d) => groupModal?.id ? tenantAPI.updateGroup(groupModal.id, d) : tenantAPI.createGroup(d),
    onSuccess: () => { toast.success('Saved'); qc.invalidateQueries(['groups']); setGroupModal(null); resetG() },
    onError: () => toast.error('Error saving group'),
  })
  const delGroupMut = useMutation({ mutationFn: tenantAPI.deleteGroup, onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['groups']); setDelGroup(null) } })

  const openShed = (s = null) => { setShedModal(s ?? {}); if (s) { setS('name', s.name); setS('capacity', s.capacity); setS('notes', s.notes) } else resetS() }
  const openGroup = (g = null) => { setGroupModal(g ?? {}); if (g) { setG('name', g.name); setG('description', g.description) } else resetG() }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Sheds */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">Sheds</h3>
          <button className="btn btn-primary btn-sm" onClick={() => openShed()}><Plus size={14} />Add Shed</button>
        </div>
        <div className="space-y-2">
          {sheds.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-800">{s.name}</p>
                <p className="text-xs text-gray-400">Capacity: {s.capacity} · Animals: {s.animal_count}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openShed(s)} className="p-1.5 rounded hover:bg-gray-200 text-gray-500"><Pencil size={14} /></button>
                <button onClick={() => setDelShed(s)} className="p-1.5 rounded hover:bg-red-100 text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {sheds.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No sheds added yet</p>}
        </div>
      </div>

      {/* Groups */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">Animal Groups</h3>
          <button className="btn btn-primary btn-sm" onClick={() => openGroup()}><Plus size={14} />Add Group</button>
        </div>
        <div className="space-y-2">
          {groups.map(g => (
            <div key={g.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-800">{g.name}</p>
                <p className="text-xs text-gray-400">{g.description || 'No description'}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openGroup(g)} className="p-1.5 rounded hover:bg-gray-200 text-gray-500"><Pencil size={14} /></button>
                <button onClick={() => setDelGroup(g)} className="p-1.5 rounded hover:bg-red-100 text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No groups added yet</p>}
        </div>
      </div>

      {/* Shed modal */}
      <Modal open={!!shedModal} onClose={() => { setShedModal(null); resetS() }} title={shedModal?.id ? 'Edit Shed' : 'Add Shed'} size="sm">
        <form onSubmit={hs(shedMut.mutate)} className="space-y-4">
          <FormField label="Shed Name" required><input {...rs('name', { required: true })} className="form-input" /></FormField>
          <FormField label="Capacity"><input type="number" {...rs('capacity')} className="form-input" defaultValue={0} /></FormField>
          <FormField label="Notes"><textarea {...rs('notes')} rows={2} className="form-input" /></FormField>
          <div className="flex justify-end"><button type="submit" disabled={shedMut.isPending} className="btn btn-primary">{shedMut.isPending ? <Spinner size={16} className="text-white" /> : 'Save'}</button></div>
        </form>
      </Modal>

      {/* Group modal */}
      <Modal open={!!groupModal} onClose={() => { setGroupModal(null); resetG() }} title={groupModal?.id ? 'Edit Group' : 'Add Group'} size="sm">
        <form onSubmit={hg(groupMut.mutate)} className="space-y-4">
          <FormField label="Group Name" required><input {...rg('name', { required: true })} className="form-input" /></FormField>
          <FormField label="Description"><textarea {...rg('description')} rows={2} className="form-input" /></FormField>
          <div className="flex justify-end"><button type="submit" disabled={groupMut.isPending} className="btn btn-primary">{groupMut.isPending ? <Spinner size={16} className="text-white" /> : 'Save'}</button></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!delShed} onClose={() => setDelShed(null)} onConfirm={() => delShedMut.mutate(delShed.id)} title="Delete Shed" message={`Delete shed "${delShed?.name}"? Animals in this shed will be unassigned.`} />
      <ConfirmDialog open={!!delGroup} onClose={() => setDelGroup(null)} onConfirm={() => delGroupMut.mutate(delGroup.id)} title="Delete Group" message={`Delete group "${delGroup?.name}"?`} />
    </div>
  )
}

// ─── Breeds ───────────────────────────────────────────────────────────────────
function BreedsTab() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const { data } = useQuery({ queryKey: ['breeds'], queryFn: () => tenantAPI.listBreeds().then(r => r.data.results ?? r.data) })
  const { register, handleSubmit, reset } = useForm({ defaultValues: { species: 'cattle' } })
  const mut = useMutation({ mutationFn: tenantAPI.createBreed, onSuccess: () => { toast.success('Breed added'); qc.invalidateQueries(['breeds']); reset(); setModal(false) } })
  const breeds = Array.isArray(data) ? data : []
  const cols = [
    { key: 'name', label: 'Breed Name' },
    { key: 'species', label: 'Species', render: v => <span className="capitalize badge badge-gray">{v}</span> },
    { key: 'is_global', label: 'Type', render: v => <span className={`badge ${v ? 'badge-blue' : 'badge-green'}`}>{v ? 'Global' : 'Farm'}</span> },
  ]
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Add Breed</button>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={breeds} /></div>
      <Modal open={modal} onClose={() => { setModal(false); reset() }} title="Add Breed" size="sm">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <FormField label="Breed Name" required><input {...register('name', { required: true })} className="form-input" /></FormField>
          <FormField label="Species">
            <select {...register('species')} className="form-select">
              <option value="cattle">Cattle</option>
              <option value="buffalo">Buffalo</option>
              <option value="goat">Goat</option>
            </select>
          </FormField>
          <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Add Breed'}</button></div>
        </form>
      </Modal>
    </div>
  )
}

// ─── User Management ──────────────────────────────────────────────────────────
function UsersTab() {
  const { user: currentUser } = useAuth()
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [pwModal, setPwModal] = useState(null)
  const [deactivateTarget, setDeactivateTarget] = useState(null)

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => authAPI.listUsers().then(r => r.data) })
  const { register, handleSubmit, reset } = useForm()
  const { register: rPw, handleSubmit: hsPw, reset: resetPw } = useForm()

  const createMut = useMutation({
    mutationFn: authAPI.createUser,
    onSuccess: () => { toast.success('User created'); qc.invalidateQueries(['users']); reset(); setModal(false) },
    onError: (e) => toast.error(Object.values(e.response?.data ?? {}).flat()[0] ?? 'Error'),
  })

  const deactivateMut = useMutation({
    mutationFn: (id) => authAPI.deactivateUser(id),
    onSuccess: () => { toast.success('User deactivated'); qc.invalidateQueries(['users']); setDeactivateTarget(null) },
  })

  const resetPwMut = useMutation({
    mutationFn: authAPI.resetPassword,
    onSuccess: () => { toast.success('Password reset'); setPwModal(null); resetPw() },
    onError: () => toast.error('Failed to reset password'),
  })

  const ROLE_LABELS = { owner: 'Owner', manager: 'Manager', veterinary: 'Veterinary', accountant: 'Accountant', technician: 'Technician', milker: 'Milker' }
  const ROLE_COLORS = { owner: 'badge-purple', manager: 'badge-blue', veterinary: 'badge-green', accountant: 'badge-yellow', technician: 'badge-gray', milker: 'badge-gray' }
  const users = Array.isArray(data) ? data : (data?.results ?? [])

  const cols = [
    { key: 'first_name', label: 'Name', render: (v, row) => <span className="font-medium">{row.first_name} {row.last_name}</span> },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: v => <span className={`badge ${ROLE_COLORS[v] ?? 'badge-gray'}`}>{ROLE_LABELS[v] ?? v}</span> },
    { key: 'is_active', label: 'Status', render: v => <span className={`badge ${v ? 'badge-green' : 'badge-red'}`}>{v ? 'Active' : 'Inactive'}</span> },
    { key: 'date_joined', label: 'Joined', render: v => v ? new Date(v).toLocaleDateString() : '—' },
    { key: 'actions', label: '', render: (_, row) => row.id === currentUser?.id ? null : (
      <div className="flex gap-1">
        <button onClick={() => setPwModal(row)} className="text-xs text-primary-600 hover:underline">Reset PW</button>
        {row.is_active && <button onClick={() => setDeactivateTarget(row)} className="text-xs text-red-500 hover:underline ml-2">Deactivate</button>}
      </div>
    )},
  ]

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} />Invite User</button>
      </div>
      <div className="card p-0"><DataTable columns={cols} data={users} loading={isLoading} /></div>

      {/* Create user modal */}
      <Modal open={modal} onClose={() => { setModal(false); reset() }} title="Invite User" size="md">
        <form onSubmit={handleSubmit(createMut.mutate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name" required><input {...register('first_name', { required: true })} className="form-input" /></FormField>
            <FormField label="Last Name" required><input {...register('last_name', { required: true })} className="form-input" /></FormField>
            <FormField label="Email" required><input type="email" {...register('email', { required: true })} className="form-input" /></FormField>
            <FormField label="Phone"><input {...register('phone')} className="form-input" /></FormField>
            <FormField label="Role" required>
              <select {...register('role', { required: true })} className="form-select">
                {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'owner').map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Password" required>
              <input type="password" {...register('password', { required: true, minLength: 8 })} className="form-input" placeholder="Min. 8 characters" />
            </FormField>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={createMut.isPending} className="btn btn-primary">
              {createMut.isPending ? <Spinner size={16} className="text-white" /> : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset password modal */}
      <Modal open={!!pwModal} onClose={() => { setPwModal(null); resetPw() }} title={`Reset Password — ${pwModal?.first_name}`} size="sm">
        <form onSubmit={hsPw(d => resetPwMut.mutate({ user_id: pwModal.id, new_password: d.new_password }))} className="space-y-4">
          <FormField label="New Password" required>
            <input type="password" {...rPw('new_password', { required: true, minLength: 8 })} className="form-input" placeholder="Min. 8 characters" />
          </FormField>
          <div className="flex justify-end">
            <button type="submit" disabled={resetPwMut.isPending} className="btn btn-primary">
              {resetPwMut.isPending ? <Spinner size={16} className="text-white" /> : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateMut.mutate(deactivateTarget.id)}
        title="Deactivate User"
        message={`Deactivate ${deactivateTarget?.first_name} ${deactivateTarget?.last_name}? They will lose access immediately.`}
        confirmLabel="Deactivate"
      />
    </div>
  )
}

// ─── My Account ───────────────────────────────────────────────────────────────
function MyAccountTab() {
  const { user, refreshUser } = useAuth()
  const { register: rP, handleSubmit: hsP } = useForm({ values: user ?? {} })
  const { register: rPw, handleSubmit: hsPw, reset: resetPw, setError, formState: { errors } } = useForm()

  const profileMut = useMutation({
    mutationFn: authAPI.updateMe,
    onSuccess: () => { toast.success('Profile updated'); refreshUser() },
    onError: () => toast.error('Failed to update profile'),
  })

  const pwMut = useMutation({
    mutationFn: authAPI.changePassword,
    onSuccess: () => { toast.success('Password changed'); resetPw() },
    onError: (e) => {
      const err = e.response?.data
      if (err?.old_password) setError('old_password', { message: err.old_password[0] })
      else toast.error('Failed to change password')
    },
  })

  return (
    <div className="max-w-xl space-y-5">
      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm border-b border-gray-100 pb-3">Profile</h3>
        <form onSubmit={hsP(profileMut.mutate)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="First Name"><input {...rP('first_name')} className="form-input" /></FormField>
            <FormField label="Last Name"><input {...rP('last_name')} className="form-input" /></FormField>
            <FormField label="Phone"><input {...rP('phone')} className="form-input" /></FormField>
          </div>
          <button type="submit" disabled={profileMut.isPending} className="btn btn-primary btn-sm">
            {profileMut.isPending ? <Spinner size={14} className="text-white" /> : 'Save Profile'}
          </button>
        </form>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-gray-800 text-sm border-b border-gray-100 pb-3">Change Password</h3>
        <form onSubmit={hsPw(pwMut.mutate)} className="space-y-4">
          <FormField label="Current Password" error={errors.old_password?.message}>
            <input type="password" {...rPw('old_password', { required: true })} className="form-input" />
          </FormField>
          <FormField label="New Password">
            <input type="password" {...rPw('new_password', { required: true, minLength: 8 })} className="form-input" placeholder="Min. 8 characters" />
          </FormField>
          <button type="submit" disabled={pwMut.isPending} className="btn btn-primary btn-sm">
            {pwMut.isPending ? <Spinner size={14} className="text-white" /> : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div>
      <h1 className="page-title mb-4">Settings</h1>
      <TabBar />
      <Routes>
        <Route index element={<FarmProfileTab />} />
        <Route path="smtp" element={<SMTPTab />} />
        <Route path="sheds" element={<ShedsGroupsTab />} />
        <Route path="breeds" element={<BreedsTab />} />
        <Route path="users" element={<UsersTab />} />
        <Route path="account" element={<MyAccountTab />} />
      </Routes>
    </div>
  )
}
