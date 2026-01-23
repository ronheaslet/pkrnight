-- PKR Night Database Schema
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- AUTH TABLES (Better Auth compatible)
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  hashed_password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- ============================================
-- USER PROFILES
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_super_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEAGUES
-- ============================================

CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  settings JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
CREATE TYPE member_type AS ENUM ('paid', 'guest');
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'banned');

CREATE TABLE league_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role member_role DEFAULT 'member',
  member_type member_type DEFAULT 'guest',
  status member_status DEFAULT 'active',
  dues_paid BOOLEAN DEFAULT false,
  games_played INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  total_winnings DECIMAL(10,2) DEFAULT 0,
  total_bounties INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

CREATE TABLE league_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  is_system_role BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, slug)
);

CREATE TABLE member_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES league_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id, role_id)
);

-- ============================================
-- TOURNAMENT STRUCTURES
-- ============================================

CREATE TABLE blind_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE blind_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  structure_id UUID NOT NULL REFERENCES blind_structures(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  small_blind INTEGER NOT NULL,
  big_blind INTEGER NOT NULL,
  ante INTEGER DEFAULT 0,
  duration_minutes INTEGER NOT NULL,
  UNIQUE(structure_id, level_number)
);

CREATE TABLE payout_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payout_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  structure_id UUID NOT NULL REFERENCES payout_structures(id) ON DELETE CASCADE,
  min_players INTEGER NOT NULL,
  max_players INTEGER NOT NULL,
  first_place_pct DECIMAL(5,2) NOT NULL,
  second_place_pct DECIMAL(5,2) DEFAULT 0,
  third_place_pct DECIMAL(5,2) DEFAULT 0,
  fourth_place_pct DECIMAL(5,2) DEFAULT 0,
  fifth_place_pct DECIMAL(5,2) DEFAULT 0
);

CREATE TABLE points_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  participation_points INTEGER DEFAULT 1,
  bounty_points INTEGER DEFAULT 1,
  position_points JSONB DEFAULT '[{"position": 1, "points": 10}, {"position": 2, "points": 7}, {"position": 3, "points": 5}, {"position": 4, "points": 3}, {"position": 5, "points": 2}]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EVENTS & GAMES
-- ============================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  buy_in_amount DECIMAL(10,2) DEFAULT 0,
  max_rebuys INTEGER DEFAULT 0,
  rebuy_amount DECIMAL(10,2) DEFAULT 0,
  blind_structure_id UUID REFERENCES blind_structures(id),
  payout_structure_id UUID REFERENCES payout_structures(id),
  points_structure_id UUID REFERENCES points_structures(id),
  status TEXT DEFAULT 'scheduled',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE game_status AS ENUM ('pending', 'running', 'paused', 'completed', 'cancelled');

CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  status game_status DEFAULT 'pending',
  current_level INTEGER DEFAULT 1,
  time_remaining_seconds INTEGER,
  is_running BOOLEAN DEFAULT false,
  prize_pool DECIMAL(10,2) DEFAULT 0,
  total_rebuys INTEGER DEFAULT 0,
  player_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE participant_status AS ENUM ('registered', 'playing', 'eliminated', 'winner');

CREATE TABLE game_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status participant_status DEFAULT 'registered',
  buy_in_paid BOOLEAN DEFAULT false,
  rebuy_count INTEGER DEFAULT 0,
  finish_position INTEGER,
  eliminated_by UUID REFERENCES users(id),
  eliminated_at TIMESTAMPTZ,
  winnings DECIMAL(10,2) DEFAULT 0,
  bounty_winnings DECIMAL(10,2) DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  bounty_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  actor_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_profiles_user ON profiles(user_id);
CREATE INDEX idx_league_members_league ON league_members(league_id);
CREATE INDEX idx_league_members_user ON league_members(user_id);
CREATE INDEX idx_events_league ON events(league_id);
CREATE INDEX idx_events_scheduled ON events(scheduled_at);
CREATE INDEX idx_game_sessions_event ON game_sessions(event_id);
CREATE INDEX idx_game_sessions_league ON game_sessions(league_id);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_game_participants_session ON game_participants(session_id);
CREATE INDEX idx_game_participants_user ON game_participants(user_id);
CREATE INDEX idx_game_events_session ON game_events(session_id);
CREATE INDEX idx_game_events_type ON game_events(event_type);
CREATE INDEX idx_game_events_created ON game_events(created_at);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_game_participants_updated_at BEFORE UPDATE ON game_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
