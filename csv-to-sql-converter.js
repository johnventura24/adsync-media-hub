#!/usr/bin/env node

const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// CSV to SQL Converter for Supabase
// Usage: node csv-to-sql-converter.js <csv-file> <table-name>

if (process.argv.length < 4) {
  console.log('Usage: node csv-to-sql-converter.js <csv-file> <table-name>');
  console.log('Example: node csv-to-sql-converter.js data.csv scorecards');
  process.exit(1);
}

const csvFile = process.argv[2];
const tableName = process.argv[3];

if (!fs.existsSync(csvFile)) {
  console.error(`Error: File ${csvFile} not found`);
  process.exit(1);
}

console.log(`🔄 Converting ${csvFile} to SQL INSERT statements for table: ${tableName}`);

const results = [];

fs.createReadStream(csvFile)
  .pipe(csv())
  .on('data', (data) => {
    results.push(data);
  })
  .on('end', () => {
    if (results.length === 0) {
      console.error('❌ No data found in CSV file');
      return;
    }

    console.log(`📊 Found ${results.length} rows of data`);
    
    // Get column names from first row
    const columns = Object.keys(results[0]);
    console.log(`📝 Columns: ${columns.join(', ')}`);

    // Generate SQL
    let sql = `-- Generated SQL for ${tableName} from ${csvFile}\n`;
    sql += `-- Run this in your Supabase SQL Editor\n\n`;
    
    sql += `INSERT INTO public.${tableName} (`;
    
    // Map common CSV columns to database columns
    const columnMappings = {
      'Name': 'name',
      'Title': 'title', 
      'Description': 'description',
      'Goal': 'goal',
      'Average': 'average',
      'Total': 'total',
      'Owner': 'owner_name',
      'Assignee': 'assignee_name',
      'Reporter': 'reporter_name',
      'Department': 'department',
      'Team': 'department',
      'Priority': 'priority',
      'Status': 'status',
      'Category': 'category',
      'Quarter': 'quarter',
      'Year': 'year',
      'Due Date': 'due_date',
      'Completion': 'completion_percentage',
      'Progress': 'progress_percentage',
      'Frequency': 'frequency'
    };

    // Map columns
    const mappedColumns = columns.map(col => {
      return columnMappings[col] || col.toLowerCase().replace(/\s+/g, '_');
    });

    sql += mappedColumns.join(', ');
    sql += ') VALUES\n';

    // Add data rows
    const valueRows = results.map((row, index) => {
      const values = columns.map(col => {
        let value = row[col];
        if (value === null || value === undefined || value === '') {
          return 'NULL';
        }
        
        // Handle different data types
        if (typeof value === 'string') {
          // Escape single quotes
          value = value.replace(/'/g, "''");
          return `'${value}'`;
        }
        
        return value;
      });
      
      return `  (${values.join(', ')})`;
    });

    sql += valueRows.join(',\n');
    sql += ';\n\n';
    
    sql += `-- Verify the data was inserted\n`;
    sql += `SELECT COUNT(*) as inserted_rows FROM public.${tableName};\n`;
    sql += `SELECT * FROM public.${tableName} ORDER BY created_at DESC LIMIT 5;`;

    // Write SQL to file
    const outputFile = `${path.basename(csvFile, '.csv')}_${tableName}.sql`;
    fs.writeFileSync(outputFile, sql);
    
    console.log(`✅ SQL generated successfully!`);
    console.log(`📄 Output file: ${outputFile}`);
    console.log(`\n🚀 Next steps:`);
    console.log(`1. Open Supabase → SQL Editor`);
    console.log(`2. Copy and paste the contents of ${outputFile}`);
    console.log(`3. Click "Run" to insert the data`);
    console.log(`4. Check your dashboard at https://adsync-media-hub.onrender.com/data`);
    
    // Also output to console for easy copy/paste
    console.log(`\n📋 SQL to copy/paste:\n`);
    console.log('=' .repeat(80));
    console.log(sql);
    console.log('=' .repeat(80));
  })
  .on('error', (error) => {
    console.error('❌ Error reading CSV:', error.message);
  });
