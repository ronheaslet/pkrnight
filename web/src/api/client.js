const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const TOKEN_KEY = 'pkr_token'

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message)
    this.code = code
    this.status = status
  }
}

class ApiClient {
  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers }
    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    })

    const data = await res.json()

    if (!data.success) {
      throw new ApiError(
        data.error?.message || 'Request failed',
        data.error?.code || 'UNKNOWN',
        res.status
      )
    }

    return data.data
  }

  get(endpoint) {
    return this.request(endpoint)
  }

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) })
  }

  patch(endpoint, body) {
    return this.request(endpoint, { method: 'PATCH', body: JSON.stringify(body) })
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient()
