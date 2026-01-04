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
    if (!inviteCode || !inviteCode.trim()) {
      throw new Error('Please enter an invite code')
    }

    if (!user) {
      throw new Error('You must be logged in to join a league')
    }

    // Find league by slug/invite code (case-insensitive)
    const { data: league, error: findError } = await supabase
      .from('leagues')
      .select('id, name, auto_approve_members')
      .ilike('slug', inviteCode.trim())
      .single()

    if (findError || !league) {
      throw new Error('Invalid invite code. Please check and try again.')
    }

    // Check if already a member (use maybeSingle to avoid error when no match)
    const { data: existing, error: checkError } = await supabase
      .from('league_members')
      .select('id, status')
      .eq('league_id', league.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (checkError) {
      throw new Error('Unable to verify membership. Please try again.')
    }

    if (existing) {
      if (existing.status === 'active') {
        throw new Error('You are already a member of this league')
      }
      if (existing.status === 'pending') {
        throw new Error('Your membership is pending approval')
      }
      // Reactivate membership (e.g., previously left or removed)
      const { error: updateError } = await supabase
        .from('league_members')
        .update({ status: 'active' })
        .eq('id', existing.id)

      if (updateError) {
        throw new Error('Failed to rejoin league. Please try again.')
      }
    } else {
      // Create new membership
      const { error: insertError } = await supabase
        .from('league_members')
        .insert({
          league_id: league.id,
          user_id: user.id,
          role: 'member',
          status: league.auto_approve_members ? 'active' : 'pending'
        })

      if (insertError) {
        // Check for common error scenarios
        if (insertError.code === '23505') {
          throw new Error('You are already a member of this league')
        }
        if (insertError.code === '42501') {
          throw new Error('Unable to join this league. Please contact the league admin.')
        }
        throw new Error('Failed to join league. Please try again.')
      }
    }

    await fetchLeagues()

    // Return league with pending status info
    return {
      ...league,
      isPending: !league.auto_approve_members
    }
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
