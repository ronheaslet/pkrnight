import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = api.getToken()
    if (token) {
      api.get('/api/auth/me')
        .then((data) => setUser(data.user))
        .catch(() => api.setToken(null))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  async function login(email, password) {
    const data = await api.post('/api/auth/login', { email, password })
    api.setToken(data.token)
    setUser(data.user)
    return data
  }

  async function register(email, password, displayName, fullName) {
    const data = await api.post('/api/auth/register', { email, password, displayName, fullName })
    api.setToken(data.token)
    setUser(data.user)
    return data
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout')
    } catch {}
    api.setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
