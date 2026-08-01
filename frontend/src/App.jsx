import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import PlatformAdminLayout from '@/components/layout/PlatformAdminLayout'

// Auth pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

// Feature pages
import DashboardPage from '@/pages/dashboard/DashboardPage'
import AnimalsPage from '@/pages/animals/AnimalsPage'
import AnimalDetailPage from '@/pages/animals/AnimalDetailPage'
import ReproductionPage from '@/pages/reproduction/ReproductionPage'
import HealthPage from '@/pages/health/HealthPage'
import MilkPage from '@/pages/milk/MilkPage'
import AccountsPage from '@/pages/accounts/AccountsPage'
import InventoryPage from '@/pages/inventory/InventoryPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import VetAssistPage from '@/pages/vetassist/VetAssistPage'
import PayrollPage from '@/pages/payroll/PayrollPage'
import ImportPage from '@/pages/data-import/ImportPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import SupportPage from '@/pages/support/SupportPage'

// Platform admin pages
import PlatformDashboardPage from '@/pages/platform-admin/DashboardPage'
import PlatformLivePage from '@/pages/platform-admin/LivePage'
import PlatformAnalyticsPage from '@/pages/platform-admin/AnalyticsPage'
import FarmsPage from '@/pages/platform-admin/FarmsPage'
import FarmDetailPage from '@/pages/platform-admin/FarmDetailPage'
import UsersPage from '@/pages/platform-admin/UsersPage'
import PlansPage from '@/pages/platform-admin/PlansPage'
import SubscriptionsPage from '@/pages/platform-admin/SubscriptionsPage'
import InvoicesPage from '@/pages/platform-admin/InvoicesPage'
import AIUsagePage from '@/pages/platform-admin/AIUsagePage'
import SupportTicketsPage from '@/pages/platform-admin/SupportTicketsPage'
import AuditLogPage from '@/pages/platform-admin/AuditLogPage'

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  // Platform admin accounts have no farm/tenant, so the regular tenant-scoped
  // app shell has nothing to show them (and its API calls would 403 — see
  // TenantMiddleware, which requires a tenant for any non-exempt path).
  if (user.is_superuser) return <Navigate to="/platform-admin" replace />
  return children
}

function RequireGuest({ children }) {
  const { user } = useAuth()
  // Platform admin accounts have no farm/tenant — send them straight to
  // their own dashboard instead of the regular tenant-scoped app root.
  if (user) return <Navigate to={user.is_superuser ? '/platform-admin' : '/'} replace />
  return children
}

function RequirePlatformAdmin({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  // Client-side check is UX only — every platform-admin API call enforces
  // IsPlatformAdmin (is_superuser) server-side regardless of this.
  if (!user.is_superuser) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
      <Route path="/register" element={<RequireGuest><RegisterPage /></RequireGuest>} />

      {/* Protected — all inside AppLayout */}
      <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="animals" element={<AnimalsPage />} />
        <Route path="animals/:id" element={<AnimalDetailPage />} />
        <Route path="reproduction/*" element={<ReproductionPage />} />
        <Route path="health/*" element={<HealthPage />} />
        <Route path="milk/*" element={<MilkPage />} />
        <Route path="accounts/*" element={<AccountsPage />} />
        <Route path="inventory/*" element={<InventoryPage />} />
        <Route path="reports/*" element={<ReportsPage />} />
        <Route path="vetassist/*" element={<VetAssistPage />} />
        <Route path="payroll/*" element={<PayrollPage />} />
        <Route path="data-import" element={<ImportPage />} />
        <Route path="settings/*" element={<SettingsPage />} />
        <Route path="support" element={<SupportPage />} />
      </Route>

      {/* Platform admin — separate shell, no tenant context, superuser-only */}
      <Route path="/platform-admin" element={<RequirePlatformAdmin><PlatformAdminLayout /></RequirePlatformAdmin>}>
        <Route index element={<PlatformDashboardPage />} />
        <Route path="live" element={<PlatformLivePage />} />
        <Route path="analytics" element={<PlatformAnalyticsPage />} />
        <Route path="farms" element={<FarmsPage />} />
        <Route path="farms/:id" element={<FarmDetailPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="ai-usage" element={<AIUsagePage />} />
        <Route path="support-tickets" element={<SupportTicketsPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
