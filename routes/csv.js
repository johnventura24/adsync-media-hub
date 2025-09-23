const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');
const { supabase } = require('../config/database');
const { authenticateToken, requireManagerOrAdmin, getUserOrganizations, requireOrganizationAccess } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/csv',
      'text/plain'
    ];
    
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files (.csv, .xlsx, .xls) are allowed'), false);
    }
  }
});

// Excel parsing utilities
const parseExcelFile = (filePath) => {
  try {
    console.log('Starting Excel parsing for:', filePath);
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    
    // Get the first sheet name
    const sheetName = workbook.SheetNames[0];
    console.log('Reading sheet:', sheetName);
    
    // Get the worksheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Use first row as headers
      defval: '', // Default value for empty cells
      blankrows: false // Skip blank rows
    });
    
    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }
    
    // Convert array format to object format
    const headers = jsonData[0];
    const results = [];
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = jsonData[i][index] || '';
      });
      
      // Only add rows that have some data
      const hasData = Object.values(row).some(value => value && value.toString().trim() !== '');
      if (hasData) {
        results.push(row);
      }
    }
    
    console.log('Excel parsing completed. Total rows:', results.length);
    return results;
    
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error(`Excel parsing failed: ${error.message}`);
  }
};

// CSV parsing utilities
const parseCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    
    console.log('Starting CSV parsing for:', filePath);
    
    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv({
        skipEmptyLines: true,
        skipLinesWithError: false,
        trim: true,
        // Handle different separators
        separator: 'auto',
        // Handle quotes
        quote: '"',
        escape: '"',
      }))
      .on('data', (data) => {
        console.log('CSV row parsed:', data);
        results.push(data);
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        errors.push(error);
      })
      .on('end', () => {
        console.log('CSV parsing completed. Total rows:', results.length);
        if (errors.length > 0) {
          console.error('CSV parsing had errors:', errors);
          reject(new Error(`CSV parsing failed: ${errors.map(e => e.message).join(', ')}`));
        } else {
          resolve(results);
        }
      });
  });
};

// Universal file parser - handles both CSV and Excel
const parseDataFile = async (filePath) => {
  const fileExtension = path.extname(filePath).toLowerCase();
  
  console.log('Parsing file with extension:', fileExtension);
  
  try {
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      return parseExcelFile(filePath);
    } else {
      return await parseCSVFile(filePath);
    }
  } catch (error) {
    console.error('Primary parsing failed, trying fallback methods:', error);
    
    // Fallback: Try parsing as Excel even if extension is .csv (in case it's misnamed)
    if (fileExtension === '.csv') {
      try {
        console.log('Trying to parse CSV file as Excel (fallback)');
        return parseExcelFile(filePath);
      } catch (excelError) {
        console.error('Excel fallback also failed:', excelError);
      }
    }
    
    // Fallback: Try parsing with different CSV options
    try {
      console.log('Trying CSV with different separators');
      return await parseCSVFileWithFallback(filePath);
    } catch (fallbackError) {
      console.error('All parsing methods failed:', fallbackError);
      throw new Error(`Could not parse file: ${error.message}`);
    }
  }
};

// Fallback CSV parser with different options
const parseCSVFileWithFallback = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const separators = [',', ';', '\t', '|'];
    
    // Try different separators
    let currentSeparatorIndex = 0;
    
    const tryNextSeparator = () => {
      if (currentSeparatorIndex >= separators.length) {
        reject(new Error('Could not parse CSV with any separator'));
        return;
      }
      
      const separator = separators[currentSeparatorIndex];
      console.log('Trying CSV separator:', separator);
      
      const tempResults = [];
      
      fs.createReadStream(filePath, { encoding: 'utf8' })
        .pipe(csv({
          separator: separator,
          skipEmptyLines: true,
          trim: true,
          quote: '"',
          escape: '"',
        }))
        .on('data', (data) => {
          tempResults.push(data);
        })
        .on('error', (error) => {
          console.error(`CSV parsing error with separator '${separator}':`, error);
          currentSeparatorIndex++;
          tryNextSeparator();
        })
        .on('end', () => {
          if (tempResults.length > 0) {
            console.log(`Successfully parsed with separator '${separator}':`, tempResults.length, 'rows');
            resolve(tempResults);
          } else {
            currentSeparatorIndex++;
            tryNextSeparator();
          }
        });
    };
    
    tryNextSeparator();
  });
};

