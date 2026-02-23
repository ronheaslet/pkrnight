#!/usr/bin/env node
/**
 * PKR Night Data Migration Script
 *
 * Migrates data from Supabase to Railway PostgreSQL.
 * Handles schema differences between the two databases.
 *
 * USAGE:
 *   SOURCE_DATABASE_URL="postgres://..." TARGET_DATABASE_URL="postgres://..." node scripts/migrate-data.js
 *
 * OPTIONS:
 *   --dry-run    Print what would be migrated without executing
 *   --verbose    Print detailed progress
 */

import pg from 'pg'
import crypto from 'crypto'

const DRY_RUN = process.argv.includes('--dry-run')
const VERBOSE = process.argv.includes('--verbose')

const sourceUrl = process.env.SOURCE_DATABASE_URL
const targetUrl = process.env.TARGET_DATABASE_URL

if (!sourceUrl || !targetUrl) {
  console.error('ERROR: Both SOURCE_DATABASE_URL and TARGET_DATABASE_URL are required.')
  process.exit(1)
}

const sourcePool = new pg.Pool({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } })
const targetPool = new pg.Pool({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } })

function log(msg) { console.log(`[MIGRATE] ${msg}`) }
function verbose(msg) { if (VERBOSE) console.log(`  -> ${msg}`) }

// Map Supabase role booleans to permission strings
function buildPermissions(role) {
  const perms = []
  if (role.can_pause_timer) perms.push('pause_timer')
  if (role.can_start_game) perms.push('start_game')
  if (role.can_manage_rebuys) perms.push('rebuy_player')
  if (role.can_eliminate_players) perms.push('eliminate_player')
  if (role.can_manage_money) perms.push('manage_money')
  if (role.can_edit_settings) perms.push('edit_settings')
  if (role.can_manage_members) perms.push('manage_members')
  if (role.can_send_announcements) perms.push('send_announcements')
  return JSON.stringify(perms)
}

