import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
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
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pkr-green-800 to-pkr-green-950 flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-display font-bold text-pkr-gold-400 mb-8">PKR Night</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 bg-pkr-green-800/50 border border-pkr-green-700/50 rounded-xl p-6">
        <h2 className="text-2xl font-display font-bold text-white text-center">Create Account</h2>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <input
          type="text"
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full px-4 py-2 bg-pkr-green-900 text-white rounded-lg border border-pkr-green-700/50 focus:border-pkr-gold-500 focus:outline-none placeholder-pkr-gold-300/30"
          required
        />
        <input
          type="text"
          placeholder="Full Name (optional)"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-4 py-2 bg-pkr-green-900 text-white rounded-lg border border-pkr-green-700/50 focus:border-pkr-gold-500 focus:outline-none placeholder-pkr-gold-300/30"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 bg-pkr-green-900 text-white rounded-lg border border-pkr-green-700/50 focus:border-pkr-gold-500 focus:outline-none placeholder-pkr-gold-300/30"
          required
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 bg-pkr-green-900 text-white rounded-lg border border-pkr-green-700/50 focus:border-pkr-gold-500 focus:outline-none placeholder-pkr-gold-300/30"
          required
          minLength={8}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-pkr-gold-500 text-pkr-green-900 rounded-lg hover:bg-pkr-gold-400 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
        <p className="text-pkr-gold-300/50 text-sm text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-pkr-gold-400 hover:underline">Sign In</Link>
        </p>
      </form>
    </div>
  )
}
