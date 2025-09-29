#!/usr/bin/env node

const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const path = require('path');

// Direct CSV/Excel to Supabase uploader
// Usage: node upload-to-supabase.js <file> <table-type>

if (process.argv.length < 4) {
  console.log('📊 CSV/Excel to Supabase Uploader');
  console.log('Usage: node upload-to-supabase.js <file> <table-type>');
  console.log('');
  console.log('Table types:');
  console.log('  scorecards  - KPIs and metrics');
  console.log('  rocks       - Quarterly goals');
  console.log('  todos       - Tasks and action items');
  console.log('  issues      - Problems and issues');
  console.log('  meetings    - Meeting records');
  console.log('  processes   - Business processes');
  console.log('');
  console.log('Examples:');
  console.log('  node upload-to-supabase.js "Account Team - Data.csv" scorecards');
  console.log('  node upload-to-supabase.js "Q1 Goals.xlsx" rocks');
  process.exit(1);
}

const fileName = process.argv[2];
const tableType = process.argv[3];

if (!fs.existsSync(fileName)) {
  console.error(`❌ Error: File "${fileName}" not found`);
  process.exit(1);
}

const validTables = ['scorecards', 'rocks', 'todos', 'issues', 'meetings', 'processes'];
if (!validTables.includes(tableType)) {
  console.error(`❌ Error: Invalid table type "${tableType}"`);
  console.error(`Valid types: ${validTables.join(', ')}`);
  process.exit(1);
}

console.log(`📊 Processing ${fileName} for ${tableType} table...`);

// Table schemas
const tableSchemas = {
  scorecards: {
    tableName: 'scorecards',
    columns: ['name', 'goal', 'average', 'total', 'owner_name', 'department'],
    required: ['name'],
    mapping: {
      'Name': 'name',
      'Title': 'name',
      'Goal': 'goal',
      'Target': 'goal',
      'Average': 'average',
      'Avg': 'average',
      'Total': 'total',
      'Owner': 'owner_name',
      'Assignee': 'owner_name',
      'Department': 'department',
      'Team': 'department'
    }
  },
  rocks: {
    tableName: 'rocks',
    columns: ['title', 'description', 'quarter', 'year', 'status', 'completion_percentage', 'owner_name', 'department'],
    required: ['title', 'quarter', 'year'],
    mapping: {
      'Title': 'title',
      'Name': 'title',
      'Description': 'description',
      'Quarter': 'quarter',
      'Year': 'year',
      'Status': 'status',
      'Progress': 'completion_percentage',
      'Completion': 'completion_percentage',
      'Owner': 'owner_name',
      'Department': 'department',
      'Team': 'department'
    }
  },
  todos: {
    tableName: 'todos',
    columns: ['title', 'description', 'priority', 'status', 'assignee_name', 'department'],
    required: ['title'],
    mapping: {
      'Title': 'title',
      'Task': 'title',
      'Description': 'description',
      'Priority': 'priority',
      'Status': 'status',
      'Assignee': 'assignee_name',
      'Owner': 'assignee_name',
      'Department': 'department',
      'Team': 'department'
    }
  },
  issues: {
    tableName: 'issues',
    columns: ['title', 'description', 'priority', 'status', 'category', 'reporter_name', 'assignee_name', 'department'],
    required: ['title'],
    mapping: {
      'Title': 'title',
      'Issue': 'title',
      'Description': 'description',
      'Priority': 'priority',
      'Status': 'status',
      'Category': 'category',
      'Reporter': 'reporter_name',
      'Assignee': 'assignee_name',
      'Department': 'department',
      'Team': 'department'
    }
  },
  meetings: {
    tableName: 'meetings',
    columns: ['title', 'description', 'organizer_name', 'department', 'start_time'],
    required: ['title'],
    mapping: {
      'Title': 'title',
      'Meeting': 'title',
      'Description': 'description',
      'Organizer': 'organizer_name',
      'Host': 'organizer_name',
      'Department': 'department',
      'Team': 'department',
      'Date': 'start_time',
      'Time': 'start_time'
    }
  },
  processes: {
    tableName: 'processes',
    columns: ['name', 'description', 'owner_name', 'department', 'steps'],
    required: ['name'],
    mapping: {
      'Name': 'name',
      'Process': 'name',
      'Description': 'description',
      'Owner': 'owner_name',
      'Department': 'department',
      'Team': 'department',
      'Steps': 'steps'
    }
  }
};

// Parse file function
async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.xlsx' || ext === '.xls') {
    // Parse Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    return jsonData;
  } else {
    // Parse CSV
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }
}

