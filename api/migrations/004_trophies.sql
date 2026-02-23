-- Migration: Add trophies table for end-of-season awards

CREATE TABLE IF NOT EXISTS trophies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trophy_type TEXT NOT NULL,
  season_year INTEGER NOT NULL,
  stat_value DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id, trophy_type, season_year)
);

CREATE INDEX IF NOT EXISTS idx_trophies_league ON trophies(league_id);
CREATE INDEX IF NOT EXISTS idx_trophies_user ON trophies(user_id);
CREATE INDEX IF NOT EXISTS idx_trophies_season ON trophies(league_id, season_year);
