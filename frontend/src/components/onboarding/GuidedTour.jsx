import { useEffect, useState } from 'react'
import Joyride, { STATUS } from 'react-joyride'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { onboardingAPI } from '@/api/endpoints'

const STEPS = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to Dusuq ERP 👋',
    content: "Let's take a 60-second look around so you know where everything lives.",
  },
  {
    target: '[data-tour="nav-animals"]',
    title: 'Animals',
    content: 'Your herd lives here — register animals, track breed, status and lineage.',
  },
  {
    target: '[data-tour="nav-reproduction"]',
    title: 'Reproduction',
    content: 'Log inseminations, pregnancy checks, calvings and dry-offs.',
  },
  {
    target: '[data-tour="nav-milk"]',
    title: 'Milk Production',
    content: 'Record daily AM/PM yields and track dispatches to buyers.',
  },
  {
    target: '[data-tour="nav-reports"]',
    title: 'Reports',
    content: 'Herd trends, milk forecasts and financial summaries, all in one place.',
  },
  {
    target: '[data-tour="nav-data-import"]',
    title: 'Import Data',
    content: 'Already keeping records in Excel? Bring them in here instead of retyping everything.',
  },
  {
    target: '[data-tour="nav-settings"]',
    title: 'Settings',
    content: 'Finish your farm profile and invite your team from here.',
  },
  {
    target: 'body',
    placement: 'center',
    title: "You're all set!",
    content: 'Keep an eye on the checklist in the bottom-right corner to finish setting up your farm.',
  },
]

const joyrideSteps = STEPS.map(({ title, content, ...rest }) => ({
  ...rest,
  content: (
    <div>
      <p className="font-semibold text-gray-900 mb-1">{title}</p>
      <p className="text-sm text-gray-600">{content}</p>
    </div>
  ),
  disableBeacon: true,
}))

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
      showProgress
      scrollToFirstStep
      callback={handleCallback}
      locale={{ last: 'Finish', skip: 'Skip tour' }}
      styles={{
        options: {
          primaryColor: '#16a34a',
          zIndex: 10000,
        },
      }}
    />
  )
}
