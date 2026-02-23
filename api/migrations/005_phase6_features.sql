-- Migration: Phase 6 - Notifications, Chat, Dues, Pot, Seasons, Locations, Guest Eligibility

-- =====================
-- NOTIFICATIONS
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- game_result, trophy_awarded, dues_reminder, season_closed, etc.
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_league ON notifications(league_id);

-- =====================
-- CHAT MESSAGES
-- =====================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_league ON chat_messages(league_id, created_at DESC);

-- =====================
-- DUES
-- =====================
CREATE TABLE IF NOT EXISTS dues_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  season_year INTEGER NOT NULL,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dues_league ON dues_payments(league_id, season_year);
CREATE INDEX IF NOT EXISTS idx_dues_user ON dues_payments(user_id);

-- =====================
-- POT (League Treasury)
-- =====================
CREATE TABLE IF NOT EXISTS pot_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- deposit, expense, adjustment
  amount DECIMAL(10,2) NOT NULL, -- positive = deposit, negative = expense
  description TEXT NOT NULL,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pot_league ON pot_transactions(league_id, created_at DESC);

-- =====================
-- SEASONS
-- =====================
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'active', -- active, closed
  started_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, year)
);

CREATE INDEX IF NOT EXISTS idx_seasons_league ON seasons(league_id, year DESC);

-- =====================
-- SAVED LOCATIONS
-- =====================
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_league ON locations(league_id);

-- Add location_id to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_name TEXT;

-- Add settings columns to leagues for dues and guest eligibility
-- Using the existing JSONB settings column on leagues table
-- settings.annual_dues = amount
-- settings.guest_games_threshold = number of games before eligible
