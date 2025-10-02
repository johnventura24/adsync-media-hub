# 🔄 ALTERNATIVE DATA UPLOAD METHODS

Since the command-line tools aren't working, here are other reliable methods:

## Method 1: Direct Supabase Table Editor (EASIEST)

### Step 1: Open Your CSV/Excel File
1. **Open your file** in Excel, Google Sheets, or Numbers
2. **View your data** to understand the structure

### Step 2: Go to Supabase Dashboard
1. **Visit**: https://supabase.com
2. **Sign in** and select your project
3. **Go to Table Editor**

### Step 3: Create/Check Tables
**Click "New Table" or select existing table**

For **Scorecards**:
```sql
-- Run this in SQL Editor first
CREATE TABLE IF NOT EXISTS public.scorecards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  goal TEXT,
  average TEXT,
  total TEXT,
  owner_name TEXT,
  department TEXT DEFAULT 'Account Team',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Step 4: Insert Data Manually
1. **Click "Insert" → "Insert row"**
2. **Fill in each field**:
   - name: "Copywriter - Total Deliverables"
   - goal: ">= 1"
   - average: "0"
   - total: "0"
   - owner_name: "John Smith"
   - department: "Account Team"
3. **Click "Save"**
4. **Repeat for each row**

---

## Method 2: Google Sheets + Copy/Paste SQL

### Step 1: Open Google Sheets
1. **Upload your CSV** to Google Sheets
2. **Or copy/paste** your Excel data

### Step 2: Create SQL Formula
**In a new column, create a formula like this:**

```
="INSERT INTO public.scorecards (name, goal, average, total, owner_name, department) VALUES ('"&A2&"', '"&B2&"', '"&C2&"', '"&D2&"', '"&E2&"', 'Account Team');"
```

### Step 3: Copy Generated SQL
1. **Drag the formula down** for all rows
2. **Copy all the generated SQL statements**
3. **Paste into Supabase SQL Editor**
4. **Run the query**

---

## Method 3: Online CSV to SQL Converter

### Step 1: Use Online Tool
**Go to any of these websites:**
- https://www.convertcsv.com/csv-to-sql.htm
- https://tableconvert.com/csv-to-sql
- https://codebeautify.org/csv-to-sql-converter

### Step 2: Upload Your CSV
1. **Upload your CSV file**
2. **Set table name**: `scorecards`
3. **Configure columns**:
   - name → TEXT
   - goal → TEXT
   - average → TEXT
   - total → TEXT
   - owner_name → TEXT
   - department → TEXT

### Step 3: Generate and Run SQL
1. **Download or copy** the generated SQL
2. **Paste into Supabase SQL Editor**
3. **Run the query**

---

## Method 4: Manual SQL Creation (Copy/Paste Template)

### Step 1: Use This Template
**Copy this template and fill in your data:**

```sql
-- Create table first
CREATE TABLE IF NOT EXISTS public.scorecards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  goal TEXT,
  average TEXT,
  total TEXT,
  owner_name TEXT,
  department TEXT DEFAULT 'Account Team',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert your data (modify the values below)
INSERT INTO public.scorecards (name, goal, average, total, owner_name, department) VALUES
('Copywriter - Total Deliverables', '>= 1', '0', '0', 'John Smith', 'Account Team'),
('Designer - Projects Completed', '>= 5', '3', '3', 'Jane Doe', 'Account Team'),
('Manager - Team Performance', '>= 90%', '85%', '85%', 'Bob Wilson', 'Account Team'),
('Client Satisfaction Score', '>= 4.5', '4.2', '4.2', 'Sarah Johnson', 'Account Team'),
('Revenue Target Achievement', '>= 100%', '95%', '95%', 'Mike Chen', 'Account Team');

-- Add more rows by copying the pattern above
-- ('Your Data Here', 'Goal', 'Average', 'Total', 'Owner Name', 'Account Team'),

