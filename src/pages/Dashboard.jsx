import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'

// Tab components
import CalendarTab from '../components/calendar/CalendarTab'
import StandingsTab from '../components/standings/StandingsTab'
import LiveGameTab from '../components/timer/LiveGameTab'
import TrophiesTab from '../components/trophies/TrophiesTab'
import MessagesTab from '../components/messages/MessagesTab'
import AdminTab from '../components/admin/AdminTab'

// Common components
import Header from '../components/layout/Header'
import TabBar from '../components/layout/TabBar'
import LeagueSwitcher from '../components/common/LeagueSwitcher'

export default function Dashboard() {
  const { profile } = useAuth()
  const { currentLeague, leagues, isAdmin } = useLeague()
  
  const [activeTab, setActiveTab] = useState('calendar')
  const [showLeagueSwitcher, setShowLeagueSwitcher] = useState(false)

  // Render active tab content
  const renderTab = () => {
    switch (activeTab) {
      case 'calendar':
        return <CalendarTab />
      case 'standings':
        return <StandingsTab />
      case 'timer':
        return <LiveGameTab />
      case 'trophies':
        return <TrophiesTab />
      case 'messages':
        return <MessagesTab />
      case 'admin':
        return isAdmin ? <AdminTab /> : <CalendarTab />
      default:
        return <CalendarTab />
    }
  }

  if (!currentLeague) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🃏</div>
          <div className="text-white/60">No league selected</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <Header 
        leagueName={currentLeague.name}
        onLeagueClick={() => setShowLeagueSwitcher(true)}
        hasMultipleLeagues={leagues.length > 1}
      />

      {/* Main content */}
      <main className="main-content">
        {renderTab()}
      </main>

      {/* Tab bar */}
      <TabBar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdmin}
      />

      {/* League switcher modal */}
      {showLeagueSwitcher && (
        <LeagueSwitcher 
          onClose={() => setShowLeagueSwitcher(false)}
        />
      )}
    </div>
  )
}
