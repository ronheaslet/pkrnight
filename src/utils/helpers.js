/**
 * Shared utility functions for PKR Night
 */

export const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export const getOrdinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export const formatMoney = (amount) => {
  const num = parseFloat(amount) || 0
  if (num >= 0) return `$${num.toLocaleString()}`
  return `-$${Math.abs(num).toLocaleString()}`
}

export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date()
  if (dateStr.length === 10) {
    return new Date(dateStr + 'T00:00')
  }
  return new Date(dateStr)
}

export const timeAgo = (timestamp) => {
  const now = new Date()
  const date = new Date(timestamp)
  const seconds = Math.floor((now - date) / 1000)
  
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}
