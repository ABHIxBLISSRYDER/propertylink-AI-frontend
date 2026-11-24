import { Navigate, Route, Routes } from 'react-router-dom'

import ProtectedRoute from './routes/ProtectedRoute'
import DashboardLayout from './components/layout/DashboardLayout'

import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Workspaces from './pages/workspaces/Workspaces'
import Properties from './pages/properties/Properties'
import Campaigns from './pages/campaigns/Campaigns'
import Prospects from './pages/prospects/Prospects'
import Backlinks from './pages/backlinks/Backlinks'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workspaces" element={<Workspaces />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/prospects" element={<Prospects />} />
          <Route path="/backlinks" element={<Backlinks />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App