import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import { supabase } from '../lib/supabase'

// Tab components
import CalendarTab from '../components/calendar/CalendarTab'
import StandingsTab from '../components/standings/StandingsTab'
import LiveGameTab from '../components/timer/LiveGameTab'
import TrophiesTab from '../components/trophies/TrophiesTab'
import MessagesTab from '../components/messages/MessagesTab'
import AdminTab from '../components/admin/AdminTab'
import DealerScreen from '../components/timer/DealerScreen'

// Common components
import Header from '../components/layout/Header'
import TabBar from '../components/layout/TabBar'
import LeagueSwitcher from '../components/common/LeagueSwitcher'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const { currentLeague, leagues, isAdmin } = useLeague()
  
  const [activeTab, setActiveTab] = useState('calendar')
  const [showLeagueSwitcher, setShowLeagueSwitcher] = useState(false)
  const [viewMode, setViewMode] = useState('player') // 'player', 'dealer', 'admin'
  const [userRoles, setUserRoles] = useState([])

  // Fetch user's roles for this league
  useEffect(() => {
    if (currentLeague && user) {
      fetchUserRoles()
    }
  }, [currentLeague, user])

  // Set default view mode based on role
  useEffect(() => {
    if (isAdmin) {
      setViewMode('admin')
    } else if (userRoles.some(r => r.slug === 'dealer' || r.can_pause_timer)) {
      setViewMode('dealer')
    } else {
      setViewMode('player')
    }
  }, [isAdmin, userRoles])

  const fetchUserRoles = async () => {
    // Get system role from league_members
    const { data: membership } = await supabase
      .from('league_members')
      .select('role')
      .eq('league_id', currentLeague.id)
      .eq('user_id', user.id)
      .single()

    // Get custom role assignments
    const { data: assignments } = await supabase
      .from('member_role_assignments')
      .select(`
        role_id,
        league_roles (
          id, name, slug, emoji, is_system_role,
          can_pause_timer, can_start_game, can_manage_rebuys,
          can_eliminate_players, can_manage_money
        )
      `)
      .eq('league_id', currentLeague.id)
      .eq('user_id', user.id)

    const roles = []
    
    // Add system role
    if (membership?.role === 'owner') {
      roles.push({ slug: 'owner', name: 'Owner', emoji: '👑', is_system_role: true, can_pause_timer: true })
    } else if (membership?.role === 'admin') {
      roles.push({ slug: 'admin', name: 'Admin', emoji: '⭐', is_system_role: true, can_pause_timer: true })
    }

    // Add custom roles
    if (assignments) {
      assignments.forEach(a => {
        if (a.league_roles) {
          roles.push(a.league_roles)
        }
      })
    }

    setUserRoles(roles)
  }

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
    // If switching to admin mode, go to admin tab
    if (mode === 'admin' && activeTab !== 'admin') {
      // Keep current tab, admin features will show in context
    }
  }

  // Check if user can perform actions based on roles
  const canPauseTimer = userRoles.some(r => r.can_pause_timer) || isAdmin

  // Render active tab content
  const renderTab = () => {
    // In dealer mode, show dealer screen
    if (viewMode === 'dealer') {
      return <DealerScreen canPauseTimer={canPauseTimer} />
    }

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
        return (isAdmin || viewMode === 'admin') ? <AdminTab /> : <CalendarTab />
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

  // Dealer mode - full screen, no tab bar
  if (viewMode === 'dealer') {
    return (
      <div className="min-h-screen">
        <Header 
          leagueName={currentLeague.name}
          onLeagueClick={() => setShowLeagueSwitcher(true)}
          hasMultipleLeagues={leagues.length > 1}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          userRoles={userRoles}
        />
        <DealerScreen canPauseTimer={canPauseTimer} />
        
        {showLeagueSwitcher && (
          <LeagueSwitcher onClose={() => setShowLeagueSwitcher(false)} />
        )}
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
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        userRoles={userRoles}
      />

      {/* Main content */}
      <main className="main-content">
        {renderTab()}
      </main>

      {/* Tab bar - hide admin tab in player mode */}
      <TabBar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdmin && viewMode === 'admin'}
      />

      {/* League switcher modal */}
      {showLeagueSwitcher && (
        <LeagueSwitcher onClose={() => setShowLeagueSwitcher(false)} />
      )}
    </div>
  )
}
