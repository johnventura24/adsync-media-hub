const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/database');
const { authenticateToken, getUserOrganizations, requireOrganizationAccess } = require('../middleware/auth');

const router = express.Router();

// Get all processes (no auth required for demo)
router.get('/', async (req, res) => {
  try {
    const { data: processes, error } = await supabase
      .from('processes')
      .select(`
        *,
        owner:users!owner_id(first_name, last_name),
        organization:organizations!organization_id(name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      processes: processes || [],
      total: processes?.length || 0
    });
  } catch (error) {
    console.error('Error fetching processes:', error);
    res.status(500).json({ error: 'Failed to fetch processes' });
  }
});

// Validation rules
const processValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters'),
  body('organizationId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid organization ID is required')
];

// Get processes for organization
router.get('/organization/:organizationId', 
  authenticateToken, 
  getUserOrganizations, 
  requireOrganizationAccess,
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        department = '', 
        category = '',
        ownerId = '',
        isActive
      } = req.query;

      let query = supabase
        .from('processes')
        .select(`
          *,
          owner:users!processes_owner_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          process_executions (
            id,
            status,
            started_at,
            completed_at,
            executed_by:users!process_executions_executed_by_fkey (
              id,
              first_name,
              last_name
            )
          )
        `)
        .eq('organization_id', organizationId);

      // Apply filters
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      if (department) {
        query = query.eq('department', department);
      }
      if (category) {
        query = query.eq('category', category);
      }
      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive === 'true');
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: processes, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Processes fetch error:', error);
        return res.status(500).json({
          error: 'Failed to fetch processes'
        });
      }

      // Sort executions by start date
      const processesWithSortedExecutions = processes.map(process => ({
        ...process,
        process_executions: process.process_executions
          .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
          .slice(0, 5) // Only show last 5 executions
      }));

      res.json({
        processes: processesWithSortedExecutions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          totalPages: Math.ceil(count / limit),
          hasNext: to < count - 1,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      console.error('Get processes error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get single process
router.get('/:processId', authenticateToken, async (req, res) => {
  try {
    const { processId } = req.params;

    const { data: process, error } = await supabase
      .from('processes')
      .select(`
        *,
        owner:users!processes_owner_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        process_executions (
          id,
          status,
          started_at,
          completed_at,
          notes,
          step_results,
          executed_by:users!process_executions_executed_by_fkey (
            id,
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('id', processId)
      .single();

    if (error || !process) {
      return res.status(404).json({
        error: 'Process not found'
      });
    }

    // Sort executions by start date
    process.process_executions = process.process_executions
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

    res.json({ process });

  } catch (error) {
    console.error('Get process error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Create process
router.post('/', 
  authenticateToken, 
  getUserOrganizations, 
  processValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { 
        name, 
        description, 
        department,
        category,
        steps,
        documents,
        version = '1.0',
        organizationId,
        ownerId
      } = req.body;

      // Check organization access
      const hasAccess = req.user.organizations.some(
        org => org.organization_id === organizationId
      );

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this organization'
        });
      }

      const { data: process, error } = await supabase
        .from('processes')
        .insert({
          organization_id: organizationId,
          name,
          description,
          department,
          category,
          steps: steps ? JSON.stringify(steps) : null,
          documents: documents ? JSON.stringify(documents) : null,
          version,
          owner_id: ownerId || req.user.id
        })
        .select(`
          *,
          owner:users!processes_owner_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Process creation error:', error);
        return res.status(500).json({
          error: 'Failed to create process'
        });
      }

      res.status(201).json({
        message: 'Process created successfully',
        process
      });

    } catch (error) {
      console.error('Create process error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Update process
router.put('/:processId', 
  authenticateToken,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Department must be less than 100 characters'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Category must be less than 100 characters'),
    body('version')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Version must be less than 20 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('lastReviewed')
      .optional()
      .isISO8601()
      .withMessage('Last reviewed must be a valid date'),
    body('nextReviewDate')
      .optional()
      .isISO8601()
      .withMessage('Next review date must be a valid date')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { processId } = req.params;
      const { 
        name, 
        description, 
        department,
        category,
        steps,
        documents,
        version,
        isActive,
        lastReviewed,
        nextReviewDate,
        ownerId
      } = req.body;

      // Check if process exists and user has access
      const { data: existingProcess, error: fetchError } = await supabase
        .from('processes')
        .select('id, organization_id, owner_id')
        .eq('id', processId)
        .single();

      if (fetchError || !existingProcess) {
        return res.status(404).json({
          error: 'Process not found'
        });
      }

      // Check if user can edit (owner, manager, or admin)
      const canEdit = existingProcess.owner_id === req.user.id || 
                     req.user.role === 'admin' || 
                     req.user.role === 'manager';

      if (!canEdit) {
        return res.status(403).json({
          error: 'You do not have permission to edit this process'
        });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (department !== undefined) updateData.department = department;
      if (category !== undefined) updateData.category = category;
      if (steps !== undefined) updateData.steps = steps ? JSON.stringify(steps) : null;
      if (documents !== undefined) updateData.documents = documents ? JSON.stringify(documents) : null;
      if (version !== undefined) updateData.version = version;
      if (isActive !== undefined) updateData.is_active = isActive;
      if (lastReviewed !== undefined) updateData.last_reviewed = new Date(lastReviewed).toISOString().split('T')[0];
      if (nextReviewDate !== undefined) updateData.next_review_date = new Date(nextReviewDate).toISOString().split('T')[0];
      if (ownerId !== undefined) updateData.owner_id = ownerId;

      const { data: updatedProcess, error: updateError } = await supabase
        .from('processes')
        .update(updateData)
        .eq('id', processId)
        .select(`
          *,
          owner:users!processes_owner_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (updateError) {
        console.error('Process update error:', updateError);
        return res.status(500).json({
          error: 'Failed to update process'
        });
      }

      res.json({
        message: 'Process updated successfully',
        process: updatedProcess
      });

    } catch (error) {
      console.error('Update process error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Delete process
router.delete('/:processId', authenticateToken, async (req, res) => {
  try {
    const { processId } = req.params;

    // Check if process exists and user has access
    const { data: process, error: fetchError } = await supabase
      .from('processes')
      .select('id, owner_id')
      .eq('id', processId)
      .single();

    if (fetchError || !process) {
      return res.status(404).json({
        error: 'Process not found'
      });
    }

    // Check if user can delete (owner, manager, or admin)
    const canDelete = process.owner_id === req.user.id || 
                     req.user.role === 'admin' || 
                     req.user.role === 'manager';

    if (!canDelete) {
      return res.status(403).json({
        error: 'You do not have permission to delete this process'
      });
    }

    const { error: deleteError } = await supabase
      .from('processes')
      .delete()
      .eq('id', processId);

    if (deleteError) {
      console.error('Process deletion error:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete process'
      });
    }

    res.json({
      message: 'Process deleted successfully'
    });

  } catch (error) {
    console.error('Delete process error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Execute process
router.post('/:processId/execute', 
  authenticateToken,
  [
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Notes must be less than 2000 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { processId } = req.params;
      const { notes, stepResults } = req.body;

      // Check if process exists
      const { data: process, error: processError } = await supabase
        .from('processes')
        .select('id, name, is_active')
        .eq('id', processId)
        .single();

      if (processError || !process) {
        return res.status(404).json({
          error: 'Process not found'
        });
      }

      if (!process.is_active) {
        return res.status(400).json({
          error: 'Cannot execute inactive process'
        });
      }

      const { data: execution, error } = await supabase
        .from('process_executions')
        .insert({
          process_id: processId,
          executed_by: req.user.id,
          status: 'in_progress',
          notes,
          step_results: stepResults ? JSON.stringify(stepResults) : null
        })
        .select(`
          *,
          executed_by:users!process_executions_executed_by_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Process execution error:', error);
        return res.status(500).json({
          error: 'Failed to start process execution'
        });
      }

      res.status(201).json({
        message: 'Process execution started successfully',
        execution
      });

    } catch (error) {
      console.error('Execute process error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Update process execution
router.put('/executions/:executionId', 
  authenticateToken,
  [
    body('status')
      .optional()
      .isIn(['in_progress', 'completed', 'failed'])
      .withMessage('Status must be in_progress, completed, or failed'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Notes must be less than 2000 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { executionId } = req.params;
      const { status, notes, stepResults } = req.body;

      const updateData = {};
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'completed' || status === 'failed') {
          updateData.completed_at = new Date().toISOString();
        }
      }
      if (notes !== undefined) updateData.notes = notes;
      if (stepResults !== undefined) updateData.step_results = stepResults ? JSON.stringify(stepResults) : null;

      const { data: updatedExecution, error } = await supabase
        .from('process_executions')
        .update(updateData)
        .eq('id', executionId)
        .select(`
          *,
          executed_by:users!process_executions_executed_by_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Execution update error:', error);
        return res.status(500).json({
          error: 'Failed to update process execution'
        });
      }

      if (!updatedExecution) {
        return res.status(404).json({
          error: 'Process execution not found'
        });
      }

      res.json({
        message: 'Process execution updated successfully',
        execution: updatedExecution
      });

    } catch (error) {
      console.error('Update execution error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get processes summary
router.get('/organization/:organizationId/summary', 
  authenticateToken, 
  getUserOrganizations, 
  requireOrganizationAccess,
  async (req, res) => {
    try {
      const { organizationId } = req.params;

      const [processesResult, executionsResult] = await Promise.all([
        supabase
          .from('processes')
          .select('id, is_active, department, category, last_reviewed')
          .eq('organization_id', organizationId),
        
        supabase
          .from('process_executions')
          .select('id, status, started_at, processes!inner(organization_id)')
          .eq('processes.organization_id', organizationId)
          .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const processes = processesResult.data || [];
      const executions = executionsResult.data || [];

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const needsReview = processes.filter(p => 
        !p.last_reviewed || new Date(p.last_reviewed) < thirtyDaysAgo
      );

      const summary = {
        total: processes.length,
        active: processes.filter(p => p.is_active).length,
        inactive: processes.filter(p => !p.is_active).length,
        needs_review: needsReview.length,
        executions_this_month: executions.length,
        successful_executions: executions.filter(e => e.status === 'completed').length,
        failed_executions: executions.filter(e => e.status === 'failed').length,
        by_department: processes.reduce((acc, p) => {
          const dept = p.department || 'Unassigned';
          acc[dept] = (acc[dept] || 0) + 1;
          return acc;
        }, {})
      };

      res.json({ summary });

    } catch (error) {
      console.error('Get processes summary error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

module.exports = router;
