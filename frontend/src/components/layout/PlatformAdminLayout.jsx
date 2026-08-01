import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard, Wifi, Building2, Users, Package,
  CreditCard, Receipt, Sparkles, Ticket, ScrollText,
  LineChart, LogOut, Menu, X,
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/platform-admin',               label: 'Dashboard',        icon: LayoutDashboard, exact: true },
  { to: '/platform-admin/live',          label: 'Live',             icon: Wifi },
  { to: '/platform-admin/analytics',     label: 'Analytics',        icon: LineChart },
  { to: '/platform-admin/farms',         label: 'Farms',            icon: Building2 },
  { to: '/platform-admin/users',         label: 'Users',            icon: Users },
  { to: '/platform-admin/plans',         label: 'Plans',            icon: Package },
  { to: '/platform-admin/subscriptions', label: 'Subscriptions',    icon: CreditCard },
  { to: '/platform-admin/invoices',      label: 'Invoices',         icon: Receipt },
  { to: '/platform-admin/ai-usage',      label: 'AI Usage',         icon: Sparkles },
  { to: '/platform-admin/support-tickets', label: 'Support Tickets', icon: Ticket },
  { to: '/platform-admin/audit-log',     label: 'Audit Log',        icon: ScrollText },
]

function NavItem({ item, onClick }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-white/20 text-white'
            : 'text-slate-300 hover:bg-white/10 hover:text-white'
        )
      }
    >
      <Icon size={18} className="flex-shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  )
}

export default function PlatformAdminLayout() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const Sidebar = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10">
        <span className="text-2xl">⚙️</span>
        <div>
          <p className="text-white font-bold text-base leading-tight">Dusuq Platform</p>
          <p className="text-slate-400 text-xs">SaaS Owner Admin</p>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-slate-300 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(item => (
          <NavItem key={item.to} item={item} onClick={mobile ? () => setSidebarOpen(false) : undefined} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user?.first_name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-slate-400 text-xs">Superuser</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="hidden lg:flex flex-col w-60 bg-slate-800 flex-shrink-0">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex flex-col w-64 bg-slate-800 h-full shadow-2xl">
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center gap-3 px-4 lg:px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0 lg:hidden">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <span className="font-semibold text-gray-800">Dusuq Platform</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
