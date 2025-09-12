const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/database');
const { authenticateToken, getUserOrganizations, requireOrganizationAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const issueValidation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Title must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Priority must be low, medium, high, or critical'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('organizationId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid organization ID is required')
];

// Get issues for organization
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
        category = '',
        reporterId = '',
        assigneeId = ''
      } = req.query;

      let query = supabase
        .from('issues')
        .select(`
          *,
          reporter:users!issues_reporter_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          assignee:users!issues_assignee_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          meeting:meetings (
            id,
            title
          )
        `)
        .eq('organization_id', organizationId);

      // Apply filters
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }
      if (category) {
        query = query.eq('category', category);
      }
      if (reporterId) {
        query = query.eq('reporter_id', reporterId);
      }
      if (assigneeId) {
        query = query.eq('assignee_id', assigneeId);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: issues, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Issues fetch error:', error);
        return res.status(500).json({
          error: 'Failed to fetch issues'
        });
      }

      res.json({
        issues,
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
      console.error('Get issues error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get single issue
router.get('/:issueId', authenticateToken, async (req, res) => {
  try {
    const { issueId } = req.params;

    const { data: issue, error } = await supabase
      .from('issues')
      .select(`
        *,
        reporter:users!issues_reporter_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        assignee:users!issues_assignee_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        meeting:meetings (
          id,
          title,
          scheduled_at
        ),
        todos (
          id,
          title,
          status,
          assignee:users!todos_assignee_id_fkey (
            id,
            first_name,
            last_name
          )
        ),
        comments (
          id,
          content,
          created_at,
          user:users!comments_user_id_fkey (
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq('id', issueId)
      .single();

    if (error || !issue) {
      return res.status(404).json({
        error: 'Issue not found'
      });
    }

    // Sort comments by creation date
    issue.comments = issue.comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    res.json({ issue });

  } catch (error) {
    console.error('Get issue error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Create issue
router.post('/', 
  authenticateToken, 
  getUserOrganizations, 
  issueValidation,
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
        category,
        dueDate, 
        organizationId,
        assigneeId,
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

      const { data: issue, error } = await supabase
        .from('issues')
        .insert({
          organization_id: organizationId,
          title,
          description,
          priority,
          category,
          due_date: dueDate ? new Date(dueDate).toISOString().split('T')[0] : null,
          reporter_id: req.user.id,
          assignee_id: assigneeId || req.user.id,
          meeting_id: meetingId || null
        })
        .select(`
          *,
          reporter:users!issues_reporter_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          assignee:users!issues_assignee_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Issue creation error:', error);
        return res.status(500).json({
          error: 'Failed to create issue'
        });
      }

      res.status(201).json({
        message: 'Issue created successfully',
        issue
      });

    } catch (error) {
      console.error('Create issue error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Update issue
router.put('/:issueId', 
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
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Priority must be low, medium, high, or critical'),
    body('status')
      .optional()
      .isIn(['open', 'in_progress', 'resolved', 'closed'])
      .withMessage('Status must be open, in_progress, resolved, or closed'),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Category must be less than 100 characters'),
    body('resolution')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Resolution must be less than 2000 characters'),
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

      const { issueId } = req.params;
      const { 
        title, 
        description, 
        priority, 
        status, 
        category, 
        resolution,
        dueDate, 
        assigneeId 
      } = req.body;

      // Check if issue exists and user has access
      const { data: existingIssue, error: fetchError } = await supabase
        .from('issues')
        .select('id, organization_id, reporter_id, assignee_id, status')
        .eq('id', issueId)
        .single();

      if (fetchError || !existingIssue) {
        return res.status(404).json({
          error: 'Issue not found'
        });
      }

      // Check if user can edit (reporter, assignee, manager, or admin)
      const canEdit = existingIssue.reporter_id === req.user.id || 
                     existingIssue.assignee_id === req.user.id ||
                     req.user.role === 'admin' || 
                     req.user.role === 'manager';

      if (!canEdit) {
        return res.status(403).json({
          error: 'You do not have permission to edit this issue'
        });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (priority !== undefined) updateData.priority = priority;
      if (category !== undefined) updateData.category = category;
      if (resolution !== undefined) updateData.resolution = resolution;
      if (dueDate !== undefined) updateData.due_date = dueDate ? new Date(dueDate).toISOString().split('T')[0] : null;
      if (assigneeId !== undefined) updateData.assignee_id = assigneeId;
      
      if (status !== undefined) {
        updateData.status = status;
        if ((status === 'resolved' || status === 'closed') && existingIssue.status !== 'resolved' && existingIssue.status !== 'closed') {
          updateData.resolved_at = new Date().toISOString();
        } else if (status !== 'resolved' && status !== 'closed') {
          updateData.resolved_at = null;
        }
      }

      const { data: updatedIssue, error: updateError } = await supabase
        .from('issues')
        .update(updateData)
        .eq('id', issueId)
        .select(`
          *,
          reporter:users!issues_reporter_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          assignee:users!issues_assignee_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (updateError) {
        console.error('Issue update error:', updateError);
        return res.status(500).json({
          error: 'Failed to update issue'
        });
      }

      res.json({
        message: 'Issue updated successfully',
        issue: updatedIssue
      });

    } catch (error) {
      console.error('Update issue error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Delete issue
router.delete('/:issueId', authenticateToken, async (req, res) => {
  try {
    const { issueId } = req.params;

    // Check if issue exists and user has access
    const { data: issue, error: fetchError } = await supabase
      .from('issues')
      .select('id, reporter_id, assignee_id')
      .eq('id', issueId)
      .single();

    if (fetchError || !issue) {
      return res.status(404).json({
        error: 'Issue not found'
      });
    }

    // Check if user can delete (reporter, assignee, manager, or admin)
    const canDelete = issue.reporter_id === req.user.id || 
                     issue.assignee_id === req.user.id ||
                     req.user.role === 'admin' || 
                     req.user.role === 'manager';

    if (!canDelete) {
      return res.status(403).json({
        error: 'You do not have permission to delete this issue'
      });
    }

    const { error: deleteError } = await supabase
      .from('issues')
      .delete()
      .eq('id', issueId);

    if (deleteError) {
      console.error('Issue deletion error:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete issue'
      });
    }

    res.json({
      message: 'Issue deleted successfully'
    });

  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Add comment to issue
router.post('/:issueId/comments', 
  authenticateToken,
  [
    body('content')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Comment content must be between 1 and 2000 characters')
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

      const { issueId } = req.params;
      const { content } = req.body;

      // Check if issue exists
      const { data: issue, error: issueError } = await supabase
        .from('issues')
        .select('id')
        .eq('id', issueId)
        .single();

      if (issueError || !issue) {
        return res.status(404).json({
          error: 'Issue not found'
        });
      }

      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          entity_type: 'issue',
          entity_id: issueId,
          user_id: req.user.id,
          content
        })
        .select(`
          *,
          user:users!comments_user_id_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .single();

      if (error) {
        console.error('Comment creation error:', error);
        return res.status(500).json({
          error: 'Failed to add comment'
        });
      }

      res.status(201).json({
        message: 'Comment added successfully',
        comment
      });

    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get issues summary
router.get('/organization/:organizationId/summary', 
  authenticateToken, 
  getUserOrganizations, 
  requireOrganizationAccess,
  async (req, res) => {
    try {
      const { organizationId } = req.params;

      const { data: issues, error } = await supabase
        .from('issues')
        .select('id, status, priority, due_date, created_at')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Issues summary error:', error);
        return res.status(500).json({
          error: 'Failed to fetch issues summary'
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const summary = {
        total: issues.length,
        open: issues.filter(i => i.status === 'open').length,
        in_progress: issues.filter(i => i.status === 'in_progress').length,
        resolved: issues.filter(i => i.status === 'resolved').length,
        closed: issues.filter(i => i.status === 'closed').length,
        overdue: issues.filter(i => i.due_date && i.due_date < today && i.status !== 'resolved' && i.status !== 'closed').length,
        created_this_month: issues.filter(i => i.created_at >= thirtyDaysAgo).length,
        by_priority: {
          critical: issues.filter(i => i.priority === 'critical' && i.status !== 'resolved' && i.status !== 'closed').length,
          high: issues.filter(i => i.priority === 'high' && i.status !== 'resolved' && i.status !== 'closed').length,
          medium: issues.filter(i => i.priority === 'medium' && i.status !== 'resolved' && i.status !== 'closed').length,
          low: issues.filter(i => i.priority === 'low' && i.status !== 'resolved' && i.status !== 'closed').length
        }
      };

      res.json({ summary });

    } catch (error) {
      console.error('Get issues summary error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get my issues
router.get('/my-issues', authenticateToken, getUserOrganizations, async (req, res) => {
  try {
    const { organizationId, status = '', priority = '', limit = 50 } = req.query;
    
    const organizationIds = organizationId 
      ? [organizationId]
      : req.user.organizations.map(org => org.organization_id);

    let query = supabase
      .from('issues')
      .select(`
        *,
        organization:organizations!issues_organization_id_fkey (
          id,
          name
        ),
        reporter:users!issues_reporter_id_fkey (
          id,
          first_name,
          last_name
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

    const { data: issues, error } = await query
      .limit(parseInt(limit))
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('My issues error:', error);
      return res.status(500).json({
        error: 'Failed to fetch your issues'
      });
    }

    res.json({ issues });

  } catch (error) {
    console.error('Get my issues error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
