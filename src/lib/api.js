import { supabase } from './supabase';

// ============================================
// LEAGUES
// ============================================
export const leagues = {
  // Get all leagues for current user
  getMyLeagues: async () => {
    const { data, error } = await supabase
      .from('league_members')
      .select(`
        role,
        status,
        leagues (*)
      `)
      .eq('status', 'active');
    return { data, error };
  },

  // Get league by slug (for join page)
  getBySlug: async (slug) => {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('slug', slug)
      .single();
    return { data, error };
  },

  // Get league by invite code
  getByInviteCode: async (code) => {
    const { data, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', code)
      .single();
    return { data, error };
  },

  // Create new league
  create: async (leagueData, userId) => {
    // Create the league
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .insert({
        ...leagueData,
        invite_code: generateInviteCode(),
      })
      .select()
      .single();

    if (leagueError) return { data: null, error: leagueError };

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('league_members')
      .insert({
        league_id: league.id,
        user_id: userId,
        role: 'owner',
        status: 'active',
      });

    if (memberError) return { data: null, error: memberError };

    // Create default structures
    const { error: structureError } = await supabase
      .rpc('create_default_structures', { p_league_id: league.id });

    return { data: league, error: structureError };
  },

  // Update league settings
  update: async (leagueId, updates) => {
    const { data, error } = await supabase
      .from('leagues')
      .update(updates)
      .eq('id', leagueId)
      .select()
      .single();
    return { data, error };
  },

  // Join a league
  join: async (leagueId, userId) => {
    const { data: league } = await supabase
      .from('leagues')
      .select('auto_approve_members')
      .eq('id', leagueId)
      .single();

    const status = league?.auto_approve_members ? 'active' : 'pending';

    const { data, error } = await supabase
      .from('league_members')
      .insert({
        league_id: leagueId,
        user_id: userId,
        status,
      })
      .select()
      .single();
    return { data, error };
  },

  // Get league members
  getMembers: async (leagueId) => {
    const { data, error } = await supabase
      .from('league_members')
      .select(`
        *,
        users (id, full_name, display_name, avatar_url, email)
      `)
      .eq('league_id', leagueId)
      .order('total_points', { ascending: false });
    return { data, error };
  },

  // Update member role/status
  updateMember: async (memberId, updates) => {
    const { data, error } = await supabase
      .from('league_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();
    return { data, error };
  },
};

// ============================================
// EVENTS
// ============================================
export const events = {
  // Get upcoming events for a league
  getUpcoming: async (leagueId) => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_rsvps (
          user_id,
          status,
          plus_ones
        ),
        blind_structures (name),
        chip_structures (name)
      `)
      .eq('league_id', leagueId)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true });
    return { data, error };
  },

  // Get past events
  getPast: async (leagueId, limit = 20) => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        game_results (
          user_id,
          finish_position,
          net_result,
          users (full_name, display_name)
        )
      `)
      .eq('league_id', leagueId)
      .lt('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: false })
      .limit(limit);
    return { data, error };
  },

  // Get single event
  getById: async (eventId) => {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        event_rsvps (
          *,
          users (id, full_name, display_name, avatar_url)
        ),
        blind_structures (*,
          blind_levels (*)
        ),
        chip_structures (*,
          chip_denominations (*)
        ),
        game_sessions (*)
      `)
      .eq('id', eventId)
      .single();
    return { data, error };
  },

  // Create event
  create: async (eventData) => {
    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();
    return { data, error };
  },

  // Update event
  update: async (eventId, updates) => {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();
    return { data, error };
  },

  // Delete event
  delete: async (eventId) => {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);
    return { error };
  },

  // RSVP to event
  rsvp: async (eventId, userId, status, plusOnes = 0, note = null) => {
    const { data, error } = await supabase
      .from('event_rsvps')
      .upsert({
        event_id: eventId,
        user_id: userId,
        status,
        plus_ones: plusOnes,
        note,
      })
      .select()
      .single();
    return { data, error };
  },

  // Get RSVPs for event
  getRsvps: async (eventId) => {
    const { data, error } = await supabase
      .from('event_rsvps')
      .select(`
        *,
        users (id, full_name, display_name, avatar_url)
      `)
      .eq('event_id', eventId);
    return { data, error };
  },
};

// ============================================
// GAME SESSIONS (Live Games)
// ============================================
export const gameSessions = {
  // Start a new game session
  start: async (eventId) => {
    // Get event details
    const { data: event } = await supabase
      .from('events')
      .select(`
        *,
        blind_structures (*, blind_levels (*)),
        chip_structures (*, chip_denominations (*))
      `)
      .eq('id', eventId)
      .single();

    if (!event) return { data: null, error: new Error('Event not found') };

    // Create session
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        event_id: eventId,
        current_level: 1,
        time_remaining_seconds: event.blind_structures?.blind_levels?.[0]?.duration_minutes * 60 || 900,
        blind_structure: event.blind_structures,
        chip_structure: event.chip_structures,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    // Update event status
    if (data) {
      await supabase
        .from('events')
        .update({ status: 'in_progress' })
        .eq('id', eventId);
    }

    return { data, error };
  },

  // Get active session for event
  getByEventId: async (eventId) => {
    const { data, error } = await supabase
      .from('game_sessions')
      .select(`
        *,
        game_participants (
          *,
          users (id, full_name, display_name, avatar_url)
        )
      `)
      .eq('event_id', eventId)
      .single();
    return { data, error };
  },

  // Update timer state
  updateTimer: async (sessionId, updates) => {
    const { data, error } = await supabase
      .from('game_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();
    return { data, error };
  },

  // Add participant
  addParticipant: async (sessionId, userId) => {
    const { data, error } = await supabase
      .from('game_participants')
      .insert({
        session_id: sessionId,
        user_id: userId,
        status: 'playing',
      })
      .select()
      .single();
    return { data, error };
  },

  // Eliminate player
  eliminatePlayer: async (participantId, eliminatedBy, position) => {
    const { data, error } = await supabase
      .from('game_participants')
      .update({
        status: 'eliminated',
        eliminated_by: eliminatedBy,
        finish_position: position,
        eliminated_at: new Date().toISOString(),
        has_bounty_chip: false,
      })
      .eq('id', participantId)
      .select()
      .single();

    // Award bounty to eliminator
    if (data && eliminatedBy) {
      await supabase
        .from('game_participants')
        .update({
          bounties_held: supabase.rpc('increment_bounties'),
        })
        .eq('session_id', data.session_id)
        .eq('user_id', eliminatedBy);
    }

    return { data, error };
  },

  // Record rebuy
  rebuy: async (participantId) => {
    const { data, error } = await supabase.rpc('increment_rebuy', {
      p_participant_id: participantId,
    });
    return { data, error };
  },

  // End game session
  end: async (sessionId, eventId) => {
    const { error } = await supabase
      .from('game_sessions')
      .update({
        is_running: false,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    await supabase
      .from('events')
      .update({ status: 'completed' })
      .eq('id', eventId);

    return { error };
  },
};

// ============================================
// GAME RESULTS
// ============================================
export const gameResults = {
  // Record final results
  record: async (eventId, results) => {
    const { data, error } = await supabase
      .from('game_results')
      .insert(results.map(r => ({ ...r, event_id: eventId })))
      .select();
    return { data, error };
  },

  // Get results for an event
  getByEvent: async (eventId) => {
    const { data, error } = await supabase
      .from('game_results')
      .select(`
        *,
        users (id, full_name, display_name, avatar_url),
        eliminated_by_user:users!game_results_eliminated_by_fkey (full_name, display_name)
      `)
      .eq('event_id', eventId)
      .order('finish_position', { ascending: true });
    return { data, error };
  },

  // Get player's game history
  getByPlayer: async (userId, leagueId) => {
    const { data, error } = await supabase
      .from('game_results')
      .select(`
        *,
        events (id, title, event_date)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },
};

// ============================================
// BLIND STRUCTURES
// ============================================
export const blindStructures = {
  getAll: async (leagueId) => {
    const { data, error } = await supabase
      .from('blind_structures')
      .select(`
        *,
        blind_levels (*)
      `)
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  create: async (leagueId, name, levels) => {
    const { data: structure, error: structureError } = await supabase
      .from('blind_structures')
      .insert({ league_id: leagueId, name })
      .select()
      .single();

    if (structureError) return { data: null, error: structureError };

    const { error: levelsError } = await supabase
      .from('blind_levels')
      .insert(levels.map((l, i) => ({
        ...l,
        structure_id: structure.id,
        level_number: i + 1,
      })));

    return { data: structure, error: levelsError };
  },

  update: async (structureId, name, levels) => {
    await supabase
      .from('blind_structures')
      .update({ name })
      .eq('id', structureId);

    await supabase
      .from('blind_levels')
      .delete()
      .eq('structure_id', structureId);

    const { error } = await supabase
      .from('blind_levels')
      .insert(levels.map((l, i) => ({
        ...l,
        structure_id: structureId,
        level_number: i + 1,
      })));

    return { error };
  },

  delete: async (structureId) => {
    const { error } = await supabase
      .from('blind_structures')
      .delete()
      .eq('id', structureId);
    return { error };
  },
};

// ============================================
// CHIP STRUCTURES
// ============================================
export const chipStructures = {
  getAll: async (leagueId) => {
    const { data, error } = await supabase
      .from('chip_structures')
      .select(`
        *,
        chip_denominations (*)
      `)
      .eq('league_id', leagueId);
    return { data, error };
  },

  create: async (leagueId, name, startingChips, denominations) => {
    const { data: structure, error: structureError } = await supabase
      .from('chip_structures')
      .insert({ league_id: leagueId, name, starting_chips: startingChips })
      .select()
      .single();

    if (structureError) return { data: null, error: structureError };

    const { error } = await supabase
      .from('chip_denominations')
      .insert(denominations.map(d => ({
        ...d,
        structure_id: structure.id,
      })));

    return { data: structure, error };
  },
};

// ============================================
// TRANSACTIONS
// ============================================
export const transactions = {
  record: async (transactionData) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select()
      .single();
    return { data, error };
  },

  getByPlayer: async (userId, leagueId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  getByLeague: async (leagueId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        users (full_name, display_name),
        events (title, event_date)
      `)
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false });
    return { data, error };
  },
};

// ============================================
// MESSAGES
// ============================================
export const messages = {
  send: async (messageData) => {
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();
    return { data, error };
  },

  getForLeague: async (leagueId, userId) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey (full_name, display_name, avatar_url),
        message_reads!left (read_at)
      `)
      .eq('league_id', leagueId)
      .or(`send_to_all.eq.true,recipient_ids.cs.{${userId}}`)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  markAsRead: async (messageId, userId) => {
    const { error } = await supabase
      .from('message_reads')
      .upsert({ message_id: messageId, user_id: userId });
    return { error };
  },

  getUnreadCount: async (userId, leagueId) => {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .or(`send_to_all.eq.true,recipient_ids.cs.{${userId}}`)
      .not('id', 'in', 
        supabase
          .from('message_reads')
          .select('message_id')
          .eq('user_id', userId)
      );
    return { count, error };
  },
};

// ============================================
// STANDINGS
// ============================================
export const standings = {
  getLeaderboard: async (leagueId) => {
    const { data, error } = await supabase
      .from('league_members')
      .select(`
        *,
        users (id, full_name, display_name, avatar_url)
      `)
      .eq('league_id', leagueId)
      .eq('status', 'active')
      .order('total_points', { ascending: false });
    return { data, error };
  },

  getPlayerStats: async (userId, leagueId) => {
    const { data, error } = await supabase
      .from('league_members')
      .select('*')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .single();
    return { data, error };
  },
};

// ============================================
// HELPERS
// ============================================
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
