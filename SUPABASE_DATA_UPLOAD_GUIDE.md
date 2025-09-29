# 📊 UPLOAD DATA DIRECTLY TO SUPABASE

## Method 1: Upload CSV Data via Supabase Interface

### Step 1: Prepare Your Data Tables

First, make sure all tables exist. Go to **Supabase → SQL Editor** and run:

```sql
-- Ensure all tables exist with proper structure
CREATE TABLE IF NOT EXISTS public.scorecards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  frequency VARCHAR(20) DEFAULT 'weekly',
  goal VARCHAR(100),
  average VARCHAR(100),
  total VARCHAR(100),
  owner_name VARCHAR(255),
  department VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  quarter VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'not_started',
  progress_percentage INTEGER DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0,
  owner_name VARCHAR(255),
  department VARCHAR(100),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

SELECT 'All tables created successfully!' as message;
```

### Step 2: Upload Data via Supabase Table Editor

#### For Scorecards:
1. **Go to Supabase → Table Editor → scorecards**
2. **Click "Insert" → "Insert row"**
3. **Fill in your data**:
   - `name`: "Copywriter - Total Deliverables"
   - `goal`: ">= 1"
   - `average`: "0"
   - `total`: "0"
   - `owner_name`: "John Smith"
   - `department`: "Creative Team"
   - `frequency`: "weekly"

#### For Rocks (Goals):
1. **Go to Table Editor → rocks**
2. **Insert rows with**:
   - `title`: "Increase revenue by 20%"
   - `description`: "Focus on new customer acquisition"
   - `quarter`: "Q1"
   - `year`: 2024
   - `status`: "in_progress"
   - `completion_percentage`: 75
   - `owner_name`: "Jane Doe"
   - `department`: "Sales Team"

#### For To-Dos:
1. **Go to Table Editor → todos**
2. **Insert rows with**:
   - `title`: "Complete quarterly review"
   - `description`: "Prepare presentation for board meeting"
   - `priority`: "high"
   - `status`: "pending"
   - `assignee_name`: "Bob Johnson"
   - `department`: "Management"

#### For Issues:
1. **Go to Table Editor → issues**
2. **Insert rows with**:
   - `title`: "System performance issues"
   - `description`: "Database queries running slowly"
   - `priority`: "high"
   - `status`: "open"
   - `category`: "Technical"
   - `reporter_name`: "Tech Team"
   - `department`: "Tech Team"

## Method 2: Bulk Upload via SQL

### Step 1: Convert Your CSV to SQL Insert Statements

For your **Account Team - Data.csv**, create SQL like this:

```sql
-- Example: Insert multiple scorecards at once
INSERT INTO public.scorecards (name, goal, average, total, owner_name, department) VALUES
('Copywriter - Total Deliverables', '>= 1', '0', '0', 'John Smith', 'Account Team'),
('Designer - Projects Completed', '>= 5', '3', '3', 'Jane Doe', 'Account Team'),
('Manager - Team Performance', '>= 90%', '85%', '85%', 'Bob Wilson', 'Account Team');

-- Example: Insert rocks/goals
INSERT INTO public.rocks (title, description, quarter, year, status, completion_percentage, owner_name, department) VALUES
('Improve client satisfaction', 'Achieve 95% client satisfaction rate', 'Q1', 2024, 'in_progress', 60, 'Account Manager', 'Account Team'),
('Streamline workflows', 'Reduce project turnaround time by 20%', 'Q1', 2024, 'not_started', 0, 'Team Lead', 'Account Team');

-- Example: Insert todos
INSERT INTO public.todos (title, description, priority, status, assignee_name, department) VALUES
('Review client feedback', 'Analyze Q4 client satisfaction surveys', 'high', 'pending', 'Sarah Johnson', 'Account Team'),
('Update project templates', 'Create new templates for 2024 projects', 'medium', 'in_progress', 'Mike Chen', 'Account Team');

-- Example: Insert issues
INSERT INTO public.issues (title, description, priority, status, category, reporter_name, department) VALUES
('Client communication delays', 'Emails taking too long to get responses', 'medium', 'open', 'Communication', 'Account Team Lead', 'Account Team'),
('Resource allocation', 'Not enough designers for current workload', 'high', 'open', 'Resource', 'Project Manager', 'Account Team');
```

### Step 2: Run the SQL in Supabase

1. **Go to Supabase → SQL Editor**
2. **Paste your INSERT statements**
3. **Click "Run"**
4. **Data will be inserted immediately**

## Method 3: CSV Import via Supabase (If Available)

Some Supabase projects have CSV import:

1. **Go to Table Editor → [table_name]**
2. **Look for "Import data" or CSV icon**
3. **Upload your CSV file**
4. **Map columns to table fields**
5. **Import data**

## Step 3: Verify Data Appears in Dashboard

After uploading data, check your dashboard:

1. **Go to**: https://adsync-media-hub.onrender.com/data
2. **Check each tab**:
   - **Scorecards tab**: Should show your scorecard data
   - **Rocks tab**: Should show your goals/rocks
   - **To-Dos tab**: Should show your tasks
   - **Issues tab**: Should show your issues
   - **Meetings tab**: Should show meetings
   - **Processes tab**: Should show processes

## Step 4: Sample Data for Testing

Here's some sample data you can insert to test:

```sql
-- Sample data for all sections
INSERT INTO public.scorecards (name, goal, average, total, owner_name, department) VALUES
('Sales Calls per Week', '>= 50', '45', '180', 'Sales Rep 1', 'Sales Team'),
('Content Pieces Created', '>= 10', '8', '32', 'Content Writer', 'Creative Team'),
('Customer Satisfaction', '>= 4.5', '4.2', '4.2', 'Support Manager', 'Support Team');

INSERT INTO public.rocks (title, description, quarter, year, status, completion_percentage, owner_name, department) VALUES
('Launch New Product Line', 'Complete development and launch of Product X', 'Q1', 2024, 'in_progress', 75, 'Product Manager', 'Product Team'),
('Improve Team Efficiency', 'Reduce project completion time by 30%', 'Q1', 2024, 'in_progress', 50, 'Operations Manager', 'Operations Team');

INSERT INTO public.todos (title, description, priority, status, assignee_name, department) VALUES
('Finalize marketing campaign', 'Complete Q1 marketing materials', 'high', 'pending', 'Marketing Lead', 'Marketing Team'),
('Update employee handbook', 'Review and update HR policies', 'medium', 'in_progress', 'HR Manager', 'HR Team');

INSERT INTO public.issues (title, description, priority, status, category, reporter_name, department) VALUES
('Server downtime', 'Website was down for 2 hours yesterday', 'high', 'resolved', 'Technical', 'IT Manager', 'IT Team'),
('Budget overrun', 'Marketing budget exceeded by 15%', 'medium', 'open', 'Financial', 'Finance Manager', 'Finance Team');
```

## 🎯 Expected Results:

After uploading data via Supabase:

1. **✅ Data appears immediately** in your dashboard
2. **✅ All tabs show real information** instead of sample data
3. **✅ Filters work correctly** (department, time period, etc.)
4. **✅ Search functionality works** across all data
5. **✅ No authentication required** for viewing data

This method bypasses the upload issues and gets your data directly into the system! 🚀