async function migrate() {
  log(`Migration mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`)
  log('Connecting to databases...')

  try {
    await sourcePool.query('SELECT 1')
    log('Source database (Supabase) connected.')
  } catch (err) {
    console.error('ERROR: Cannot connect to source:', err.message)
    process.exit(1)
  }

  try {
    await targetPool.query('SELECT 1')
    log('Target database (Railway) connected.')
  } catch (err) {
    console.error('ERROR: Cannot connect to target:', err.message)
    process.exit(1)
  }

  const client = await targetPool.connect()
  const summary = {}

  try {
    if (!DRY_RUN) await client.query('BEGIN')

    // 1. Users (from auth.users + public.users)
    log('Migrating users...')
    const { rows: authUsers } = await sourcePool.query('SELECT id, email, encrypted_password, email_confirmed_at, created_at, updated_at FROM auth.users ORDER BY created_at')
    const { rows: publicUsers } = await sourcePool.query('SELECT * FROM users ORDER BY created_at')

    summary.users = authUsers.length
    log(`  Found ${authUsers.length} users`)
    if (!DRY_RUN) {
      for (const au of authUsers) {
        await client.query(
          `INSERT INTO users (id, email, email_verified, hashed_password, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [au.id, au.email, !!au.email_confirmed_at, au.encrypted_password, au.created_at, au.updated_at || au.created_at]
        )
        verbose(`User: ${au.email}`)
      }
    }

    // 2. Profiles (from public.users)
    log('Migrating profiles...')
    summary.profiles = publicUsers.length
    log(`  Found ${publicUsers.length} profiles`)
    if (!DRY_RUN) {
      for (const pu of publicUsers) {
        await client.query(
          `INSERT INTO profiles (id, user_id, display_name, full_name, avatar_url, is_super_admin, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (user_id) DO NOTHING`,
          [crypto.randomUUID(), pu.id, pu.display_name || pu.full_name || pu.email, pu.full_name, pu.avatar_url, pu.is_super_admin || false, pu.created_at, pu.updated_at]
        )
        verbose(`Profile: ${pu.display_name || pu.full_name}`)
      }
    }

    // 3. Leagues
    log('Migrating leagues...')
    const { rows: leagues } = await sourcePool.query('SELECT * FROM leagues ORDER BY created_at')
    summary.leagues = leagues.length
    log(`  Found ${leagues.length} leagues`)
    if (!DRY_RUN) {
      for (const l of leagues) {
        const settings = JSON.stringify({
          default_buy_in: l.default_buy_in,
          default_rebuy_cost: l.default_rebuy_cost,
          bounty_amount: l.bounty_amount,
          max_players_per_game: l.max_players_per_game,
          allow_rebuys: l.allow_rebuys,
          auto_approve_members: l.auto_approve_members,
          annual_dues: l.annual_dues,
          guest_fee: l.guest_fee,
          guest_buyins_for_eligibility: l.guest_buyins_for_eligibility
        })
        const inviteCode = crypto.randomBytes(6).toString('hex')
        await client.query(
          `INSERT INTO leagues (id, name, slug, description, invite_code, settings, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [l.id, l.name, l.slug, l.description, inviteCode, settings, l.created_by, l.created_at, l.updated_at]
        )
        verbose(`League: ${l.name}`)
      }
    }

    // 4. League Members
    log('Migrating league members...')
    const { rows: members } = await sourcePool.query('SELECT * FROM league_members ORDER BY joined_at')
    summary.members = members.length
    log(`  Found ${members.length} members`)
    if (!DRY_RUN) {
      for (const m of members) {
        const duesPaid = parseFloat(m.dues_paid || 0) > 0
        await client.query(
          `INSERT INTO league_members (id, league_id, user_id, role, member_type, status, dues_paid, games_played, total_wins, total_points, total_winnings, total_bounties, joined_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (league_id, user_id) DO NOTHING`,
          [m.id, m.league_id, m.user_id, m.role || 'member', m.member_type || 'guest', m.status || 'active', duesPaid, m.games_played || 0, m.total_wins || 0, m.total_points || 0, 0, m.total_bounties || 0, m.joined_at]
        )
        verbose(`Member: ${m.id} (role: ${m.role})`)
      }
    }

    // 5. League Roles
    log('Migrating custom roles...')
    const { rows: roles } = await sourcePool.query('SELECT * FROM league_roles ORDER BY created_at')
    summary.roles = roles.length
    log(`  Found ${roles.length} custom roles`)
    if (!DRY_RUN) {
      for (const r of roles) {
        const permissions = buildPermissions(r)
        await client.query(
          `INSERT INTO league_roles (id, league_id, name, slug, emoji, description, permissions, is_system_role, display_order, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (league_id, slug) DO NOTHING`,
          [r.id, r.league_id, r.name, r.slug, r.emoji, r.description, permissions, r.is_system_role || false, r.display_order || 0, r.created_at]
        )
        verbose(`Role: ${r.name} (${permissions})`)
      }
    }

    // 6. Role Assignments
    log('Migrating role assignments...')
    const { rows: assignments } = await sourcePool.query('SELECT * FROM member_role_assignments ORDER BY assigned_at')
    summary.roleAssignments = assignments.length
    log(`  Found ${assignments.length} role assignments`)
    if (!DRY_RUN) {
      for (const a of assignments) {
        await client.query(
          `INSERT INTO member_role_assignments (id, league_id, user_id, role_id, assigned_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (league_id, user_id, role_id) DO NOTHING`,
          [a.id, a.league_id, a.user_id, a.role_id, a.assigned_at]
        )
      }
    }

    // 7. Blind Structures
    log('Migrating blind structures...')
    const { rows: blindStructures } = await sourcePool.query('SELECT * FROM blind_structures ORDER BY created_at')
    summary.blindStructures = blindStructures.length
    log(`  Found ${blindStructures.length} blind structures`)
    if (!DRY_RUN) {
      for (const s of blindStructures) {
        await client.query(
          `INSERT INTO blind_structures (id, league_id, name, is_default, created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.league_id, s.name, s.is_default || false, s.created_at]
        )
      }
    }

    // 8. Blind Levels
    log('Migrating blind levels...')
    const { rows: blindLevels } = await sourcePool.query('SELECT * FROM blind_levels ORDER BY structure_id, level_number')
    summary.blindLevels = blindLevels.length
    log(`  Found ${blindLevels.length} blind levels`)
    if (!DRY_RUN) {
      for (const l of blindLevels) {
        await client.query(
          `INSERT INTO blind_levels (id, structure_id, level_number, small_blind, big_blind, ante, duration_minutes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (structure_id, level_number) DO NOTHING`,
          [l.id, l.structure_id, l.level_number, l.small_blind, l.big_blind, l.ante || 0, l.duration_minutes]
        )
      }
    }

    // 9. Payout Structures
    log('Migrating payout structures...')
    const { rows: payoutStructures } = await sourcePool.query('SELECT * FROM payout_structures ORDER BY created_at')
    summary.payoutStructures = payoutStructures.length
    log(`  Found ${payoutStructures.length} payout structures`)
    if (!DRY_RUN) {
      for (const s of payoutStructures) {
        await client.query(
          `INSERT INTO payout_structures (id, league_id, name, is_default, created_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.league_id, s.name, s.is_default || false, s.created_at]
        )
      }
    }

    // 10. Payout Tiers
    log('Migrating payout tiers...')
    const { rows: payoutTiers } = await sourcePool.query('SELECT * FROM payout_tiers')
    summary.payoutTiers = payoutTiers.length
    log(`  Found ${payoutTiers.length} payout tiers`)
    if (!DRY_RUN) {
      for (const t of payoutTiers) {
        await client.query(
          `INSERT INTO payout_tiers (id, structure_id, min_players, max_players, first_place_pct, second_place_pct, third_place_pct, fourth_place_pct, fifth_place_pct)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [t.id, t.structure_id, t.min_players, t.max_players, t.first_place_pct, t.second_place_pct || 0, t.third_place_pct || 0, t.fourth_place_pct || 0, t.fifth_place_pct || 0]
        )
      }
    }

    // 11. Points Structures
    log('Migrating points structures...')
    const { rows: pointsStructures } = await sourcePool.query('SELECT * FROM points_structures ORDER BY created_at')
    summary.pointsStructures = pointsStructures.length
    log(`  Found ${pointsStructures.length} points structures`)
    if (!DRY_RUN) {
      for (const s of pointsStructures) {
        await client.query(
          `INSERT INTO points_structures (id, league_id, name, is_default, participation_points, bounty_points, position_points, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.league_id, s.name, s.is_default || false, s.participation_points || 1, s.bounty_points || 1, s.position_points || '[]', s.created_at]
        )
      }
    }

    // 12. Events
    log('Migrating events...')
    const { rows: events } = await sourcePool.query('SELECT * FROM events ORDER BY created_at')
    summary.events = events.length
    log(`  Found ${events.length} events`)
    if (!DRY_RUN) {
      for (const e of events) {
        // Combine event_date + start_time into scheduled_at
        let scheduledAt
        if (e.event_date) {
          const dateStr = e.event_date instanceof Date ? e.event_date.toISOString().split('T')[0] : e.event_date
          const timeStr = e.start_time || '19:00:00'
          scheduledAt = new Date(`${dateStr}T${timeStr}`)
        } else {
          scheduledAt = e.created_at
        }

        await client.query(
          `INSERT INTO events (id, league_id, title, description, scheduled_at, location, buy_in_amount, max_rebuys, rebuy_amount, blind_structure_id, payout_structure_id, points_structure_id, status, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id) DO NOTHING`,
          [e.id, e.league_id, e.title, e.host_notes, scheduledAt, e.location_name, e.buy_in || 0, 0, 0, e.blind_structure_id, e.payout_structure_id, e.points_structure_id, e.status || 'scheduled', e.created_by, e.created_at, e.updated_at]
        )
        verbose(`Event: ${e.title}`)
      }
    }

    // 13. Game Sessions
    log('Migrating game sessions...')
    const { rows: sessions } = await sourcePool.query(`
      SELECT gs.*, e.league_id
      FROM game_sessions gs
      JOIN events e ON e.id = gs.event_id
      ORDER BY gs.started_at
    `)
    summary.gameSessions = sessions.length
    log(`  Found ${sessions.length} game sessions`)
    if (!DRY_RUN) {
      for (const s of sessions) {
        let status = 'pending'
        if (s.ended_at) status = 'completed'
        else if (s.is_paused) status = 'paused'
        else if (s.is_running) status = 'running'
        else if (s.started_at) status = 'running'

        const { rows: [countRow] } = await sourcePool.query(
          'SELECT COUNT(*)::int as cnt FROM game_participants WHERE session_id = $1', [s.id]
        )

        await client.query(
          `INSERT INTO game_sessions (id, event_id, league_id, status, current_level, time_remaining_seconds, is_running, prize_pool, total_rebuys, player_count, started_at, ended_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4::game_status, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO NOTHING`,
          [s.id, s.event_id, s.league_id, status, s.current_level || 1, s.time_remaining_seconds, s.is_running || false, s.total_prize_pool || 0, s.total_rebuys || 0, countRow.cnt, s.started_at, s.ended_at, s.started_at || s.updated_at, s.updated_at]
        )
      }
    }

    // 14. Game Participants
    log('Migrating game participants...')
    const { rows: participants } = await sourcePool.query('SELECT * FROM game_participants ORDER BY created_at')
    summary.participants = participants.length
    log(`  Found ${participants.length} game participants`)
    if (!DRY_RUN) {
      for (const p of participants) {
        await client.query(
          `INSERT INTO game_participants (id, session_id, user_id, status, buy_in_paid, rebuy_count, finish_position, eliminated_by, eliminated_at, winnings, bounty_winnings, points_earned, bounty_count, created_at, updated_at)
           VALUES ($1, $2, $3, $4::participant_status, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (session_id, user_id) DO NOTHING`,
          [p.id, p.session_id, p.user_id, p.status || 'registered', true, p.rebuy_count || 0, p.finish_position, p.eliminated_by, p.eliminated_at, p.winnings || 0, p.bounty_winnings || 0, p.points_earned || 0, 0, p.created_at, p.updated_at]
        )
      }
    }

    if (!DRY_RUN) {
      await client.query('COMMIT')
      log('')
      log('Migration completed successfully!')
    } else {
      log('')
      log('DRY RUN complete. No data was written.')
    }

    log('')
    log('=== MIGRATION SUMMARY ===')
    log(`  Users:             ${summary.users}`)
    log(`  Profiles:          ${summary.profiles}`)
    log(`  Leagues:           ${summary.leagues}`)
    log(`  Members:           ${summary.members}`)
    log(`  Custom Roles:      ${summary.roles}`)
    log(`  Role Assignments:  ${summary.roleAssignments}`)
    log(`  Blind Structures:  ${summary.blindStructures}`)
    log(`  Blind Levels:      ${summary.blindLevels}`)
    log(`  Payout Structures: ${summary.payoutStructures}`)
    log(`  Payout Tiers:      ${summary.payoutTiers}`)
    log(`  Points Structures: ${summary.pointsStructures}`)
    log(`  Events:            ${summary.events}`)
    log(`  Game Sessions:     ${summary.gameSessions}`)
    log(`  Participants:      ${summary.participants}`)
    log('=========================')

  } catch (err) {
    if (!DRY_RUN) await client.query('ROLLBACK')
    console.error('MIGRATION FAILED:', err.message)
    console.error(err.stack)
    process.exit(1)
  } finally {
    client.release()
    await sourcePool.end()
    await targetPool.end()
  }
}

migrate()
