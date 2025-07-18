-- ===========================================
-- DATABASE SCHEMA FOR DASHBOARD METRICS
-- ===========================================
-- Compatible with PostgreSQL and MySQL
-- Run these commands to set up your database tables

-- ===========================================
-- USER AUTHENTICATION AND TEAM MANAGEMENT
-- ===========================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'owner', 'member')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team Members Table
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    permissions TEXT, -- JSON string of permissions
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(team_id, user_id)
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team Invitations Table
CREATE TABLE IF NOT EXISTS team_invitations (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    invited_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(invitation_token);

-- ===========================================
-- DATA OWNERSHIP AND TEAM ASSOCIATION
-- ===========================================

-- Add team_id to existing tables for team-based data isolation
ALTER TABLE funnel_metrics ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE goals_metrics ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE vto_metrics ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE issues_metrics ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE scorecard_metrics ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE ninety_todos ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE ninety_rocks ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE ninety_issues ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE ninety_data ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);
ALTER TABLE ninety_upload_history ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);

-- Add created_by and updated_by to track user actions
ALTER TABLE funnel_metrics ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE goals_metrics ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE vto_metrics ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE issues_metrics ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE scorecard_metrics ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE ninety_todos ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE ninety_rocks ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE ninety_issues ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
ALTER TABLE ninety_data ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- ===========================================
-- SAMPLE DATA FOR TESTING
-- ===========================================

