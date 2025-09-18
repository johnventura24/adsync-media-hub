-- Fix Database Setup - Works with existing Supabase structure
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check what columns exist and add missing ones
-- Add description column to organizations if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'description') THEN
        ALTER TABLE organizations ADD COLUMN description TEXT;
    END IF;
END $$;

-- Add industry column to organizations if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'industry') THEN
        ALTER TABLE organizations ADD COLUMN industry VARCHAR(100);
    END IF;
END $$;

-- Create scorecards table if it doesn't exist
CREATE TABLE IF NOT EXISTS scorecards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID,
  frequency VARCHAR(20) DEFAULT 'weekly',
  is_active BOOLEAN DEFAULT true,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rocks table if it doesn't exist
CREATE TABLE IF NOT EXISTS rocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID,
  quarter VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'not_started',
  progress_percentage INTEGER DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create todos table if it doesn't exist
CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assignee_id UUID,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create issues table if it doesn't exist
CREATE TABLE IF NOT EXISTS issues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reporter_id UUID,
  assignee_id UUID,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  category VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meetings table if it doesn't exist
CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  organizer_id UUID,
  start_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create processes table if it doesn't exist
CREATE TABLE IF NOT EXISTS processes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert demo organization (only insert id and name, then update with other fields)
INSERT INTO organizations (id, name) 
VALUES ('00000000-0000-4000-8000-000000000001', 'Demo Company') 
ON CONFLICT (id) DO NOTHING;

-- Update the organization with additional fields
UPDATE organizations 
SET description = 'Sample organization for demonstration purposes',
    industry = 'Technology'
WHERE id = '00000000-0000-4000-8000-000000000001';

-- Insert demo user (check if users table exists first)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        INSERT INTO users (id, email, password_hash, first_name, last_name, role, department, is_active) 
        VALUES ('00000000-0000-4000-8000-000000000002', 'demo@hubdashboard.com', '$2a$10$mbv2SsJ.AzfiZVnWKX7Ebe1INRAp.glrmaioX.PXcRkGP5LbLrpKS', 'Demo', 'User', 'admin', 'Management', true) 
        ON CONFLICT (email) DO NOTHING;
    END IF;
END $$;
