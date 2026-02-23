const COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-orange-600',
  'bg-teal-600', 'bg-indigo-600', 'bg-rose-600', 'bg-cyan-600',
]

function hashName(name) {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % COLORS.length
}

export function Avatar({ name, url, size = 'md' }) {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  }
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  const color = COLORS[hashName(name)]

  if (url) {
    return <img src={url} alt={name} className={`${sizes[size]} rounded-full object-cover shrink-0`} />
  }

  return (
    <div className={`${sizes[size]} rounded-full ${color} flex items-center justify-center text-white font-semibold shrink-0 border border-white/10`}>
      {initials}
    </div>
  )
}