-- Insert sample users (using bcrypt for password hashing)
-- Default password for all sample users: "password" (bcrypt hash: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi)
-- Admin password: "Jventura1234!" (bcrypt hash: $2b$10$VM.C9r66VlGm5n2I19WdaeP.p4bW6pvFyFOEmrQZIXjw9D52DUDkm)
INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active) 
VALUES 
    ('ventura', 'ventura@adsyncmedia.com', '$2b$10$VM.C9r66VlGm5n2I19WdaeP.p4bW6pvFyFOEmrQZIXjw9D52DUDkm', 'Ventura', 'Admin', 'admin', TRUE),
    ('john.doe', 'john@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Doe', 'owner', TRUE),
    ('jane.smith', 'jane@example.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Smith', 'member', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert sample team
INSERT INTO teams (name, description, owner_id) 
VALUES 
    ('Marketing Team', 'Primary marketing and advertising team', 2),
    ('Sales Team', 'Sales and revenue generation team', 2)
ON CONFLICT DO NOTHING;

-- Insert sample team members
INSERT INTO team_members (team_id, user_id, role, permissions) 
VALUES 
    (1, 1, 'admin', '["read", "write", "admin", "invite"]'),
    (1, 2, 'admin', '["read", "write", "admin", "invite"]'),
    (1, 3, 'member', '["read", "write"]'),
    (2, 2, 'admin', '["read", "write", "admin", "invite"]'),
    (2, 3, 'member', '["read", "write"]')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- ===========================================
-- DATABASE SCHEMA FOR DASHBOARD METRICS
-- ===========================================

-- Funnel Metrics Table (with team-based filtering)
CREATE TABLE IF NOT EXISTS funnel_metrics (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    leads INTEGER NOT NULL DEFAULT 0,
    prospects INTEGER NOT NULL DEFAULT 0,
    qualified INTEGER NOT NULL DEFAULT 0,
    proposals INTEGER NOT NULL DEFAULT 0,
    closed INTEGER NOT NULL DEFAULT 0,
    revenue DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    conversion_rate_l2p DECIMAL(5,2), -- Lead to Prospect
    conversion_rate_p2q DECIMAL(5,2), -- Prospect to Qualified
    conversion_rate_q2p DECIMAL(5,2), -- Qualified to Proposal
    conversion_rate_p2c DECIMAL(5,2), -- Proposal to Closed
    data_source VARCHAR(50) DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goals Tracking Table (with team-based filtering)
CREATE TABLE IF NOT EXISTS goals_metrics (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL, -- 'quarterly', 'monthly', 'yearly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    percentage_complete DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN target_amount > 0 THEN (current_amount / target_amount * 100)
            ELSE 0 
        END
    ) STORED,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VTO (Vacation Time Off) Tracking Table
CREATE TABLE IF NOT EXISTS vto_metrics (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    available_days INTEGER NOT NULL DEFAULT 0,
    used_days INTEGER NOT NULL DEFAULT 0,
    pending_days INTEGER NOT NULL DEFAULT 0,
    remaining_days INTEGER GENERATED ALWAYS AS (available_days - used_days - pending_days) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year)
);

-- Issues Tracking Table
CREATE TABLE IF NOT EXISTS issues_metrics (
    id SERIAL PRIMARY KEY,
    critical_issues INTEGER NOT NULL DEFAULT 0,
    high_issues INTEGER NOT NULL DEFAULT 0,
    medium_issues INTEGER NOT NULL DEFAULT 0,
    low_issues INTEGER NOT NULL DEFAULT 0,
    total_issues INTEGER GENERATED ALWAYS AS (critical_issues + high_issues + medium_issues + low_issues) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scorecard Metrics Table
CREATE TABLE IF NOT EXISTS scorecard_metrics (
    id SERIAL PRIMARY KEY,
    customer_satisfaction INTEGER CHECK (customer_satisfaction >= 0 AND customer_satisfaction <= 100),
    team_efficiency INTEGER CHECK (team_efficiency >= 0 AND team_efficiency <= 100),
    goal_completion INTEGER CHECK (goal_completion >= 0 AND goal_completion <= 100),
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Base Table
CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url TEXT,
    category VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- SAMPLE DATA INSERTION
-- ===========================================

-- Insert sample funnel metrics
INSERT INTO funnel_metrics (leads, prospects, qualified, proposals, closed, revenue, data_source) 
VALUES 
    (1250, 875, 425, 180, 85, 750000.00, 'sample'),
    (1180, 820, 410, 175, 82, 720000.00, 'sample'),
    (1320, 890, 445, 185, 88, 780000.00, 'sample')
ON CONFLICT DO NOTHING;

-- Insert sample goals
INSERT INTO goals_metrics (period_type, period_start, period_end, target_amount, current_amount) 
VALUES 
    ('quarterly', '2024-01-01', '2024-03-31', 1000000.00, 750000.00),
    ('monthly', '2024-01-01', '2024-01-31', 333333.00, 280000.00)
ON CONFLICT DO NOTHING;

-- Insert sample VTO data
INSERT INTO vto_metrics (year, available_days, used_days, pending_days) 
VALUES 
    (2024, 240, 165, 25)
ON CONFLICT (year) DO UPDATE SET
    available_days = EXCLUDED.available_days,
    used_days = EXCLUDED.used_days,
    pending_days = EXCLUDED.pending_days,
    updated_at = CURRENT_TIMESTAMP;

-- Insert sample issues data
INSERT INTO issues_metrics (critical_issues, high_issues, medium_issues, low_issues) 
VALUES (3, 12, 28, 45);

-- Insert sample scorecard data
INSERT INTO scorecard_metrics (customer_satisfaction, team_efficiency, goal_completion, quality_score) 
VALUES (92, 88, 75, 94);

-- Insert sample knowledge base entries
INSERT INTO knowledge_base (title, url, category, description) 
VALUES 
    ('Employee Handbook', '#', 'HR', 'Complete guide for all employees'),
    ('Company Policies', '#', 'HR', 'Official company policies and procedures'),
    ('Marketing Guidelines', '#', 'Marketing', 'Brand and marketing standards'),
    ('Sales Playbook', '#', 'Sales', 'Sales processes and best practices'),
    ('Technical Documentation', '#', 'Tech', 'Technical guides and API docs'),
    ('Project Management Tools', '#', 'Operations', 'PM tools and workflows')
ON CONFLICT DO NOTHING;

-- ===========================================
-- NINETY.IO DATA TABLES
-- ===========================================

-- Ninety.io To-Do's Table (with team-based filtering)
CREATE TABLE IF NOT EXISTS ninety_todos (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Open',
    priority VARCHAR(20) DEFAULT 'Medium',
    due_date DATE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_completed BOOLEAN DEFAULT FALSE
);

-- Ninety.io Rocks Table (with team-based filtering)
CREATE TABLE IF NOT EXISTS ninety_rocks (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Open',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    due_date DATE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_completed BOOLEAN DEFAULT FALSE
);

-- Ninety.io Issues Table (with team-based filtering)
CREATE TABLE IF NOT EXISTS ninety_issues (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Open',
    priority VARCHAR(20) DEFAULT 'Medium',
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT FALSE
);

-- Ninety.io Data Table (with team-based filtering)
CREATE TABLE IF NOT EXISTS ninety_data (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100),
    value TEXT,
    owner VARCHAR(255),
    category VARCHAR(100),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Ninety.io Upload History Table
CREATE TABLE IF NOT EXISTS ninety_upload_history (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    file_size INTEGER,
    records_processed INTEGER DEFAULT 0,
    records_saved INTEGER DEFAULT 0,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_by VARCHAR(255),
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT
);

-- ===========================================
-- USEFUL QUERIES FOR DATA RETRIEVAL
-- ===========================================

-- Get latest funnel metrics
-- SELECT * FROM funnel_metrics ORDER BY updated_at DESC LIMIT 1;

-- Get current quarter goals
-- SELECT * FROM goals_metrics WHERE period_type = 'quarterly' AND is_active = true ORDER BY period_start DESC LIMIT 1;

-- Get current year VTO data
-- SELECT * FROM vto_metrics WHERE year = EXTRACT(YEAR FROM CURRENT_DATE);

-- Get latest issues metrics
-- SELECT * FROM issues_metrics ORDER BY updated_at DESC LIMIT 1;

-- Get latest scorecard metrics
-- SELECT * FROM scorecard_metrics ORDER BY updated_at DESC LIMIT 1;

-- Get active knowledge base entries by category
-- SELECT * FROM knowledge_base WHERE is_active = true ORDER BY category, title; 

-- Get all Ninety.io to-dos
-- SELECT * FROM ninety_todos ORDER BY created_date DESC;

-- Get all Ninety.io rocks
-- SELECT * FROM ninety_rocks ORDER BY created_date DESC;

-- Get all Ninety.io issues
-- SELECT * FROM ninety_issues ORDER BY created_date DESC;

-- Get all Ninety.io data
-- SELECT * FROM ninety_data ORDER BY created_date DESC;

-- Get Ninety.io upload history
-- SELECT * FROM ninety_upload_history ORDER BY upload_date DESC;

-- ===========================================
-- DATABASE MIGRATION SCRIPTS
-- ===========================================

-- Migration: Add team_id columns to existing tables (for existing databases)
-- NOTE: Run these only if you have existing data and need to migrate

-- Add team_id to funnel_metrics if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='funnel_metrics' AND column_name='team_id') THEN
        ALTER TABLE funnel_metrics ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add team_id to goals_metrics if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='goals_metrics' AND column_name='team_id') THEN
        ALTER TABLE goals_metrics ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add team_id to ninety_todos if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='ninety_todos' AND column_name='team_id') THEN
        ALTER TABLE ninety_todos ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add team_id to ninety_rocks if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='ninety_rocks' AND column_name='team_id') THEN
        ALTER TABLE ninety_rocks ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add team_id to ninety_issues if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='ninety_issues' AND column_name='team_id') THEN
        ALTER TABLE ninety_issues ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add team_id to ninety_data if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name='ninety_data' AND column_name='team_id') THEN
        ALTER TABLE ninety_data ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for team-based data filtering
CREATE INDEX IF NOT EXISTS idx_funnel_metrics_team ON funnel_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_goals_metrics_team ON goals_metrics(team_id);
CREATE INDEX IF NOT EXISTS idx_ninety_todos_team ON ninety_todos(team_id);
CREATE INDEX IF NOT EXISTS idx_ninety_rocks_team ON ninety_rocks(team_id);
CREATE INDEX IF NOT EXISTS idx_ninety_issues_team ON ninety_issues(team_id);
CREATE INDEX IF NOT EXISTS idx_ninety_data_team ON ninety_data(team_id); 