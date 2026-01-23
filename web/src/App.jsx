import { useState, useEffect } from 'react'

function App() {
  const [status, setStatus] = useState('checking')
  const [timestamp, setTimestamp] = useState(null)

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    fetch(`${apiUrl}/api/health`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('connected')
          setTimestamp(data.timestamp)
        } else {
          setStatus('error')
        }
      })
      .catch(() => {
        setStatus('error')
      })
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-8">PKR Night</h1>
        {status === 'checking' && (
          <p className="text-yellow-400 text-lg">Checking API connection...</p>
        )}
        {status === 'connected' && (
          <div>
            <p className="text-green-400 text-lg font-semibold">Connected to API</p>
            <p className="text-gray-400 text-sm mt-2">
              Timestamp: {new Date(timestamp).toLocaleString()}
            </p>
          </div>
        )}
        {status === 'error' && (
          <p className="text-red-400 text-lg font-semibold">API Connection Failed</p>
        )}
      </div>
    </div>
  )
}

export default App
