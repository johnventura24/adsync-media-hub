# 📊 UPLOAD CSV/EXCEL TO SUPABASE - COMPLETE GUIDE

## Method 1: Using the CSV-to-SQL Converter Tool (RECOMMENDED)

### Step 1: Prepare Your CSV/Excel File
1. **Save your Excel file as CSV** (if it's not already)
   - Open in Excel → File → Save As → CSV (Comma delimited)
2. **Place the file** in your project folder: `/Users/kenjialdama/Documents/Hub/`

### Step 2: Use the Converter Tool
```bash
# Navigate to your project folder
cd /Users/kenjialdama/Documents/Hub

# Convert your CSV to SQL (replace with your actual filename)
node csv-to-sql-converter.js "Account Team - Data.csv" scorecards

# For other data types:
node csv-to-sql-converter.js "your-rocks-data.csv" rocks
node csv-to-sql-converter.js "your-todos-data.csv" todos
node csv-to-sql-converter.js "your-issues-data.csv" issues
```

### Step 3: Copy the Generated SQL
The tool will output SQL like this:
```sql
INSERT INTO public.scorecards (name, goal, average, total, owner_name, department) VALUES
('Copywriter - Total Deliverables', '>= 1', '0', '0', 'John Smith', 'Account Team'),
('Designer - Projects Completed', '>= 5', '3', '3', 'Jane Doe', 'Account Team');
```

### Step 4: Run in Supabase
1. **Go to Supabase → SQL Editor**
2. **Paste the generated SQL**
3. **Click "Run"**
4. **Data appears immediately in your dashboard!**

---

## Method 2: Supabase Table Editor (Manual)

### Step 1: Open Your CSV/Excel
1. **Open your file** in Excel, Google Sheets, or any spreadsheet app
2. **Copy the data** (select all rows and columns)

### Step 2: Insert via Supabase Interface
1. **Go to Supabase → Table Editor**
2. **Select the appropriate table** (scorecards, rocks, todos, etc.)
3. **Click "Insert" → "Insert row"**
4. **Fill in the data manually** for each row
5. **Repeat for all rows**

---

## Method 3: Bulk Upload via CSV (If Available)

Some Supabase projects have CSV import functionality:

### Step 1: Check for Import Feature
1. **Go to Table Editor → [your table]**
2. **Look for "Import" button or CSV icon**
3. **If available, click it**

### Step 2: Upload CSV
1. **Select your CSV file**
2. **Map columns** to table fields
3. **Preview data**
4. **Import**

---

## Method 4: Manual SQL Creation

### Step 1: Convert Your Data Manually
Open your CSV/Excel and create SQL like this:

**Example for Scorecards:**
```sql
-- First, make sure table has the right columns
ALTER TABLE public.scorecards 
ADD COLUMN IF NOT EXISTS goal VARCHAR(100),
ADD COLUMN IF NOT EXISTS average VARCHAR(100),
ADD COLUMN IF NOT EXISTS total VARCHAR(100),
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Insert your data
INSERT INTO public.scorecards (name, goal, average, total, owner_name, department) VALUES
('Your Scorecard 1', 'Goal 1', 'Avg 1', 'Total 1', 'Owner 1', 'Department 1'),
('Your Scorecard 2', 'Goal 2', 'Avg 2', 'Total 2', 'Owner 2', 'Department 2');
```

### Step 2: Run in Supabase SQL Editor

---

## Method 5: Using Excel/Google Sheets Formulas

### Step 1: Create SQL in Spreadsheet
Add a new column in your spreadsheet with a formula like this:

**In column F (assuming data is in A-E):**
```excel
="INSERT INTO public.scorecards (name, goal, average, total, owner_name, department) VALUES ('"&A2&"', '"&B2&"', '"&C2&"', '"&D2&"', '"&E2&"', 'Account Team');"
```

### Step 2: Copy Generated SQL
1. **Copy all the generated SQL statements**
2. **Paste into Supabase SQL Editor**
3. **Run the query**

---

## 🎯 STEP-BY-STEP EXAMPLE

Let's say you have a file called `Account Team - Data.csv` with this content:
```csv
Name,Goal,Average,Total,Owner
Copywriter - Total Deliverables,>= 1,0,0,John Smith
Designer - Projects Completed,>= 5,3,3,Jane Doe
Manager - Team Performance,>= 90%,85%,85%,Bob Wilson
```

### Using Method 1 (Converter Tool):

1. **Run the converter:**
```bash
cd /Users/kenjialdama/Documents/Hub
node csv-to-sql-converter.js "Account Team - Data.csv" scorecards
```

2. **Copy the output SQL:**
```sql
-- Generated SQL for scorecards from Account Team - Data.csv
INSERT INTO public.scorecards (name, goal, average, total, owner_name, department) VALUES
('Copywriter - Total Deliverables', '>= 1', '0', '0', 'John Smith', 'Account Team'),
('Designer - Projects Completed', '>= 5', '3', '3', 'Jane Doe', 'Account Team'),
('Manager - Team Performance', '>= 90%', '85%', '85%', 'Bob Wilson', 'Account Team');
```

3. **Paste in Supabase SQL Editor and run**

4. **Check your dashboard** - data should appear in the Scorecards tab!

---

## 🔧 TROUBLESHOOTING

### If you get "column does not exist" errors:
1. **First run the table fix script:**
```sql
ALTER TABLE public.scorecards 
ADD COLUMN IF NOT EXISTS goal VARCHAR(100),
ADD COLUMN IF NOT EXISTS average VARCHAR(100),
ADD COLUMN IF NOT EXISTS total VARCHAR(100),
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department VARCHAR(100);
```

### If you get "table does not exist" errors:
1. **Create the table first:**
```sql
CREATE TABLE IF NOT EXISTS public.scorecards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  goal VARCHAR(100),
  average VARCHAR(100),
  total VARCHAR(100),
  owner_name VARCHAR(255),
  department VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### If data doesn't appear in dashboard:
1. **Check the table name** matches what the dashboard expects
2. **Verify column names** are correct
3. **Refresh your dashboard page**

---

## 📋 TABLE MAPPING

Map your CSV data to these Supabase tables:

| CSV Content | Supabase Table | Key Columns |
|-------------|----------------|-------------|
| Scorecards/KPIs | `scorecards` | name, goal, average, total, owner_name, department |
| Goals/Rocks | `rocks` | title, description, quarter, year, status, completion_percentage, owner_name, department |
| Tasks/Action Items | `todos` | title, description, priority, status, assignee_name, department |
| Problems/Issues | `issues` | title, description, priority, status, category, reporter_name, department |
| Meetings | `meetings` | title, description, organizer_name, department, start_time |
| Processes | `processes` | name, description, owner_name, department, steps |

---

## 🚀 QUICK START

**The fastest way to upload your data:**

1. **Save your Excel as CSV**
2. **Run:** `node csv-to-sql-converter.js "your-file.csv" scorecards`
3. **Copy the generated SQL**
4. **Paste in Supabase SQL Editor**
5. **Click "Run"**
6. **Check your dashboard!**

This method handles all the formatting and escaping automatically! 🎉
