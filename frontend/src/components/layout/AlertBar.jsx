import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifAPI } from '@/api/endpoints'
import { AlertTriangle, X, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

// One color per notification_type, matching NotificationBell's badge palette
// but as a solid background since this bar is meant to be seen, not scanned.
const TYPE_STYLE = {
  insemination_due:  'bg-purple-600',
  calving_due:        'bg-blue-600',
  preg_check_due:     'bg-purple-600',
  dry_off_due:         'bg-blue-600',
  close_up_due:        'bg-blue-600',
  vaccination_due:      'bg-green-600',
  deworming_due:         'bg-yellow-600',
  treatment_followup:    'bg-orange-600',
  low_stock:               'bg-red-600',
  milk_drop:                'bg-cyan-600',
  system:                    'bg-gray-700',
}

export default function AlertBar() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [cursor, setCursor] = useState(0)
  const [dismissedAt, setDismissedAt] = useState(0)

  const { data: notifData } = useQuery({
    queryKey: ['notifications', 'unread-bar'],
    queryFn: () => notifAPI.list({ unread_only: true }).then(r => r.data),
    refetchInterval: 60000,
  })

  const markOne = useMutation({
    mutationFn: (id) => notifAPI.markOneRead(id),
    onSuccess: () => {
      qc.invalidateQueries(['notif-count'])
      qc.invalidateQueries(['notifications'])
    },
  })

  const list = notifData?.results ?? []

  // Cycle through multiple active alerts so the bar doesn't just sit on one.
  useEffect(() => {
    if (list.length <= 1) return
    const t = setInterval(() => setCursor(c => (c + 1) % list.length), 6000)
    return () => clearInterval(t)
  }, [list.length])

  // Dismissing hides the bar until a *new* alert arrives (unread count grows
  // past what was on screen when dismissed) — reading elsewhere (e.g. the
  // bell dropdown) shrinking the count keeps it hidden, a fresh alert
  // pushes the count back up and brings it back.
  if (list.length === 0 || list.length <= dismissedAt) return null

  const current = list[cursor % list.length]
  const colorClass = TYPE_STYLE[current.notification_type] ?? TYPE_STYLE.system

  function handleClick() {
    markOne.mutate(current.id)
    if (current.link) navigate(current.link)
  }

  return (
    <div className={clsx('flex items-center gap-3 px-4 py-2 text-white text-sm flex-shrink-0 transition-colors duration-500', colorClass)}>
      <AlertTriangle size={15} className="flex-shrink-0" />
      <button onClick={handleClick} className="flex-1 min-w-0 flex items-center gap-2 text-left group">
        <span className="font-semibold truncate group-hover:underline">{current.title}</span>
        <span className="hidden sm:inline text-white/80 truncate">— {current.message}</span>
        <ChevronRight size={14} className="flex-shrink-0 opacity-70 group-hover:translate-x-0.5 transition-transform" />
      </button>
      {list.length > 1 && (
        <span className="flex-shrink-0 text-xs bg-black/20 rounded-full px-2 py-0.5 tabular-nums">
          {(cursor % list.length) + 1}/{list.length}
        </span>
      )}
      <button onClick={() => setDismissedAt(list.length)} className="flex-shrink-0 p-1 rounded hover:bg-black/20 transition" title="Dismiss">
        <X size={14} />
      </button>
    </div>
  )
}
