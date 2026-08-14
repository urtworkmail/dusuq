import { useQuery } from '@tanstack/react-query'
import { subscriptionAPI } from '@/api/endpoints'
import { useAuth } from '@/context/AuthContext'
import { PageSpinner } from '@/components/ui'
import {
  Clock, Mail, Phone, LogOut, CheckCircle2, Minus,
  Beef, Syringe, Heart, Droplets, DollarSign, Package, BarChart2, Users, UploadCloud,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

// The whole ERP is the same for every plan — nothing in the product actually
// gates these by tier (confirmed against the backend: Plan only stores
// price + 4 add-on flags, no per-module gating exists anywhere). Listed once
// here instead of repeated per card so a cheaper plan's card doesn't look
// broken/empty next to one with add-ons.
const CORE_MODULES = [
  { icon: Beef, label: 'Animals & herd records' },
  { icon: Syringe, label: 'Reproduction & breeding' },
  { icon: Heart, label: 'Health, vaccinations & treatments' },
  { icon: Droplets, label: 'Milk production' },
  { icon: DollarSign, label: 'Accounts & finance' },
  { icon: Package, label: 'Inventory & feed rations' },
  { icon: Users, label: 'Payroll' },
  { icon: BarChart2, label: 'Reports & analytics' },
  { icon: UploadCloud, label: 'Excel data import' },
]

// The only things that actually vary by plan — every plan is checked against
// all four so cards read as a real comparison, not just a list of extras.
const PLAN_ADDONS = [
  { key: 'has_ai_assistant', label: 'AI VetAssist' },
  { key: 'has_priority_support', label: 'Priority support' },
  { key: 'has_custom_agents', label: 'Custom AI agents' },
  { key: 'has_beta_access', label: 'Early access to new features' },
]

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
                <div className="mb-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Every plan includes the full ERP
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 bg-gray-50 rounded-xl p-4 mb-5">
                    {CORE_MODULES.map(m => (
                      <div key={m.label} className="flex items-center gap-2 text-xs text-gray-600">
                        <m.icon size={14} className="text-primary-600 flex-shrink-0" />
                        {m.label}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {plans.map(p => (
                      <div key={p.slug} className="border border-gray-100 rounded-xl p-4">
                        <p className="font-semibold text-gray-900">{p.name}</p>
                        {p.tagline && <p className="text-xs text-gray-500 mt-0.5">{p.tagline}</p>}
                        <p className="text-xl font-bold text-primary-700 mt-2">
                          {p.price_monthly_pkr != null
                            ? <>PKR {Number(p.price_monthly_pkr).toLocaleString()}<span className="text-xs font-normal text-gray-400">/mo</span></>
                            : <span className="text-sm font-medium text-gray-500">Contact us for pricing</span>}
                        </p>
                        <ul className="mt-3 space-y-1.5">
                          {PLAN_ADDONS.map(f => (
                            <li key={f.key} className={`flex items-center gap-1.5 text-xs ${p[f.key] ? 'text-gray-700' : 'text-gray-400'}`}>
                              {p[f.key]
                                ? <CheckCircle2 size={13} className="text-green-600 flex-shrink-0" />
                                : <Minus size={13} className="text-gray-300 flex-shrink-0" />}
                              {f.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
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
