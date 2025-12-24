export default function TabBar({ activeTab, onTabChange, isAdmin }) {
  const tabs = [
    { id: 'calendar', icon: '📅', label: 'Calendar' },
    { id: 'standings', icon: '🏆', label: 'Standings' },
    { id: 'timer', icon: '⏱️', label: 'Live' },
    { id: 'trophies', icon: '🏅', label: 'Trophies' },
    { id: 'messages', icon: '💬', label: 'Chat', badge: true },
    ...(isAdmin ? [{ id: 'admin', icon: '⚙️', label: 'Admin' }] : [])
  ]

  return (
    <nav className="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
        >
          <span className="icon relative">
            {tab.icon}
            {tab.badge && (
              <span className="absolute -top-0.5 -right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </span>
          <span className="label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
