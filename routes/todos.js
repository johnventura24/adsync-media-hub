const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/database');
const { authenticateToken, getUserOrganizations, requireOrganizationAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const todoValidation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Title must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('organizationId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid organization ID is required')
];

// Get todos for organization
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
        status = '', 
        priority = '', 
        assigneeId = '',
        dueDate,
        overdue
      } = req.query;

      let query = supabase
        .from('todos')
        .select(`
          *,
          assignee:users!todos_assignee_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          created_by_user:users!todos_created_by_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          rock:rocks (
            id,
            title
          ),
          issue:issues (
            id,
            title
          ),
          meeting:meetings (
            id,
            title
          )
        `)
        .eq('organization_id', organizationId);

      // Apply filters
      if (search) {
        query = query.ilike('title', `%${search}%`);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }
      if (assigneeId) {
        query = query.eq('assignee_id', assigneeId);
      }
      if (dueDate) {
        query = query.eq('due_date', dueDate);
      }
      if (overdue === 'true') {
        query = query.lt('due_date', new Date().toISOString().split('T')[0])
                     .neq('status', 'completed');
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: todos, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Todos fetch error:', error);
        return res.status(500).json({
          error: 'Failed to fetch todos'
        });
      }

      res.json({
        todos,
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
      console.error('Get todos error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get my todos
router.get('/my-todos', authenticateToken, getUserOrganizations, async (req, res) => {
  try {
    const { organizationId, status = '', priority = '', limit = 50 } = req.query;
    
    const organizationIds = organizationId 
      ? [organizationId]
      : req.user.organizations.map(org => org.organization_id);

    let query = supabase
      .from('todos')
      .select(`
        *,
        organization:organizations!todos_organization_id_fkey (
          id,
          name
        ),
        rock:rocks (
          id,
          title
        ),
        issue:issues (
          id,
          title
        )
      `)
      .eq('assignee_id', req.user.id)
      .in('organization_id', organizationIds);

    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: todos, error } = await query
      .limit(parseInt(limit))
      .order('due_date', { ascending: true, nullsLast: true })
      .order('priority', { ascending: false });

    if (error) {
      console.error('My todos error:', error);
      return res.status(500).json({
        error: 'Failed to fetch your todos'
      });
    }

    res.json({ todos });

  } catch (error) {
    console.error('Get my todos error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Create todo
router.post('/', 
  authenticateToken, 
  getUserOrganizations, 
  todoValidation,
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
        title, 
        description, 
        priority = 'medium', 
        dueDate, 
        organizationId,
        assigneeId,
        rockId,
        issueId,
        meetingId
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

      const { data: todo, error } = await supabase
        .from('todos')
        .insert({
          organization_id: organizationId,
          title,
          description,
          priority,
          due_date: dueDate ? new Date(dueDate).toISOString().split('T')[0] : null,
          assignee_id: assigneeId || req.user.id,
          created_by: req.user.id,
          rock_id: rockId || null,
          issue_id: issueId || null,
          meeting_id: meetingId || null
        })
        .select(`
          *,
          assignee:users!todos_assignee_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          created_by_user:users!todos_created_by_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Todo creation error:', error);
        return res.status(500).json({
          error: 'Failed to create todo'
        });
      }

      res.status(201).json({
        message: 'Todo created successfully',
        todo
      });

    } catch (error) {
      console.error('Create todo error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Update todo
router.put('/:todoId', 
  authenticateToken,
  [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Title must be between 2 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Priority must be low, medium, high, or urgent'),
    body('status')
      .optional()
      .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
      .withMessage('Status must be pending, in_progress, completed, or cancelled'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date'),
    body('assigneeId')
      .optional()
      .isUUID()
      .withMessage('Assignee ID must be a valid UUID')
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

      const { todoId } = req.params;
      const { title, description, priority, status, dueDate, assigneeId } = req.body;

      // Check if todo exists and user has access
      const { data: existingTodo, error: fetchError } = await supabase
        .from('todos')
        .select('id, organization_id, assignee_id, created_by, status')
        .eq('id', todoId)
        .single();

      if (fetchError || !existingTodo) {
        return res.status(404).json({
          error: 'Todo not found'
        });
      }

      // Check if user can edit (assignee, creator, manager, or admin)
      const canEdit = existingTodo.assignee_id === req.user.id || 
                     existingTodo.created_by === req.user.id ||
                     req.user.role === 'admin' || 
                     req.user.role === 'manager';

      if (!canEdit) {
        return res.status(403).json({
          error: 'You do not have permission to edit this todo'
        });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (priority !== undefined) updateData.priority = priority;
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'completed' && existingTodo.status !== 'completed') {
          updateData.completed_at = new Date().toISOString();
        } else if (status !== 'completed') {
          updateData.completed_at = null;
        }
      }
      if (dueDate !== undefined) updateData.due_date = dueDate ? new Date(dueDate).toISOString().split('T')[0] : null;
      if (assigneeId !== undefined) updateData.assignee_id = assigneeId;

      const { data: updatedTodo, error: updateError } = await supabase
        .from('todos')
        .update(updateData)
        .eq('id', todoId)
        .select(`
          *,
          assignee:users!todos_assignee_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          created_by_user:users!todos_created_by_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (updateError) {
        console.error('Todo update error:', updateError);
        return res.status(500).json({
          error: 'Failed to update todo'
        });
      }

      res.json({
        message: 'Todo updated successfully',
        todo: updatedTodo
      });

    } catch (error) {
      console.error('Update todo error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Delete todo
router.delete('/:todoId', authenticateToken, async (req, res) => {
  try {
    const { todoId } = req.params;

    // Check if todo exists and user has access
    const { data: todo, error: fetchError } = await supabase
      .from('todos')
      .select('id, assignee_id, created_by')
      .eq('id', todoId)
      .single();

    if (fetchError || !todo) {
      return res.status(404).json({
        error: 'Todo not found'
      });
    }

    // Check if user can delete (assignee, creator, manager, or admin)
    const canDelete = todo.assignee_id === req.user.id || 
                     todo.created_by === req.user.id ||
                     req.user.role === 'admin' || 
                     req.user.role === 'manager';

    if (!canDelete) {
      return res.status(403).json({
        error: 'You do not have permission to delete this todo'
      });
    }

    const { error: deleteError } = await supabase
      .from('todos')
      .delete()
      .eq('id', todoId);

    if (deleteError) {
      console.error('Todo deletion error:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete todo'
      });
    }

    res.json({
      message: 'Todo deleted successfully'
    });

  } catch (error) {
    console.error('Delete todo error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get todos summary
router.get('/organization/:organizationId/summary', 
  authenticateToken, 
  getUserOrganizations, 
  requireOrganizationAccess,
  async (req, res) => {
    try {
      const { organizationId } = req.params;

      const { data: todos, error } = await supabase
        .from('todos')
        .select('id, status, priority, due_date')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Todos summary error:', error);
        return res.status(500).json({
          error: 'Failed to fetch todos summary'
        });
      }

      const today = new Date().toISOString().split('T')[0];
      
      const summary = {
        total: todos.length,
        pending: todos.filter(t => t.status === 'pending').length,
        in_progress: todos.filter(t => t.status === 'in_progress').length,
        completed: todos.filter(t => t.status === 'completed').length,
        cancelled: todos.filter(t => t.status === 'cancelled').length,
        overdue: todos.filter(t => t.due_date && t.due_date < today && t.status !== 'completed').length,
        due_today: todos.filter(t => t.due_date === today && t.status !== 'completed').length,
        by_priority: {
          urgent: todos.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
          high: todos.filter(t => t.priority === 'high' && t.status !== 'completed').length,
          medium: todos.filter(t => t.priority === 'medium' && t.status !== 'completed').length,
          low: todos.filter(t => t.priority === 'low' && t.status !== 'completed').length
        }
      };

      res.json({ summary });

    } catch (error) {
      console.error('Get todos summary error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

module.exports = router;