// Validation functions for different entity types
const validateUserData = (row, index) => {
  const errors = [];
  const requiredFields = ['email', 'first_name', 'last_name'];
  
  requiredFields.forEach(field => {
    if (!row[field] || row[field].trim() === '') {
      errors.push(`Row ${index + 1}: ${field} is required`);
    }
  });
  
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push(`Row ${index + 1}: Invalid email format`);
  }
  
  return errors;
};

const validateScorecardData = (row, index) => {
  const errors = [];
  const requiredFields = ['name'];
  
  requiredFields.forEach(field => {
    if (!row[field] || row[field].trim() === '') {
      errors.push(`Row ${index + 1}: ${field} is required`);
    }
  });
  
  if (row.frequency && !['daily', 'weekly', 'monthly', 'quarterly'].includes(row.frequency.toLowerCase())) {
    errors.push(`Row ${index + 1}: Invalid frequency. Must be daily, weekly, monthly, or quarterly`);
  }
  
  return errors;
};

const validateRockData = (row, index) => {
  const errors = [];
  const requiredFields = ['title', 'quarter', 'year'];
  
  requiredFields.forEach(field => {
    if (!row[field] || row[field].toString().trim() === '') {
      errors.push(`Row ${index + 1}: ${field} is required`);
    }
  });
  
  const quarter = parseInt(row.quarter);
  const year = parseInt(row.year);
  
  if (isNaN(quarter) || quarter < 1 || quarter > 4) {
    errors.push(`Row ${index + 1}: Quarter must be between 1 and 4`);
  }
  
  if (isNaN(year) || year < 2020 || year > 2030) {
    errors.push(`Row ${index + 1}: Year must be between 2020 and 2030`);
  }
  
  if (row.completion_percentage) {
    const percentage = parseInt(row.completion_percentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      errors.push(`Row ${index + 1}: Completion percentage must be between 0 and 100`);
    }
  }
  
  return errors;
};

const validateTodoData = (row, index) => {
  const errors = [];
  const requiredFields = ['title'];
  
  requiredFields.forEach(field => {
    if (!row[field] || row[field].trim() === '') {
      errors.push(`Row ${index + 1}: ${field} is required`);
    }
  });
  
  if (row.priority && !['low', 'medium', 'high', 'urgent'].includes(row.priority.toLowerCase())) {
    errors.push(`Row ${index + 1}: Invalid priority. Must be low, medium, high, or urgent`);
  }
  
  if (row.status && !['pending', 'in_progress', 'completed', 'cancelled'].includes(row.status.toLowerCase())) {
    errors.push(`Row ${index + 1}: Invalid status. Must be pending, in_progress, completed, or cancelled`);
  }
  
  return errors;
};

const validateIssueData = (row, index) => {
  const errors = [];
  const requiredFields = ['title'];
  
  requiredFields.forEach(field => {
    if (!row[field] || row[field].trim() === '') {
      errors.push(`Row ${index + 1}: ${field} is required`);
    }
  });
  
  if (row.priority && !['low', 'medium', 'high', 'critical'].includes(row.priority.toLowerCase())) {
    errors.push(`Row ${index + 1}: Invalid priority. Must be low, medium, high, or critical`);
  }
  
  if (row.status && !['open', 'in_progress', 'resolved', 'closed'].includes(row.status.toLowerCase())) {
    errors.push(`Row ${index + 1}: Invalid status. Must be open, in_progress, resolved, or closed`);
  }
  
  return errors;
};

// Data transformation functions
const transformUserData = (row, organizationId) => ({
  id: uuidv4(),
  email: row.email.toLowerCase().trim(),
  first_name: row.first_name.trim(),
  last_name: row.last_name.trim(),
  role: row.role ? row.role.toLowerCase() : 'member',
  department: row.department ? row.department.trim() : null,
  position: row.position ? row.position.trim() : null,
  phone: row.phone ? row.phone.trim() : null,
  is_active: row.is_active ? row.is_active.toLowerCase() === 'true' : true,
  password_hash: '$2a$12$defaulthash' // Temporary hash, users will need to reset password
});

const transformScorecardData = (row, organizationId, userId) => ({
  id: uuidv4(),
  organization_id: organizationId,
  name: row.name.trim(),
  description: row.description ? row.description.trim() : null,
  owner_id: userId,
  frequency: row.frequency ? row.frequency.toLowerCase() : 'weekly',
  is_active: row.is_active ? row.is_active.toLowerCase() === 'true' : true
});