// Generate SQL
function generateSQL(data, schema) {
  if (data.length === 0) {
    throw new Error('No data found in file');
  }

  console.log(`📋 Found ${data.length} rows of data`);
  console.log(`🔍 Available columns: ${Object.keys(data[0]).join(', ')}`);

  // Map columns
  const mappedData = data.map(row => {
    const mappedRow = {};
    
    // Apply column mapping
    for (const [originalCol, value] of Object.entries(row)) {
      const mappedCol = schema.mapping[originalCol] || originalCol.toLowerCase().replace(/\s+/g, '_');
      if (schema.columns.includes(mappedCol)) {
        mappedRow[mappedCol] = value;
      }
    }

    // Add default values
    if (!mappedRow.department && tableType !== 'processes') {
      mappedRow.department = 'General';
    }
    
    if (tableType === 'rocks') {
      if (!mappedRow.quarter) mappedRow.quarter = 'Q1';
      if (!mappedRow.year) mappedRow.year = new Date().getFullYear();
    }

    return mappedRow;
  });

  // Generate CREATE TABLE statement
  let sql = `-- Upload ${schema.tableName} data from ${fileName}\n`;
  sql += `-- Run this in your Supabase SQL Editor\n\n`;
  
  // Add table creation/column addition
  sql += `-- Ensure table exists with all necessary columns\n`;
  sql += `CREATE TABLE IF NOT EXISTS public.${schema.tableName} (\n`;
  sql += `  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n`;
  
  schema.columns.forEach(col => {
    if (col === 'year') {
      sql += `  ${col} INTEGER,\n`;
    } else if (col.includes('percentage')) {
      sql += `  ${col} INTEGER DEFAULT 0,\n`;
    } else if (col.includes('time') || col.includes('date')) {
      sql += `  ${col} TIMESTAMPTZ,\n`;
    } else {
      sql += `  ${col} VARCHAR(255),\n`;
    }
  });
  
  sql += `  created_at TIMESTAMPTZ DEFAULT NOW(),\n`;
  sql += `  updated_at TIMESTAMPTZ DEFAULT NOW()\n`;
  sql += `);\n\n`;

  // Add column additions for existing tables
  sql += `-- Add missing columns if table already exists\n`;
  schema.columns.forEach(col => {
    sql += `ALTER TABLE public.${schema.tableName} ADD COLUMN IF NOT EXISTS ${col} `;
    if (col === 'year') {
      sql += `INTEGER;\n`;
    } else if (col.includes('percentage')) {
      sql += `INTEGER DEFAULT 0;\n`;
    } else if (col.includes('time') || col.includes('date')) {
      sql += `TIMESTAMPTZ;\n`;
    } else {
      sql += `VARCHAR(255);\n`;
    }
  });

  sql += `\n-- Insert data\n`;
  sql += `INSERT INTO public.${schema.tableName} (${schema.columns.join(', ')}) VALUES\n`;

  const valueRows = mappedData.map((row, index) => {
    const values = schema.columns.map(col => {
      let value = row[col];
      if (value === null || value === undefined || value === '') {
        return 'NULL';
      }
      
      // Handle different data types
      if (col === 'year' || col.includes('percentage')) {
        const num = parseInt(value);
        return isNaN(num) ? 'NULL' : num;
      }
      
      // Escape single quotes
      if (typeof value === 'string') {
        value = value.replace(/'/g, "''");
        return `'${value}'`;
      }
      
      return `'${value}'`;
    });
    
    return `  (${values.join(', ')})`;
  });

  sql += valueRows.join(',\n');
  sql += ';\n\n';
  
  sql += `-- Verify the data was inserted\n`;
  sql += `SELECT COUNT(*) as inserted_rows FROM public.${schema.tableName};\n`;
  sql += `SELECT * FROM public.${schema.tableName} ORDER BY created_at DESC LIMIT 5;`;

  return sql;
}

// Main execution
async function main() {
  try {
    const data = await parseFile(fileName);
    const schema = tableSchemas[tableType];
    const sql = generateSQL(data, schema);
    
    // Write to file
    const outputFile = `${path.basename(fileName, path.extname(fileName))}_${tableType}.sql`;
    fs.writeFileSync(outputFile, sql);
    
    console.log(`\n✅ SQL generated successfully!`);
    console.log(`📄 Output file: ${outputFile}`);
    console.log(`\n🚀 Next steps:`);
    console.log(`1. Open Supabase → SQL Editor`);
    console.log(`2. Copy and paste the contents of ${outputFile}`);
    console.log(`3. Click "Run" to insert the data`);
    console.log(`4. Check your dashboard at https://adsync-media-hub.onrender.com/data`);
    
    console.log(`\n📋 Preview of generated SQL:\n`);
    console.log('=' .repeat(60));
    console.log(sql.substring(0, 500) + '...');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
