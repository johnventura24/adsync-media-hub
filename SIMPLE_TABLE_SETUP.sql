-- SIMPLE TABLE SETUP - JUST CREATE TABLES
-- Run this first if you get any errors

-- Drop existing tables if they have issues (optional - only if needed)
-- DROP TABLE IF EXISTS public.scorecards CASCADE;
-- DROP TABLE IF EXISTS public.rocks CASCADE;
-- DROP TABLE IF EXISTS public.todos CASCADE;
-- DROP TABLE IF EXISTS public.issues CASCADE;
-- DROP TABLE IF EXISTS public.meetings CASCADE;
-- DROP TABLE IF EXISTS public.processes CASCADE;

-- Create scorecards table
CREATE TABLE public.scorecards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  goal VARCHAR(100),
  average VARCHAR(100),
  total VARCHAR(100),
  owner_name VARCHAR(255),
  department VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rocks table
CREATE TABLE public.rocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quarter VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'not_started',
  completion_percentage INTEGER DEFAULT 0,
  owner_name VARCHAR(255),
  department VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create todos table
CREATE TABLE public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  assignee_name VARCHAR(255),
  department VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create issues table
CREATE TABLE public.issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  category VARCHAR(50) DEFAULT 'general',
  reporter_name VARCHAR(255),
  assignee_name VARCHAR(255),
  department VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  organizer_name VARCHAR(255),
  department VARCHAR(100),
  start_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create processes table
CREATE TABLE public.processes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_name VARCHAR(255),
  department VARCHAR(100),
  steps TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT 'Tables created successfully! Now you can run the data insert commands.' as message;
