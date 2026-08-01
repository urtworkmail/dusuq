import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { platformAdminAPI } from '@/api/endpoints'
import { Modal, FormField, Spinner, PageSpinner } from '@/components/ui'
import { Pencil, Check, X as XIcon } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

function PlanCard({ plan, onEdit }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{plan.name}</h3>
          <p className="text-xs text-gray-400">{plan.slug}</p>
        </div>
        <button onClick={() => onEdit(plan)} className="text-gray-400 hover:text-primary-600"><Pencil size={16} /></button>
      </div>
      <p className="text-sm text-gray-500 mb-3">{plan.tagline}</p>
      <p className="text-2xl font-bold text-primary-700 mb-3">
        {plan.price_monthly_pkr != null ? `PKR ${Number(plan.price_monthly_pkr).toLocaleString()}` : 'Contact Sales'}
        {plan.price_monthly_pkr != null && <span className="text-sm font-normal text-gray-400">/mo</span>}
      </p>
      <div className="space-y-1 text-sm">
        {[
          ['AI Assistant', plan.has_ai_assistant],
          ['Priority Support', plan.has_priority_support],
          ['Custom Agents', plan.has_custom_agents],
          ['Beta Access', plan.has_beta_access],
        ].map(([label, val]) => (
          <div key={label} className="flex items-center gap-2">
            {val ? <Check size={14} className="text-green-600" /> : <XIcon size={14} className="text-gray-300" />}
            <span className={val ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
        <span>{plan.is_active ? 'Selectable by new subscribers' : 'Hidden from sign-up'}</span>
        <span className={`badge ${plan.is_active ? 'badge-green' : 'badge-gray'}`}>{plan.is_active ? 'Active' : 'Inactive'}</span>
      </div>
    </div>
  )
}

export default function PlansPage() {
  const qc = useQueryClient()
  const [editTarget, setEditTarget] = useState(null)
  const { data, isLoading } = useQuery({ queryKey: ['platform-admin-plans'], queryFn: () => platformAdminAPI.listPlans().then(r => r.data) })
  const { register, handleSubmit, reset } = useForm()
  const mut = useMutation({
    mutationFn: (d) => platformAdminAPI.updatePlan(editTarget.id, d),
    onSuccess: () => { toast.success('Plan updated'); qc.invalidateQueries(['platform-admin-plans']); setEditTarget(null) },
    onError: (e) => toast.error(Object.values(e.response?.data ?? {}).flat()[0] ?? 'Error'),
  })
  const openEdit = (plan) => {
    setEditTarget(plan)
    reset({
      name: plan.name, tagline: plan.tagline, price_monthly_pkr: plan.price_monthly_pkr ?? '',
      has_ai_assistant: plan.has_ai_assistant, has_priority_support: plan.has_priority_support,
      has_custom_agents: plan.has_custom_agents, has_beta_access: plan.has_beta_access,
      is_active: plan.is_active,
    })
  }
  if (isLoading) return <PageSpinner />
  return (
    <div className="space-y-4">
      <h1 className="page-title">Plans</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(data ?? []).map(plan => <PlanCard key={plan.id} plan={plan} onEdit={openEdit} />)}
      </div>
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit ${editTarget?.name ?? ''}`} size="md">
        <form onSubmit={handleSubmit(mut.mutate)} className="space-y-4">
          <FormField label="Name" required><input {...register('name', { required: true })} className="form-input" /></FormField>
          <FormField label="Tagline"><input {...register('tagline')} className="form-input" /></FormField>
          <FormField label="Monthly Price (PKR)">
            <input type="number" step="0.01" {...register('price_monthly_pkr')} className="form-input" placeholder="Leave blank for Contact Sales" />
            <p className="text-xs text-gray-400 mt-1">Leave blank to show "Contact Sales" instead of a price.</p>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('has_ai_assistant')} />AI Assistant</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('has_priority_support')} />Priority Support</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('has_custom_agents')} />Custom Agents</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('has_beta_access')} />Beta Access</label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('is_active')} />Selectable by new subscribers</label>
          <div className="flex justify-end"><button type="submit" disabled={mut.isPending} className="btn btn-primary">{mut.isPending ? <Spinner size={16} className="text-white" /> : 'Save Plan'}</button></div>
        </form>
      </Modal>
    </div>
  )
}
