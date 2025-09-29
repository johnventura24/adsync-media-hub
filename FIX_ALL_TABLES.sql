-- FIX ALL TABLES - Add missing columns and insert data
-- Run this in your Supabase SQL Editor

-- Fix scorecards table
ALTER TABLE public.scorecards 
ADD COLUMN IF NOT EXISTS goal VARCHAR(100),
ADD COLUMN IF NOT EXISTS average VARCHAR(100),
ADD COLUMN IF NOT EXISTS total VARCHAR(100),
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'weekly';

-- Create or fix rocks table
CREATE TABLE IF NOT EXISTS public.rocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quarter VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'not_started',
  completion_percentage INTEGER DEFAULT 0,
  owner_name VARCHAR(255),
  department VARCHAR(100),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to rocks table if it exists
ALTER TABLE public.rocks 
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;

-- Create or fix todos table
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  assignee_name VARCHAR(255),
  department VARCHAR(100),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to todos table if it exists
ALTER TABLE public.todos 
ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Create or fix issues table
CREATE TABLE IF NOT EXISTS public.issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'open',
  category VARCHAR(50) DEFAULT 'general',
  reporter_name VARCHAR(255),
  assignee_name VARCHAR(255),
  department VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to issues table if it exists
ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS reporter_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Create meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  organizer_name VARCHAR(255),
  department VARCHAR(100),
  start_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to meetings table if it exists
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Create processes table
CREATE TABLE IF NOT EXISTS public.processes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_name VARCHAR(255),
  department VARCHAR(100),
  steps TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to processes table if it exists
ALTER TABLE public.processes 
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS steps TEXT;

-- Clear existing data (optional - uncomment if you want to start fresh)
-- DELETE FROM public.scorecards;
-- DELETE FROM public.rocks;
-- DELETE FROM public.todos;
-- DELETE FROM public.issues;
-- DELETE FROM public.meetings;
-- DELETE FROM public.processes;

-- Insert Account Team data
INSERT INTO public.scorecards (name, goal, average, total, owner_name, department) VALUES
('Copywriter - Total Deliverables', '>= 1', '0', '0', 'John Smith', 'Account Team'),
('Designer - Projects Completed', '>= 5', '3', '3', 'Jane Doe', 'Account Team'),
('Manager - Team Performance', '>= 90%', '85%', '85%', 'Bob Wilson', 'Account Team'),
('Client Satisfaction Score', '>= 4.5', '4.2', '4.2', 'Sarah Johnson', 'Account Team'),
('Revenue Target Achievement', '>= 100%', '95%', '95%', 'Mike Chen', 'Account Team');

INSERT INTO public.rocks (title, description, quarter, year, status, completion_percentage, owner_name, department) VALUES
('Improve client satisfaction', 'Achieve 95% client satisfaction rate', 'Q1', 2024, 'in_progress', 60, 'Account Manager', 'Account Team'),
('Streamline workflows', 'Reduce project turnaround time by 20%', 'Q1', 2024, 'not_started', 0, 'Team Lead', 'Account Team'),
('Increase team productivity', 'Implement new project management tools', 'Q1', 2024, 'in_progress', 45, 'Operations Manager', 'Account Team'),
('Expand client base', 'Acquire 10 new enterprise clients', 'Q1', 2024, 'on_track', 30, 'Business Development', 'Account Team');

INSERT INTO public.todos (title, description, priority, status, assignee_name, department) VALUES
('Review client feedback', 'Analyze Q4 client satisfaction surveys', 'high', 'pending', 'Sarah Johnson', 'Account Team'),
('Update project templates', 'Create new templates for 2024 projects', 'medium', 'in_progress', 'Mike Chen', 'Account Team'),
('Prepare quarterly report', 'Compile Q1 performance metrics', 'high', 'pending', 'Bob Wilson', 'Account Team'),
('Schedule team training', 'Organize skills development workshop', 'medium', 'completed', 'Jane Doe', 'Account Team'),
('Client onboarding checklist', 'Update onboarding process documentation', 'low', 'pending', 'John Smith', 'Account Team');

INSERT INTO public.issues (title, description, priority, status, category, reporter_name, assignee_name, department) VALUES
('Client communication delays', 'Emails taking too long to get responses', 'medium', 'open', 'Communication', 'Account Team Lead', 'Sarah Johnson', 'Account Team'),
('Resource allocation', 'Not enough designers for current workload', 'high', 'open', 'Resource', 'Project Manager', 'Bob Wilson', 'Account Team'),
('Budget tracking', 'Difficulty tracking project expenses accurately', 'medium', 'in_progress', 'Financial', 'Finance Liaison', 'Mike Chen', 'Account Team'),
('Tool integration', 'CRM not syncing with project management tool', 'low', 'resolved', 'Technical', 'IT Support', 'John Smith', 'Account Team');

INSERT INTO public.meetings (title, description, organizer_name, department, start_time) VALUES
('Weekly Team Standup', 'Review progress and blockers', 'Team Lead', 'Account Team', '2024-01-15 09:00:00+00'),
('Client Review Meeting', 'Monthly client satisfaction review', 'Account Manager', 'Account Team', '2024-01-20 14:00:00+00'),
('Quarterly Planning', 'Q2 2024 strategy planning session', 'Operations Manager', 'Account Team', '2024-01-25 10:00:00+00'),
('Training Workshop', 'New tools and processes training', 'HR Representative', 'Account Team', '2024-01-30 13:00:00+00');

INSERT INTO public.processes (name, description, owner_name, department, steps) VALUES
('Client Onboarding', 'Standard process for new client setup', 'Account Manager', 'Account Team', '1. Initial consultation 2. Contract signing 3. Project kickoff 4. Team assignment'),
('Project Delivery', 'End-to-end project execution process', 'Project Manager', 'Account Team', '1. Requirements gathering 2. Planning 3. Execution 4. Review 5. Delivery'),
('Quality Assurance', 'Quality check process for all deliverables', 'QA Lead', 'Account Team', '1. Internal review 2. Client preview 3. Feedback incorporation 4. Final approval'),
('Performance Review', 'Monthly team performance evaluation', 'Team Lead', 'Account Team', '1. Individual meetings 2. Goal assessment 3. Feedback session 4. Development planning');

-- Verify data was inserted
SELECT 'All tables fixed and data inserted successfully!' as result;
SELECT 'Scorecards: ' || COUNT(*)::text as count FROM public.scorecards;
SELECT 'Rocks: ' || COUNT(*)::text as count FROM public.rocks;
SELECT 'Todos: ' || COUNT(*)::text as count FROM public.todos;
SELECT 'Issues: ' || COUNT(*)::text as count FROM public.issues;
SELECT 'Meetings: ' || COUNT(*)::text as count FROM public.meetings;
SELECT 'Processes: ' || COUNT(*)::text as count FROM public.processes;
