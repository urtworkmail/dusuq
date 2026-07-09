import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { notifAPI } from '@/api/endpoints'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const TYPE_COLORS = {
  calving_due:       'bg-blue-100 text-blue-700',
  preg_check_due:    'bg-purple-100 text-purple-700',
  vaccination_due:   'bg-green-100 text-green-700',
  deworming_due:     'bg-yellow-100 text-yellow-700',
  treatment_followup:'bg-orange-100 text-orange-700',
  low_stock:         'bg-red-100 text-red-700',
  milk_drop:         'bg-cyan-100 text-cyan-700',
  system:            'bg-gray-100 text-gray-700',
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const qc = useQueryClient()

  const { data: countData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => notifAPI.unreadCount().then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notifAPI.list().then(r => r.data),
    enabled: open,
  })

  const markAll = useMutation({
    mutationFn: () => notifAPI.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries(['notif-count'])
      qc.invalidateQueries(['notifications'])
    },
  })

  const markOne = useMutation({
    mutationFn: (id) => notifAPI.markOneRead(id),
    onSuccess: () => {
      qc.invalidateQueries(['notif-count'])
      qc.invalidateQueries(['notifications'])
    },
  })

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const unread = countData?.unread_count ?? 0
  const notifications = notifData?.results ?? []

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-xs text-primary-600 hover:underline font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[420px]">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">
                <Bell size={28} className="mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markOne.mutate(n.id)}
                  className={clsx(
                    'flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition',
                    !n.is_read && 'bg-primary-50/40'
                  )}
                >
                  <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 mt-0.5', TYPE_COLORS[n.notification_type] ?? TYPE_COLORS.system)}>
                    {n.notification_type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
