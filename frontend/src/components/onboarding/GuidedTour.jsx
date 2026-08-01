import { useEffect, useState } from 'react'
import Joyride, { STATUS } from 'react-joyride'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { onboardingAPI } from '@/api/endpoints'
import { Sparkles, Beef, Syringe, Droplets, BarChart2, UploadCloud, Settings, PartyPopper, X } from 'lucide-react'
import clsx from 'clsx'

const STEPS = [
  {
    target: 'body',
    placement: 'center',
    icon: Sparkles,
    title: 'Welcome to Dusuq ERP',
    content: "Let's take a 60-second look around so you know where everything lives.",
  },
  {
    target: '[data-tour="nav-animals"]',
    icon: Beef,
    title: 'Animals',
    content: 'Your herd lives here — register animals, track breed, status and lineage.',
  },
  {
    target: '[data-tour="nav-reproduction"]',
    icon: Syringe,
    title: 'Reproduction',
    content: 'Log inseminations, pregnancy checks, calvings and dry-offs.',
  },
  {
    target: '[data-tour="nav-milk"]',
    icon: Droplets,
    title: 'Milk Production',
    content: 'Record AM, midday and PM yields, and track dispatches to buyers.',
  },
  {
    target: '[data-tour="nav-reports"]',
    icon: BarChart2,
    title: 'Reports',
    content: 'Herd trends, milk forecasts and financial summaries, all in one place.',
  },
  {
    target: '[data-tour="nav-data-import"]',
    icon: UploadCloud,
    title: 'Import Data',
    content: 'Already keeping records in Excel? Bring animals, milk history and inseminations in here instead of retyping everything.',
  },
  {
    target: '[data-tour="nav-settings"]',
    icon: Settings,
    title: 'Settings',
    content: 'Finish your farm profile and invite your team from here.',
  },
  {
    target: 'body',
    placement: 'center',
    icon: PartyPopper,
    title: "You're all set!",
    content: 'Keep an eye on the checklist in the bottom-right corner to finish setting up your farm.',
  },
]

const joyrideSteps = STEPS.map(({ icon, title, content, ...rest }) => ({
  ...rest,
  title,
  content,
  icon,
  disableBeacon: true,
}))

function TourTooltip({ index, isLastStep, size, step, backProps, primaryProps, skipProps, tooltipProps }) {
  const Icon = step.icon
  const isBookend = index === 0 || isLastStep

  return (
    <div {...tooltipProps} className="relative w-[22rem] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
      {/* Reuses skipProps (not closeProps) so the X reliably ends the tour and
          marks it complete — react-joyride's close action only dismisses the
          current tooltip, it doesn't transition tour status to SKIPPED. */}
      <button {...skipProps} className="absolute top-3 right-3 p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition">
        <X size={16} />
      </button>

      {isBookend ? (
        <div className="px-6 pt-7 pb-2 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-4 shadow-lg shadow-primary-600/20">
            <Icon size={26} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{step.title}</h3>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">{step.content}</p>
        </div>
      ) : (
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Icon size={17} className="text-primary-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-[15px]">{step.title}</h3>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{step.content}</p>
        </div>
      )}

      <div className="flex items-center justify-between px-5 pb-4 pt-3 mt-1">
        <div className="flex gap-1">
          {Array.from({ length: size }, (_, i) => (
            <span
              key={i}
              className={clsx(
                'h-1.5 rounded-full transition-all duration-300',
                i === index ? 'w-5 bg-primary-600' : 'w-1.5 bg-gray-200'
              )}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {!isLastStep && (
            <button {...skipProps} className="text-xs font-medium text-gray-400 hover:text-gray-600 px-1">
              Skip tour
            </button>
          )}
          {index > 0 && (
            <button {...backProps} className="btn btn-secondary btn-sm">Back</button>
          )}
          <button {...primaryProps} className="btn btn-primary btn-sm">
            {isLastStep ? "Let's go!" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GuidedTour() {
  const qc = useQueryClient()
  const [run, setRun] = useState(false)

  const { data } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => onboardingAPI.status().then(r => r.data),
    staleTime: 30_000,
  })

  const completeMut = useMutation({
    mutationFn: onboardingAPI.markTourComplete,
    onSuccess: (res) => qc.setQueryData(['onboarding-status'], res.data),
  })

  useEffect(() => {
    if (data && !data.tour_completed) {
      // Let the sidebar/layout finish its first paint before Joyride measures targets.
      const t = setTimeout(() => setRun(true), 600)
      return () => clearTimeout(t)
    }
  }, [data])

  function handleCallback(callbackData) {
    const { status } = callbackData
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false)
      completeMut.mutate()
    }
  }

  if (!data || data.tour_completed) return null

  return (
    <Joyride
      steps={joyrideSteps}
      run={run}
      continuous
      showSkipButton
      scrollToFirstStep
      disableScrollParentFix
      spotlightPadding={6}
      tooltipComponent={TourTooltip}
      callback={handleCallback}
      styles={{
        options: {
          arrowColor: '#fff',
          overlayColor: 'rgba(15, 23, 42, 0.55)',
          zIndex: 10000,
        },
        spotlight: {
          borderRadius: 14,
        },
      }}
    />
  )
}
