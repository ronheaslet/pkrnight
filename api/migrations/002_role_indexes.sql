-- Indexes for custom roles feature
CREATE INDEX IF NOT EXISTS idx_league_roles_league ON league_roles(league_id);
CREATE INDEX IF NOT EXISTS idx_member_role_assignments_league ON member_role_assignments(league_id);
CREATE INDEX IF NOT EXISTS idx_member_role_assignments_user ON member_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_member_role_assignments_role ON member_role_assignments(role_id);
