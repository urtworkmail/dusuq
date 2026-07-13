import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppLayout from '@/components/layout/AppLayout'

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
import SettingsPage from '@/pages/settings/SettingsPage'
import SupportPage from '@/pages/support/SupportPage'

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireGuest({ children }) {
  const { user } = useAuth()
  if (user) return <Navigate to="/" replace />
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
        <Route path="settings/*" element={<SettingsPage />} />
        <Route path="support" element={<SupportPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