const transformRockData = (row, organizationId, userId) => ({
  id: uuidv4(),
  organization_id: organizationId,
  title: row.title.trim(),
  description: row.description ? row.description.trim() : null,
  owner_id: userId,
  quarter: parseInt(row.quarter),
  year: parseInt(row.year),
  priority: row.priority ? parseInt(row.priority) : 1,
  status: row.status ? row.status.toLowerCase() : 'not_started',
  completion_percentage: row.completion_percentage ? parseInt(row.completion_percentage) : 0,
  due_date: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : null
});

const transformTodoData = (row, organizationId, userId) => ({
  id: uuidv4(),
  organization_id: organizationId,
  title: row.title.trim(),
  description: row.description ? row.description.trim() : null,
  assignee_id: userId,
  created_by: userId,
  priority: row.priority ? row.priority.toLowerCase() : 'medium',
  status: row.status ? row.status.toLowerCase() : 'pending',
  due_date: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : null
});

const transformIssueData = (row, organizationId, userId) => ({
  id: uuidv4(),
  organization_id: organizationId,
  title: row.title.trim(),
  description: row.description ? row.description.trim() : null,
  reporter_id: userId,
  assignee_id: userId,
  priority: row.priority ? row.priority.toLowerCase() : 'medium',
  status: row.status ? row.status.toLowerCase() : 'open',
  category: row.category ? row.category.trim() : null,
  due_date: row.due_date ? new Date(row.due_date).toISOString().split('T')[0] : null
});

// Get supported import types
router.get('/import-types', (req, res) => {
  res.json({
    types: [
      {
        type: 'users',
        name: 'Users',
        description: 'Import user accounts and profiles',
        requiredFields: ['email', 'first_name', 'last_name'],
        optionalFields: ['role', 'department', 'position', 'phone', 'is_active'],
        sampleData: {
          email: 'john.doe@company.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'member',
          department: 'Sales',
          position: 'Sales Manager',
          phone: '+1234567890',
          is_active: 'true'
        }
      },
      {
        type: 'scorecards',
        name: 'Scorecards',
        description: 'Import scorecards and KPI tracking data',
        requiredFields: [],
        optionalFields: ['Any columns - flexible structure'],
        sampleData: {
          title: 'Copywriter - Total Deliverables',
          goal: '>= 1',
          average: '0',
          total: '0'
        }
      },
      {
        type: 'rocks',
        name: 'Rocks (Goals)',
        description: 'Import quarterly goals and objectives',
        requiredFields: ['title', 'quarter', 'year'],
        optionalFields: ['description', 'priority', 'status', 'completion_percentage', 'due_date'],
        sampleData: {
          title: 'Increase revenue by 20%',
          description: 'Focus on new customer acquisition',
          quarter: '1',
          year: '2024',
          priority: '1',
          status: 'in_progress',
          completion_percentage: '75',
          due_date: '2024-03-31'
        }
      },
      {
        type: 'todos',
        name: 'To-Dos',
        description: 'Import tasks and action items',
        requiredFields: ['title'],
        optionalFields: ['description', 'priority', 'status', 'due_date'],
        sampleData: {
          title: 'Complete quarterly review',
          description: 'Prepare presentation for board meeting',
          priority: 'high',
          status: 'pending',
          due_date: '2024-01-31'
        }
      },
      {
        type: 'issues',
        name: 'Issues',
        description: 'Import business issues and problems',
        requiredFields: ['title'],
        optionalFields: ['description', 'priority', 'status', 'category', 'due_date'],
        sampleData: {
          title: 'System performance issues',
          description: 'Database queries are running slowly',
          priority: 'high',
          status: 'open',
          category: 'Technical',
          due_date: '2024-02-15'
        }
      },
      {
        type: 'generic',
        name: 'Generic Data',
        description: 'Import any CSV data with flexible structure',
        requiredFields: [],
        optionalFields: ['Any columns accepted - no template required'],
        sampleData: {
          'Column 1': 'Any data',
          'Column 2': 'Any format',
          'Column 3': 'Flexible import'
        }
      }
    ]
  });
});

