import { useState, useEffect, useCallback } from 'react'

const TOAST_DURATION = 5000

export function NotificationToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev.slice(-4), { ...toast, id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, TOAST_DURATION)
  }, [])

  // Expose addToast globally so WebSocket handlers can trigger it
  useEffect(() => {
    window.__pkrToast = addToast
    return () => { window.__pkrToast = null }
  }, [addToast])

  function dismiss(id) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-16 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => {
            dismiss(toast.id)
            if (toast.onClick) toast.onClick()
          }}
          className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl cursor-pointer hover:border-green-600 transition-all animate-slide-in"
        >
          <div className="flex items-start gap-2">
            <span className="text-green-400 text-sm mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{toast.title}</p>
              {toast.body && <p className="text-gray-400 text-xs mt-0.5 truncate">{toast.body}</p>}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(toast.id) }}
              className="text-gray-500 hover:text-white text-xs ml-1"
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
