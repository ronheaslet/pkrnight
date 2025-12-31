import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useLeague } from './contexts/LeagueContext'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import JoinLeague from './pages/JoinLeague'
import CreateLeague from './pages/CreateLeague'
import Dashboard from './pages/Dashboard'
import SuperAdminPanel from './pages/SuperAdminPanel'

// Loading spinner
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🃏</div>
        <div className="text-gold font-display text-xl">PKR Night</div>
        <div className="text-white/60 text-sm mt-2">Loading...</div>
      </div>
    </div>
  )
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth()

  if (authLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Redirect if already authenticated - check for leagues
function PublicRoute({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { leagues, loading: leagueLoading } = useLeague()

  if (authLoading || (isAuthenticated && leagueLoading)) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    // If user has leagues, go to dashboard
    if (leagues.length > 0) {
      return <Navigate to="/app" replace />
    }
    // Otherwise, go to join page
    return <Navigate to="/join" replace />
  }

  return children
}

// Dashboard route - requires league
function DashboardRoute() {
  const { leagues, loading } = useLeague()
  
  if (loading) {
    return <LoadingScreen />
  }
  
  // If no leagues, redirect to join
  if (leagues.length === 0) {
    return <Navigate to="/join" replace />
  }
  
  return <Dashboard />
}

// Join route - redirect to app if user has leagues
function JoinRoute() {
  const { leagues, loading } = useLeague()
  
  if (loading) {
    return <LoadingScreen />
  }
  
  // If user already has leagues, show option to go to app
  return <JoinLeague hasLeagues={leagues.length > 0} />
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={
        <PublicRoute>
          <Landing />
        </PublicRoute>
      } />
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />

      {/* Auth required but no league required */}
      <Route path="/join" element={
        <ProtectedRoute>
          <JoinRoute />
        </ProtectedRoute>
      } />
      <Route path="/create" element={
        <ProtectedRoute>
          <CreateLeague />
        </ProtectedRoute>
      } />

      {/* Super Admin (requires auth, checks is_super_admin internally) */}
      <Route path="/super-admin" element={
        <ProtectedRoute>
          <SuperAdminPanel />
        </ProtectedRoute>
      } />

      {/* Main app (requires auth + league) */}
      <Route path="/app/*" element={
        <ProtectedRoute>
          <DashboardRoute />
        </ProtectedRoute>
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
