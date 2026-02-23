export function RoleBadge({ type, label, emoji }) {
  const styles = {
    owner: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    admin: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    paid: 'bg-green-500/20 text-green-400 border-green-500/50',
    guest: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    custom: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${styles[type] || styles.custom}`}>
      {emoji && <span>{emoji}</span>}
      {label}
    </span>
  )
}
