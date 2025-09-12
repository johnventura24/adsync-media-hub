-- Seed data for Hub Dashboard
-- This creates demo users and sample data for testing

-- Create demo organization first
INSERT INTO organizations (id, name, description, industry, size)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'Demo Company',
  'Sample organization for demonstration purposes',
  'Technology',
  '10-50'
) ON CONFLICT (id) DO NOTHING;

-- Create demo user (password: demo123456)
-- Password hash for 'demo123456' using bcrypt
INSERT INTO users (
  id,
  email,
  password_hash,
  first_name,
  last_name,
  role,
  department,
  position,
  is_active
) VALUES (
  '00000000-0000-4000-8000-000000000002',
  'demo@hubdashboard.com',
  '$2a$10$mbv2SsJ.AzfiZVnWKX7Ebe1INRAp.glrmaioX.PXcRkGP5LbLrpKS',
  'Demo',
  'User',
  'admin',
  'Management',
  'Demo Administrator',
  true
) ON CONFLICT (email) DO NOTHING;

-- Link demo user to demo organization
INSERT INTO user_organizations (user_id, organization_id, role)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'admin'
) ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Create sample rocks for demo
INSERT INTO rocks (
  id,
  title,
  description,
  owner_id,
  organization_id,
  quarter,
  year,
  progress_percentage,
  status,
  priority,
  due_date
) VALUES (
  '00000000-0000-4000-8000-000000000003',
  'Increase Customer Satisfaction',
  'Improve customer satisfaction score from 4.2 to 4.8',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Q4',
  2024,
  75,
  'on_track',
  'high',
  '2024-12-31'
), (
  '00000000-0000-4000-8000-000000000004',
  'Launch Mobile App',
  'Complete development and launch of mobile application',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Q4',
  2024,
  60,
  'on_track',
  'high',
  '2024-12-15'
) ON CONFLICT (id) DO NOTHING;

-- Create sample todos
INSERT INTO todos (
  id,
  title,
  description,
  assignee_id,
  organization_id,
  priority,
  status,
  due_date
) VALUES (
  '00000000-0000-4000-8000-000000000005',
  'Review Q4 Performance Metrics',
  'Analyze quarterly performance and prepare report',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'high',
  'pending',
  CURRENT_DATE + INTERVAL '3 days'
), (
  '00000000-0000-4000-8000-000000000006',
  'Update Team Documentation',
  'Review and update process documentation',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'medium',
  'in_progress',
  CURRENT_DATE + INTERVAL '7 days'
) ON CONFLICT (id) DO NOTHING;

-- Create sample issues
INSERT INTO issues (
  id,
  title,
  description,
  reporter_id,
  assignee_id,
  organization_id,
  priority,
  status,
  category
) VALUES (
  '00000000-0000-4000-8000-000000000007',
  'Server Response Time',
  'API response times have increased by 20% this week',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'high',
  'open',
  'technical'
), (
  '00000000-0000-4000-8000-000000000008',
  'Communication Gap',
  'Need better communication between sales and development teams',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'medium',
  'open',
  'process'
) ON CONFLICT (id) DO NOTHING;
