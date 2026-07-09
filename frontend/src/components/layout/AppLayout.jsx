import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import NotificationBell from '@/components/layout/NotificationBell'
import {
  LayoutDashboard, Beef, Heart, Droplets, DollarSign,
  Package, BarChart2, Settings, LogOut, Menu, X,
  Syringe, ChevronRight
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/',            label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { to: '/animals',     label: 'Animals',       icon: Beef },
  { to: '/reproduction',label: 'Reproduction',  icon: Syringe },
  { to: '/health',      label: 'Health',        icon: Heart },
  { to: '/milk',        label: 'Milk Production',icon: Droplets },
  { to: '/accounts',    label: 'Accounts',      icon: DollarSign },
  { to: '/inventory',   label: 'Inventory',     icon: Package },
  { to: '/reports',     label: 'Reports',       icon: BarChart2 },
  { to: '/settings',    label: 'Settings',      icon: Settings },
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
            : 'text-green-100 hover:bg-white/10 hover:text-white'
        )
      }
    >
      <Icon size={18} className="flex-shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  const Sidebar = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/10">
        <span className="text-2xl">🐄</span>
        <div>
          <p className="text-white font-bold text-base leading-tight">DairyCare</p>
          <p className="text-green-200 text-xs truncate max-w-[140px]">{user?.tenant_name}</p>
        </div>
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-green-200 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(item => (
          <NavItem key={item.to} item={item} onClick={mobile ? () => setSidebarOpen(false) : undefined} />
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user?.first_name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-green-200 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-green-100 hover:bg-white/10 hover:text-white transition-all"
        >
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-primary-600 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex flex-col w-64 bg-primary-600 h-full shadow-2xl">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 lg:px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb placeholder — filled by pages via document.title */}
          <div className="flex-1 min-w-0" />

          <NotificationBell />

          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{user?.first_name}</span>
            <span className="text-gray-300">|</span>
            <span className="capitalize text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{user?.role}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