-- Verify data was inserted
SELECT * FROM public.scorecards ORDER BY created_at DESC;
```

### Step 2: Replace with Your Data
1. **Look at your CSV/Excel**
2. **Replace the sample data** with your actual data
3. **Add more rows** as needed
4. **Run in Supabase SQL Editor**

---

## Method 5: Excel Formula Method

### Step 1: Open Your Excel File
**Add a new column with this formula:**

```excel
="INSERT INTO public.scorecards (name, goal, average, total, owner_name, department) VALUES ('"&A2&"', '"&B2&"', '"&C2&"', '"&D2&"', '"&E2&"', 'Account Team');"
```

### Step 2: Generate SQL
1. **Drag formula down** for all rows
2. **Copy all generated SQL**
3. **Paste into Supabase**

---

## Method 6: Simple Text Editor Method

### Step 1: Open Your CSV in Text Editor
1. **Open your CSV** in Notepad, TextEdit, or any text editor
2. **See the raw data** format

### Step 2: Create SQL Manually
**For each line, create an INSERT statement:**

If your CSV looks like:
```
Name,Goal,Average,Total,Owner
Copywriter - Total Deliverables,>= 1,0,0,John Smith
Designer - Projects Completed,>= 5,3,3,Jane Doe
```

**Create SQL like:**
```sql
INSERT INTO public.scorecards (name, goal, average, total, owner_name, department) VALUES
('Copywriter - Total Deliverables', '>= 1', '0', '0', 'John Smith', 'Account Team'),
('Designer - Projects Completed', '>= 5', '3', '3', 'Jane Doe', 'Account Team');
```

---

## Method 7: Supabase API (Advanced)

### Step 1: Get Your API Keys
1. **Go to Supabase → Settings → API**
2. **Copy your URL and anon key**

### Step 2: Use Browser Console
1. **Open your dashboard** in browser
2. **Press F12** → Console tab
3. **Paste this code** (replace with your data):

```javascript
// Replace with your actual Supabase URL and key
const supabaseUrl = 'https://istwwliiuddornffbirt.supabase.co'
const supabaseKey = 'your-anon-key-here'

// Your data array
const data = [
  {
    name: 'Copywriter - Total Deliverables',
    goal: '>= 1',
    average: '0',
    total: '0',
    owner_name: 'John Smith',
    department: 'Account Team'
  },
  {
    name: 'Designer - Projects Completed',
    goal: '>= 5',
    average: '3',
    total: '3',
    owner_name: 'Jane Doe',
    department: 'Account Team'
  }
];

// Upload function
fetch(`${supabaseUrl}/rest/v1/scorecards`, {
  method: 'POST',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  },
  body: JSON.stringify(data)
}).then(response => {
  if (response.ok) {
    console.log('✅ Data uploaded successfully!');
  } else {
    console.error('❌ Upload failed:', response.status);
  }
});
```

---

## 🎯 RECOMMENDED APPROACH (EASIEST)

**Method 1 (Manual Table Editor) is the most reliable:**

1. **Go to Supabase → SQL Editor**
2. **Run the table creation SQL** (from Method 4)
3. **Go to Table Editor → scorecards**
4. **Click "Insert row"** and add data manually
5. **Repeat for each row**

**This method ALWAYS works and doesn't depend on any tools!**

---

## 🔧 TROUBLESHOOTING

### If you get "table does not exist":
```sql
CREATE TABLE public.scorecards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  goal TEXT,
  average TEXT,
  total TEXT,
  owner_name TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### If you get "column does not exist":
```sql
ALTER TABLE public.scorecards 
ADD COLUMN IF NOT EXISTS goal TEXT,
ADD COLUMN IF NOT EXISTS average TEXT,
ADD COLUMN IF NOT EXISTS total TEXT,
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS department TEXT;
```

**These methods will definitely work since they don't rely on local tools!** 🚀

