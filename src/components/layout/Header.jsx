-- ============================================
-- CUSTOM ROLES & PERMISSIONS SYSTEM
-- ============================================

-- Role definitions table
CREATE TABLE IF NOT EXISTS league_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    description TEXT,
    emoji VARCHAR(10),
    
    -- Role settings
    max_assignees INTEGER DEFAULT NULL,  -- NULL = unlimited, 1 = single person
    is_system_role BOOLEAN DEFAULT false, -- owner, admin, member are system roles
    
    -- Permissions (what this role can do)
    can_pause_timer BOOLEAN DEFAULT false,
    can_start_game BOOLEAN DEFAULT false,
    can_manage_rebuys BOOLEAN DEFAULT false,
    can_eliminate_players BOOLEAN DEFAULT false,
    can_manage_money BOOLEAN DEFAULT false,
    can_edit_settings BOOLEAN DEFAULT false,
    can_manage_members BOOLEAN DEFAULT false,
    can_send_announcements BOOLEAN DEFAULT false,
    
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User role assignments
CREATE TABLE IF NOT EXISTS member_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES league_roles(id) ON DELETE CASCADE,
    
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    
    UNIQUE(league_id, user_id, role_id)
);

-- Add view mode preference to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_view_mode VARCHAR(20) DEFAULT 'auto';

-- Disable RLS for new tables
ALTER TABLE league_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_role_assignments DISABLE ROW LEVEL SECURITY;

-- Insert default roles for existing leagues (run once per league or use a function)
-- This is a template - the app will create these when a league is created
/*
INSERT INTO league_roles (league_id, name, slug, emoji, max_assignees, is_system_role, can_pause_timer, can_start_game, can_manage_rebuys, can_eliminate_players, can_manage_money, can_edit_settings, can_manage_members, display_order) VALUES
(YOUR_LEAGUE_ID, 'Owner', 'owner', '👑', 1, true, true, true, true, true, true, true, true, 0),
(YOUR_LEAGUE_ID, 'Admin', 'admin', '⭐', NULL, true, true, true, true, true, true, true, true, 1),
(YOUR_LEAGUE_ID, 'Accountant', 'accountant', '📊', 1, false, false, false, false, false, true, false, false, 2),
(YOUR_LEAGUE_ID, 'Sergeant at Arms', 'sergeant-at-arms', '🛡️', 1, false, true, true, true, true, false, false, false, 3),
(YOUR_LEAGUE_ID, 'Dealer', 'dealer', '🃏', NULL, false, true, false, false, false, false, false, false, 4),
(YOUR_LEAGUE_ID, 'Rebuy Handler', 'rebuy-handler', '🔄', NULL, false, false, false, true, false, false, false, false, 5);
*/
