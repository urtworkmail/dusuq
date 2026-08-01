import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { onboardingAPI } from '@/api/endpoints'
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp, PartyPopper } from 'lucide-react'
import clsx from 'clsx'

export default function OnboardingChecklist() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [minimized, setMinimized] = useState(false)

  const { data } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => onboardingAPI.status().then(r => r.data),
    staleTime: 30_000,
  })

  const dismissMut = useMutation({
    mutationFn: onboardingAPI.dismissChecklist,
    onSuccess: (res) => qc.setQueryData(['onboarding-status'], res.data),
  })

  if (!data || data.checklist_dismissed || data.all_done) return null

  const { steps, completed_count, total_count } = data
  const percent = Math.round((completed_count / total_count) * 100)

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-white shadow-xl border border-gray-100 rounded-full pl-2 pr-4 py-2 hover:shadow-2xl transition-shadow"
      >
        <svg width="32" height="32" viewBox="0 0 36 36" className="flex-shrink-0">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e5e7eb" strokeWidth="4" />
          <circle
            cx="18" cy="18" r="15.5" fill="none" stroke="#16a34a" strokeWidth="4"
            strokeDasharray={`${percent * 0.974} 200`}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700">Getting Started ({completed_count}/{total_count})</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-primary-600 text-white">
        <div>
          <p className="font-semibold text-sm">Getting Started</p>
          <p className="text-xs text-green-100">{completed_count} of {total_count} complete</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="p-1 rounded hover:bg-white/20" title="Minimize">
            <ChevronDown size={16} />
          </button>
          <button onClick={() => dismissMut.mutate()} className="p-1 rounded hover:bg-white/20" title="Dismiss">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="h-1.5 bg-primary-100">
        <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>

      <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
        {steps.map(step => (
          <li key={step.key}>
            <button
              disabled={step.done || !step.action_path}
              onClick={() => step.action_path && navigate(step.action_path)}
              className={clsx(
                'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                !step.done && step.action_path && 'hover:bg-gray-50 cursor-pointer',
                (step.done || !step.action_path) && 'cursor-default'
              )}
            >
              {step.done ? (
                <CheckCircle2 size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle size={18} className="text-gray-300 flex-shrink-0 mt-0.5" />
              )}
              <span>
                <span className={clsx('block text-sm font-medium', step.done ? 'text-gray-400 line-through' : 'text-gray-800')}>
                  {step.label}
                </span>
                <span className="block text-xs text-gray-400 mt-0.5">{step.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {percent === 100 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 text-sm font-medium">
          <PartyPopper size={16} />All set — nice work!
        </div>
      )}
    </div>
  )
}
