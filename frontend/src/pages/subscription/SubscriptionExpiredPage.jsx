import { useQuery } from '@tanstack/react-query'
import { subscriptionAPI } from '@/api/endpoints'
import { useAuth } from '@/context/AuthContext'
import { PageSpinner } from '@/components/ui'
import { Clock, Mail, Phone, LogOut, CheckCircle2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function SubscriptionExpiredPage() {
  const { user, logout } = useAuth()

  const { data: sub, isLoading } = useQuery({
    queryKey: ['subscription-me'],
    queryFn: () => subscriptionAPI.me().then(r => r.data).catch(() => null),
  })
  const { data: plansData } = useQuery({
    queryKey: ['public-plans'],
    queryFn: () => subscriptionAPI.plans().then(r => r.data).catch(() => []),
  })
  const plans = Array.isArray(plansData) ? plansData : (plansData?.results ?? [])

  const endedOn = sub?.trial_end ?? sub?.current_period_end

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-6">
          <span className="text-4xl">🐄</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Dusuq ERP</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Clock size={22} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {user?.tenant_name ? `${user.tenant_name}'s ` : 'Your '}trial or subscription has ended
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isLoading
                  ? 'Checking your account status…'
                  : endedOn
                    ? `Access ended on ${format(parseISO(endedOn), 'dd MMM yyyy')}. Choose a plan below to pick up right where you left off — nothing you've entered has been lost.`
                    : "Choose a plan below to pick up right where you left off — nothing you've entered has been lost."}
              </p>
            </div>
          </div>

          {isLoading ? (
            <PageSpinner />
          ) : (
            <>
              {plans.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {plans.map(p => (
                    <div key={p.slug} className="border border-gray-100 rounded-xl p-4">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      {p.tagline && <p className="text-xs text-gray-500 mt-0.5">{p.tagline}</p>}
                      <p className="text-xl font-bold text-primary-700 mt-2">
                        PKR {Number(p.price_monthly_pkr).toLocaleString()}
                        <span className="text-xs font-normal text-gray-400">/mo</span>
                      </p>
                      <ul className="mt-3 space-y-1">
                        {p.has_ai_assistant && <PlanFeature label="AI VetAssist" />}
                        {p.has_priority_support && <PlanFeature label="Priority support" />}
                        {p.has_custom_agents && <PlanFeature label="Custom agents" />}
                        {p.has_beta_access && <PlanFeature label="Early access to new features" />}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-primary-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-700">
                  To activate a plan, get in touch with us — we'll get your farm back up in minutes.
                </p>
                <div className="flex flex-wrap gap-4 mt-3">
                  <a href="mailto:hello@dusuq.com" className="inline-flex items-center gap-1.5 text-primary-700 font-medium text-sm hover:underline">
                    <Mail size={15} />hello@dusuq.com
                  </a>
                  <a href="tel:+923316560344" className="inline-flex items-center gap-1.5 text-primary-700 font-medium text-sm hover:underline">
                    <Phone size={15} />+92 331 6560344
                  </a>
                </div>
              </div>
            </>
          )}

          <button onClick={logout} className="btn btn-secondary w-full">
            <LogOut size={16} />Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

function PlanFeature({ label }) {
  return (
    <li className="flex items-center gap-1.5 text-xs text-gray-600">
      <CheckCircle2 size={13} className="text-green-600 flex-shrink-0" />{label}
    </li>
  )
}