// Upload and preview CSV file
router.post('/upload', upload.single('csvFile'), async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('File info:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file');
    
    if (!req.file) {
      return res.status(400).json({
        error: 'No CSV file uploaded'
      });
    }

    const { type } = req.body;
    console.log('Import type:', type);
    
    if (!type) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Import type is required'
      });
    }

    // Check if file exists and is readable
    if (!fs.existsSync(req.file.path)) {
      return res.status(400).json({
        error: 'Uploaded file not found'
      });
    }

    // Read file content for debugging
    let fileContent;
    try {
      fileContent = fs.readFileSync(req.file.path, 'utf8');
      console.log('File content preview (first 500 chars):', fileContent.substring(0, 500));
      console.log('File size:', fileContent.length, 'characters');
      console.log('File encoding check - first 20 bytes as hex:', Buffer.from(fileContent.substring(0, 20)).toString('hex'));
    } catch (readError) {
      console.error('Could not read file as UTF-8, trying binary:', readError);
      try {
        const binaryContent = fs.readFileSync(req.file.path);
        console.log('File size (binary):', binaryContent.length, 'bytes');
        console.log('First 20 bytes as hex:', binaryContent.subarray(0, 20).toString('hex'));
      } catch (binaryError) {
        console.error('Could not read file at all:', binaryError);
      }
    }

    // Parse file (CSV or Excel)
    const fileData = await parseDataFile(req.file.path);
    console.log('Parsed file data:', fileData.length, 'rows');
    console.log('First row sample:', fileData[0]);
    
    if (fileData.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'File is empty or could not be parsed. Please check the file format.'
      });
    }

    // Flexible validation - accept any file structure
    let validationErrors = [];
    fileData.forEach((row, index) => {
      const rowNumber = index + 1;
      const hasData = Object.values(row).some(value => value && value.toString().trim() !== '');
      
      if (!hasData) {
        validationErrors.push(`Row ${rowNumber}: Empty row`);
      }
    });

    const validRows = fileData.length - validationErrors.length;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const fileType = ['.xlsx', '.xls'].includes(fileExtension) ? 'Excel' : 'CSV';
    
    res.json({
      success: true,
      message: `${fileType} file uploaded and parsed successfully`,
      filename: req.file.filename,
      type: type,
      totalRows: fileData.length,
      validRows: validRows,
      preview: fileData.slice(0, 5), // First 5 rows for preview
      headers: Object.keys(fileData[0] || {}),
      errors: validationErrors,
      isValid: validationErrors.length === 0,
      fileType: fileType
    });

  } catch (error) {
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('CSV upload error:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to process CSV file';
    let errorDetails = error.message;
    
    if (error.message.includes('CSV parsing failed')) {
      errorMessage = 'CSV file format error';
      errorDetails = 'The CSV file could not be parsed. Please check that it is a valid CSV file with proper formatting.';
    } else if (error.code === 'ENOENT') {
      errorMessage = 'File not found';
      errorDetails = 'The uploaded file could not be found on the server.';
    } else if (error.message.includes('LIMIT_FILE_SIZE')) {
      errorMessage = 'File too large';
      errorDetails = 'The CSV file is too large. Please ensure it is under 10MB.';
    }
    
    res.status(500).json({
      error: errorMessage,
      details: errorDetails,
      success: false
    });
  }
});

