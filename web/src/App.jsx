import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function LoginForm({ onToggle }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">Sign In</h2>
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
      <p className="text-gray-400 text-sm text-center">
        Don't have an account?{' '}
        <button type="button" onClick={onToggle} className="text-blue-400 hover:underline">
          Register
        </button>
      </p>
    </form>
  )
}

function RegisterForm({ onToggle }) {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(email, password, displayName, fullName || undefined)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <h2 className="text-2xl font-bold text-white text-center">Register</h2>
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      <input
        type="text"
        placeholder="Display Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="w-full px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        required
      />
      <input
        type="text"
        placeholder="Full Name (optional)"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="w-full px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        required
      />
      <input
        type="password"
        placeholder="Password (min 8 characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        required
        minLength={8}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
      <p className="text-gray-400 text-sm text-center">
        Already have an account?{' '}
        <button type="button" onClick={onToggle} className="text-blue-400 hover:underline">
          Sign In
        </button>
      </p>
    </form>
  )
}

function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="w-full max-w-md space-y-6">
      <h2 className="text-2xl font-bold text-white text-center">Dashboard</h2>
      <div className="bg-gray-800 p-6 rounded-lg space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Display Name</span>
          <span className="text-white">{user.displayName}</span>
        </div>
        {user.fullName && (
          <div className="flex justify-between">
            <span className="text-gray-400">Full Name</span>
            <span className="text-white">{user.fullName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400">Email</span>
          <span className="text-white">{user.email}</span>
        </div>
      </div>
      <button
        onClick={logout}
        className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuth()
  const [isLogin, setIsLogin] = useState(true)

  if (loading) {
    return <p className="text-gray-400 text-lg">Loading...</p>
  }

  if (!user) {
    return isLogin
      ? <LoginForm onToggle={() => setIsLogin(false)} />
      : <RegisterForm onToggle={() => setIsLogin(true)} />
  }

  return <Dashboard />
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold text-white mb-8">PKR Night</h1>
        <AppContent />
      </div>
    </AuthProvider>
  )
}

export default App
