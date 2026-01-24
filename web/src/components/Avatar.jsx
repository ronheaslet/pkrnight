export function Avatar({ name, url, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg' }
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  if (url) {
    return <img src={url} alt={name} className={`${sizes[size]} rounded-full object-cover`} />
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-green-600 flex items-center justify-center text-white font-medium shrink-0`}>
      {initials}
    </div>
  )
}
