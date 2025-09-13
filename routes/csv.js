const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
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
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// CSV parsing utilities
const parseCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const errors = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push(data);
      })
      .on('error', (error) => {
        errors.push(error);
      })
      .on('end', () => {
        if (errors.length > 0) {
          reject(errors);
        } else {
          resolve(results);
        }
      });
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
router.get('/import-types', authenticateToken, (req, res) => {
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
        description: 'Import scorecards and KPI tracking',
        requiredFields: ['name'],
        optionalFields: ['description', 'frequency', 'is_active'],
        sampleData: {
          name: 'Sales Scorecard',
          description: 'Track sales team performance',
          frequency: 'weekly',
          is_active: 'true'
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
      }
    ]
  });
});

// Upload and preview CSV file
router.post('/upload', authenticateToken, upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No CSV file uploaded'
      });
    }

    const { type } = req.body;
    if (!type || !['users', 'scorecards', 'rocks', 'todos', 'issues', 'meetings', 'processes'].includes(type)) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Invalid import type'
      });
    }

    // Parse CSV file
    const csvData = await parseCSVFile(req.file.path);
    
    if (csvData.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'CSV file is empty'
      });
    }

    // Validate data based on type
    let validationErrors = [];
    csvData.forEach((row, index) => {
      switch (type) {
        case 'users':
          validationErrors = validationErrors.concat(validateUserData(row, index));
          break;
        case 'scorecards':
          validationErrors = validationErrors.concat(validateScorecardData(row, index));
          break;
        case 'rocks':
          validationErrors = validationErrors.concat(validateRockData(row, index));
          break;
        case 'todos':
          validationErrors = validationErrors.concat(validateTodoData(row, index));
          break;
        case 'issues':
          validationErrors = validationErrors.concat(validateIssueData(row, index));
          break;
      }
    });

    res.json({
      message: 'CSV file uploaded and parsed successfully',
      filename: req.file.filename,
      type: type,
      recordCount: csvData.length,
      preview: csvData.slice(0, 5), // First 5 rows for preview
      headers: Object.keys(csvData[0] || {}),
      validationErrors: validationErrors,
      isValid: validationErrors.length === 0
    });

  } catch (error) {
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('CSV upload error:', error);
    res.status(500).json({
      error: 'Failed to process CSV file',
      details: error.message
    });
  }
});

// Import CSV data
router.post('/import', authenticateToken, requireManagerOrAdmin, getUserOrganizations, async (req, res) => {
  try {
    const { filename, type, organizationId } = req.body;

    if (!filename || !type || !organizationId) {
      return res.status(400).json({
        error: 'Filename, type, and organization ID are required'
      });
    }

    // Check organization access
    const hasAccess = req.user.organizations.some(
      org => org.organization_id === organizationId
    );

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied to this organization'
      });
    }

    const filePath = path.join(__dirname, '../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'CSV file not found'
      });
    }

    // Parse CSV file again
    const csvData = await parseCSVFile(filePath);
    
    let importedCount = 0;
    let errors = [];
    const importResults = [];

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      
      try {
        let transformedData;
        let tableName;
        
        switch (type) {
          case 'users':
            transformedData = transformUserData(row, organizationId);
            tableName = 'users';
            break;
          case 'scorecards':
            transformedData = transformScorecardData(row, organizationId, req.user.id);
            tableName = 'scorecards';
            break;
          case 'rocks':
            transformedData = transformRockData(row, organizationId, req.user.id);
            tableName = 'rocks';
            break;
          case 'todos':
            transformedData = transformTodoData(row, organizationId, req.user.id);
            tableName = 'todos';
            break;
          case 'issues':
            transformedData = transformIssueData(row, organizationId, req.user.id);
            tableName = 'issues';
            break;
          default:
            throw new Error('Invalid import type');
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
