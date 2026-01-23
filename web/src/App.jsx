import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Leagues } from './pages/Leagues'
import { LeagueDashboard } from './pages/LeagueDashboard'
import { Members } from './pages/Members'
import { EventDetail } from './pages/EventDetail'
import { CreateEvent } from './pages/CreateEvent'
import { Settings } from './pages/Settings'
import { Standings } from './pages/Standings'
import { AdminDashboard } from './pages/AdminDashboard'
import { Game } from './pages/Game'
import { DealerDisplay } from './pages/DealerDisplay'
import { Spinner } from './components/Spinner'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Protected routes with layout */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Leagues />} />
            <Route path="/leagues/:leagueId" element={<LeagueDashboard />} />
            <Route path="/leagues/:leagueId/members" element={<Members />} />
            <Route path="/leagues/:leagueId/events/new" element={<CreateEvent />} />
            <Route path="/leagues/:leagueId/events/:eventId" element={<EventDetail />} />
            <Route path="/leagues/:leagueId/settings" element={<Settings />} />
            <Route path="/leagues/:leagueId/standings" element={<Standings />} />
            <Route path="/leagues/:leagueId/admin" element={<AdminDashboard />} />
          </Route>

          {/* Game page (full screen, no layout) */}
          <Route path="/games/:sessionId" element={<ProtectedRoute><Game /></ProtectedRoute>} />
          <Route path="/games/:sessionId/display" element={<ProtectedRoute><DealerDisplay /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
