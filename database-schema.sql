-- ===========================================
-- DATABASE SCHEMA FOR DASHBOARD METRICS
-- ===========================================
-- Compatible with PostgreSQL and MySQL
-- Run these commands to set up your database tables

-- Funnel Metrics Table
CREATE TABLE IF NOT EXISTS funnel_metrics (
    id SERIAL PRIMARY KEY,
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

-- Goals Tracking Table
CREATE TABLE IF NOT EXISTS goals_metrics (
    id SERIAL PRIMARY KEY,
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