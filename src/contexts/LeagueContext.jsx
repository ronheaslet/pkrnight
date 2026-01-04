import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const LeagueContext = createContext({})

export function LeagueProvider({ children }) {
  const { user } = useAuth()
  const [leagues, setLeagues] = useState([])
  const [currentLeague, setCurrentLeague] = useState(null)
  const [membership, setMembership] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch user's leagues
  const fetchLeagues = useCallback(async () => {
    if (!user) {
      setLeagues([])
      setCurrentLeague(null)
      setMembership(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('league_members')
      .select(`
        role,
        status,
        leagues (
          id,
          name,
          slug,
          default_buy_in,
          default_rebuy_cost,
          bounty_amount,
          max_players_per_game,
          allow_rebuys,
          auto_approve_members
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (error) {
      // Error fetching leagues - user may not have any leagues yet
      setLoading(false)
      return
    }

    const userLeagues = data.map(m => ({
      ...m.leagues,
      role: m.role
    }))

    setLeagues(userLeagues)

    // Set current league from localStorage or first league
    const savedLeagueId = localStorage.getItem('pkrnight_current_league')
    const savedLeague = userLeagues.find(l => l.id === savedLeagueId)
    
    if (savedLeague) {
      setCurrentLeague(savedLeague)
      setMembership({ role: savedLeague.role })
    } else if (userLeagues.length > 0) {
      setCurrentLeague(userLeagues[0])
      setMembership({ role: userLeagues[0].role })
      localStorage.setItem('pkrnight_current_league', userLeagues[0].id)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchLeagues()
  }, [fetchLeagues])

  // Switch active league
  const switchLeague = (leagueId) => {
    const league = leagues.find(l => l.id === leagueId)
    if (league) {
      setCurrentLeague(league)
      setMembership({ role: league.role })
      localStorage.setItem('pkrnight_current_league', leagueId)
    }
  }

  // Create a new league
  const createLeague = async (name, slug, settings = {}) => {
    const { data: league, error } = await supabase
      .from('leagues')
      .insert({
        name,
        slug,
        created_by: user.id,
        ...settings
      })
      .select()
      .single()

    if (error) throw error

    // Add creator as owner
    await supabase
      .from('league_members')
      .insert({
        league_id: league.id,
        user_id: user.id,
        role: 'owner',
        status: 'active'
      })

    await fetchLeagues()
    return league
  }

  // Join a league with invite code
  const joinLeague = async (inviteCode) => {
    // Find league by slug/invite code
    const { data: league, error: findError } = await supabase
      .from('leagues')
      .select('id, name, auto_approve_members')
      .eq('slug', inviteCode.toLowerCase())
      .single()

    if (findError || !league) {
      throw new Error('Invalid invite code')
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('league_members')
      .select('id, status')
      .eq('league_id', league.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      if (existing.status === 'active') {
        throw new Error('You are already a member of this league')
      }
      // Reactivate membership
      await supabase
        .from('league_members')
        .update({ status: 'active' })
        .eq('id', existing.id)
    } else {
      // Create new membership
      await supabase
        .from('league_members')
        .insert({
          league_id: league.id,
          user_id: user.id,
          role: 'member',
          status: league.auto_approve_members ? 'active' : 'pending'
        })
    }

    await fetchLeagues()
    return league
  }

  // Update league settings (admin only)
  const updateLeagueSettings = async (settings) => {
    if (!currentLeague || !isAdmin) {
      throw new Error('Not authorized')
    }

    const { data, error } = await supabase
      .from('leagues')
      .update(settings)
      .eq('id', currentLeague.id)
      .select()
      .single()

    if (error) throw error

    setCurrentLeague(prev => ({ ...prev, ...data }))
    return data
  }

  // Get league members
  const getMembers = async () => {
    if (!currentLeague) return []

    const { data, error } = await supabase
      .from('league_members')
      .select(`
        id,
        role,
        status,
        users (
          id,
          full_name,
          display_name,
          avatar_url
        )
      `)
      .eq('league_id', currentLeague.id)
      .eq('status', 'active')

    if (error) throw error
    return data
  }

  // Role checks
  const isOwner = membership?.role === 'owner'
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const isMember = !!membership

  const value = {
    leagues,
    currentLeague,
    membership,
    loading,
    switchLeague,
    createLeague,
    joinLeague,
    updateLeagueSettings,
    getMembers,
    refreshLeagues: fetchLeagues,
    isOwner,
    isAdmin,
    isMember
  }

  return (
    <LeagueContext.Provider value={value}>
      {children}
    </LeagueContext.Provider>
  )
}

export function useLeague() {
  const context = useContext(LeagueContext)
  if (!context) {
    throw new Error('useLeague must be used within a LeagueProvider')
  }
  return context
}

export default LeagueContext