// Import CSV data (simplified for demo - no auth required)
router.post('/import', async (req, res) => {
  try {
    const { filename, type, organizationId } = req.body;

    if (!filename || !type) {
      return res.status(400).json({
        error: 'Filename and type are required'
      });
    }

    // Use demo organization if not provided
    const orgId = organizationId || '00000000-0000-4000-8000-000000000001';

    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'CSV file not found'
      });
    }

    // Parse file again (CSV or Excel)
    const fileData = await parseDataFile(filePath);
    
    let importedCount = 0;
    let errors = [];
    const importResults = [];

    // Process each row
    for (let i = 0; i < fileData.length; i++) {
      const row = fileData[i];
      
      try {
        let transformedData;
        let tableName;
        
        switch (type) {
          case 'scorecards':
          case 'generic':
            // Create a generic scorecard entry from any CSV data
            transformedData = {
              id: uuidv4(),
              name: row.Title || row.title || row.Name || row.name || `Imported Item ${i + 1}`,
              description: row.Description || row.description || 'Imported from CSV',
              organization_id: orgId,
              frequency: 'weekly',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              // Store original CSV data as JSON
              raw_data: JSON.stringify(row)
            };
            tableName = 'scorecards';
            break;
          case 'rocks':
            transformedData = {
              id: uuidv4(),
              title: row.Title || row.title || row.Name || row.name || `Rock ${i + 1}`,
              description: row.Description || row.description || 'Imported from CSV',
              organization_id: orgId,
              owner_id: '00000000-0000-4000-8000-000000000002', // Demo user
              quarter: row.Quarter || row.quarter || 'Q4',
              year: parseInt(row.Year || row.year || new Date().getFullYear()),
              priority: row.Priority || row.priority || 'medium',
              status: row.Status || row.status || 'not_started',
              progress_percentage: parseInt(row.Progress || row.progress || '0'),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            tableName = 'rocks';
            break;
          case 'todos':
            transformedData = {
              id: uuidv4(),
              title: row.Title || row.title || row.Name || row.name || `Task ${i + 1}`,
              description: row.Description || row.description || 'Imported from CSV',
              organization_id: orgId,
              assignee_id: '00000000-0000-4000-8000-000000000002', // Demo user
              priority: row.Priority || row.priority || 'medium',
              status: row.Status || row.status || 'pending',
              due_date: row.DueDate || row.due_date || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            tableName = 'todos';
            break;
          case 'issues':
            transformedData = {
              id: uuidv4(),
              title: row.Title || row.title || row.Name || row.name || `Issue ${i + 1}`,
              description: row.Description || row.description || 'Imported from CSV',
              organization_id: orgId,
              reporter_id: '00000000-0000-4000-8000-000000000002', // Demo user
              assignee_id: '00000000-0000-4000-8000-000000000002', // Demo user
              priority: row.Priority || row.priority || 'medium',
              status: row.Status || row.status || 'open',
              category: row.Category || row.category || 'general',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            tableName = 'issues';
            break;
          default:
            // For any other type, store as generic scorecard
            transformedData = {
              id: uuidv4(),
              name: `${type} - ${row.Title || row.title || row.Name || row.name || `Item ${i + 1}`}`,
              description: 'Imported from CSV',
              organization_id: orgId,
              frequency: 'weekly',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              raw_data: JSON.stringify(row)
            };
            tableName = 'scorecards';
        }

        // Insert into database
        const { data, error } = await supabase
          .from(tableName)
          .insert(transformedData)
          .select()
          .single();

        if (error) {
          errors.push(`Row ${i + 1}: ${error.message}`);
        } else {
          importedCount++;
          importResults.push(data);
          
          // For users, also add to organization
          if (type === 'users') {
            await supabase
              .from('user_organizations')
              .insert({
                user_id: data.id,
                organization_id: organizationId,
                role: data.role
              });
          }
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      message: `Import completed. ${importedCount} records imported successfully.`,
      importedCount,
      totalRows: csvData.length,
      errors: errors,
      hasErrors: errors.length > 0,
      results: importResults
    });

  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({
      error: 'Failed to import CSV data',
      details: error.message
    });
  }
});

// Get import history
router.get('/history', authenticateToken, getUserOrganizations, async (req, res) => {
  try {
    const organizationIds = req.user.organizations.map(org => org.organization_id);
    
    // This would require an import_history table in a real implementation
    // For now, we'll return a placeholder response
    res.json({
      imports: [],
      message: 'Import history feature will be implemented with audit logging'
    });
  } catch (error) {
    console.error('Import history error:', error);
    res.status(500).json({
      error: 'Failed to fetch import history'
    });
  }
});

// Download CSV template
router.get('/template/:type', authenticateToken, (req, res) => {
  try {
    const { type } = req.params;
    
    if (!['users', 'scorecards', 'rocks', 'todos', 'issues'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid template type'
      });
    }

    let headers = [];
    let sampleRow = [];

    switch (type) {
      case 'users':
        headers = ['email', 'first_name', 'last_name', 'role', 'department', 'position', 'phone', 'is_active'];
        sampleRow = ['john.doe@company.com', 'John', 'Doe', 'member', 'Sales', 'Sales Manager', '+1234567890', 'true'];
        break;
      case 'scorecards':
        headers = ['name', 'description', 'frequency', 'is_active'];
        sampleRow = ['Sales Scorecard', 'Track sales team performance', 'weekly', 'true'];
        break;
      case 'rocks':
        headers = ['title', 'description', 'quarter', 'year', 'priority', 'status', 'completion_percentage', 'due_date'];
        sampleRow = ['Increase revenue by 20%', 'Focus on new customer acquisition', '1', '2024', '1', 'in_progress', '75', '2024-03-31'];
        break;
      case 'todos':
        headers = ['title', 'description', 'priority', 'status', 'due_date'];
        sampleRow = ['Complete quarterly review', 'Prepare presentation for board meeting', 'high', 'pending', '2024-01-31'];
        break;
      case 'issues':
        headers = ['title', 'description', 'priority', 'status', 'category', 'due_date'];
        sampleRow = ['System performance issues', 'Database queries are running slowly', 'high', 'open', 'Technical', '2024-02-15'];
        break;
    }

    const csvContent = [
      headers.join(','),
      sampleRow.join(',')
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_template.csv`);
    res.send(csvContent);

  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({
      error: 'Failed to generate CSV template'
    });
  }
});

module.exports = router;
