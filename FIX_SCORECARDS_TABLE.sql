-- FIX SCORECARDS TABLE - Add missing columns
-- Run this in your Supabase SQL Editor

-- First, let's see what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scorecards' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add missing columns to scorecards table
ALTER TABLE public.scorecards 
ADD COLUMN IF NOT EXISTS goal VARCHAR(100),
ADD COLUMN IF NOT EXISTS average VARCHAR(100),
ADD COLUMN IF NOT EXISTS total VARCHAR(100),
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(100),
ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'weekly';

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'scorecards' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Now insert the data
INSERT INTO public.scorecards (name, goal, average, total, owner_name, department) VALUES
('Copywriter - Total Deliverables', '>= 1', '0', '0', 'John Smith', 'Account Team'),
('Designer - Projects Completed', '>= 5', '3', '3', 'Jane Doe', 'Account Team'),
('Manager - Team Performance', '>= 90%', '85%', '85%', 'Bob Wilson', 'Account Team'),
('Client Satisfaction Score', '>= 4.5', '4.2', '4.2', 'Sarah Johnson', 'Account Team'),
('Revenue Target Achievement', '>= 100%', '95%', '95%', 'Mike Chen', 'Account Team');

SELECT 'Scorecards table fixed and data inserted successfully!' as result;
SELECT COUNT(*) as total_scorecards FROM public.scorecards;
