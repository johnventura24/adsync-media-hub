const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/database');
const { authenticateToken, getUserOrganizations, requireOrganizationAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const rockValidation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Title must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('quarter')
    .isInt({ min: 1, max: 4 })
    .withMessage('Quarter must be between 1 and 4'),
  body('year')
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Year must be between 2020 and 2030'),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  body('organizationId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid organization ID is required')
];

const milestoneValidation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Title must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date')
];

// Get rocks for organization
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
        quarter, 
        year, 
        status = '', 
        ownerId = '',
        priority 
      } = req.query;

      let query = supabase
        .from('rocks')
        .select(`
          *,
          owner:users!rocks_owner_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          rock_milestones (
            id,
            title,
            due_date,
            is_completed,
            order_index
          )
        `)
        .eq('organization_id', organizationId);

      // Apply filters
      if (search) {
        query = query.ilike('title', `%${search}%`);
      }
      if (quarter) {
        query = query.eq('quarter', parseInt(quarter));
      }
      if (year) {
        query = query.eq('year', parseInt(year));
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }
      if (priority) {
        query = query.eq('priority', parseInt(priority));
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: rocks, error, count } = await query
        .range(from, to)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Rocks fetch error:', error);
        return res.status(500).json({
          error: 'Failed to fetch rocks'
        });
      }

      // Sort milestones by order_index
      const rocksWithSortedMilestones = rocks.map(rock => ({
        ...rock,
        rock_milestones: rock.rock_milestones.sort((a, b) => a.order_index - b.order_index)
      }));

      res.json({
        rocks: rocksWithSortedMilestones,
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
      console.error('Get rocks error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get single rock
router.get('/:rockId', authenticateToken, async (req, res) => {
  try {
    const { rockId } = req.params;

    const { data: rock, error } = await supabase
      .from('rocks')
      .select(`
        *,
        owner:users!rocks_owner_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        rock_milestones (
          id,
          title,
          description,
          due_date,
          is_completed,
          completed_at,
          order_index,
          created_at
        ),
        todos (
          id,
          title,
          status,
          due_date,
          assignee:users!todos_assignee_id_fkey (
            id,
            first_name,
            last_name
          )
        )
      `)
      .eq('id', rockId)
      .single();

    if (error || !rock) {
      return res.status(404).json({
        error: 'Rock not found'
      });
    }

    // Sort milestones by order_index
    rock.rock_milestones = rock.rock_milestones.sort((a, b) => a.order_index - b.order_index);

    res.json({ rock });

  } catch (error) {
    console.error('Get rock error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Create new rock
router.post('/', 
  authenticateToken, 
  getUserOrganizations, 
  rockValidation,
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
        quarter, 
        year, 
        priority = 1, 
        dueDate, 
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

      const { data: rock, error } = await supabase
        .from('rocks')
        .insert({
          organization_id: organizationId,
          title,
          description,
          quarter,
          year,
          priority,
          due_date: dueDate ? new Date(dueDate).toISOString().split('T')[0] : null,
          owner_id: ownerId || req.user.id
        })
        .select(`
          *,
          owner:users!rocks_owner_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Rock creation error:', error);
        return res.status(500).json({
          error: 'Failed to create rock'
        });
      }

      res.status(201).json({
        message: 'Rock created successfully',
        rock
      });

    } catch (error) {
      console.error('Create rock error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Update rock
router.put('/:rockId', 
  authenticateToken, 
  getUserOrganizations,
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
    body('quarter')
      .optional()
      .isInt({ min: 1, max: 4 })
      .withMessage('Quarter must be between 1 and 4'),
    body('year')
      .optional()
      .isInt({ min: 2020, max: 2030 })
      .withMessage('Year must be between 2020 and 2030'),
    body('priority')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Priority must be between 1 and 10'),
    body('status')
      .optional()
      .isIn(['not_started', 'in_progress', 'completed', 'abandoned'])
      .withMessage('Status must be not_started, in_progress, completed, or abandoned'),
    body('completionPercentage')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Completion percentage must be between 0 and 100'),
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date'),
    body('ownerId')
      .optional()
      .isUUID()
      .withMessage('Owner ID must be a valid UUID')
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

      const { rockId } = req.params;
      const { 
        title, 
        description, 
        quarter, 
        year, 
        priority, 
        status, 
        completionPercentage, 
        dueDate, 
        ownerId 
      } = req.body;

      // Check if rock exists and user has access
      const { data: existingRock, error: fetchError } = await supabase
        .from('rocks')
        .select('id, organization_id, owner_id, status')
        .eq('id', rockId)
        .single();

      if (fetchError || !existingRock) {
        return res.status(404).json({
          error: 'Rock not found'
        });
      }

      // Check organization access
      const hasAccess = req.user.organizations.some(
        org => org.organization_id === existingRock.organization_id
      );

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this rock'
        });
      }

      // Check if user can edit (owner, manager, or admin)
      const canEdit = existingRock.owner_id === req.user.id || 
                     req.user.role === 'admin' || 
                     req.user.role === 'manager';

      if (!canEdit) {
        return res.status(403).json({
          error: 'You do not have permission to edit this rock'
        });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (quarter !== undefined) updateData.quarter = quarter;
      if (year !== undefined) updateData.year = year;
      if (priority !== undefined) updateData.priority = priority;
      if (status !== undefined) {
        updateData.status = status;
        if (status === 'completed' && existingRock.status !== 'completed') {
          updateData.completed_at = new Date().toISOString();
          updateData.completion_percentage = 100;
        } else if (status !== 'completed') {
          updateData.completed_at = null;
        }
      }
      if (completionPercentage !== undefined) updateData.completion_percentage = completionPercentage;
      if (dueDate !== undefined) updateData.due_date = dueDate ? new Date(dueDate).toISOString().split('T')[0] : null;
      if (ownerId !== undefined) updateData.owner_id = ownerId;

      const { data: updatedRock, error: updateError } = await supabase
        .from('rocks')
        .update(updateData)
        .eq('id', rockId)
        .select(`
          *,
          owner:users!rocks_owner_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (updateError) {
        console.error('Rock update error:', updateError);
        return res.status(500).json({
          error: 'Failed to update rock'
        });
      }

      res.json({
        message: 'Rock updated successfully',
        rock: updatedRock
      });

    } catch (error) {
      console.error('Update rock error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Delete rock
router.delete('/:rockId', authenticateToken, async (req, res) => {
  try {
    const { rockId } = req.params;

    // Check if rock exists and user has access
    const { data: rock, error: fetchError } = await supabase
      .from('rocks')
      .select('id, organization_id, owner_id')
      .eq('id', rockId)
      .single();

    if (fetchError || !rock) {
      return res.status(404).json({
        error: 'Rock not found'
      });
    }

    // Check if user can delete (owner, manager, or admin)
    const canDelete = rock.owner_id === req.user.id || 
                     req.user.role === 'admin' || 
                     req.user.role === 'manager';

    if (!canDelete) {
      return res.status(403).json({
        error: 'You do not have permission to delete this rock'
      });
    }

    const { error: deleteError } = await supabase
      .from('rocks')
      .delete()
      .eq('id', rockId);

    if (deleteError) {
      console.error('Rock deletion error:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete rock'
      });
    }

    res.json({
      message: 'Rock deleted successfully'
    });

  } catch (error) {
    console.error('Delete rock error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Add milestone to rock
router.post('/:rockId/milestones', 
  authenticateToken, 
  milestoneValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { rockId } = req.params;
      const { title, description, dueDate } = req.body;

      // Check if rock exists and user has access
      const { data: rock, error: fetchError } = await supabase
        .from('rocks')
        .select('id, organization_id, owner_id')
        .eq('id', rockId)
        .single();

      if (fetchError || !rock) {
        return res.status(404).json({
          error: 'Rock not found'
        });
      }

      // Get next order index
      const { data: existingMilestones } = await supabase
        .from('rock_milestones')
        .select('order_index')
        .eq('rock_id', rockId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingMilestones && existingMilestones.length > 0 
        ? existingMilestones[0].order_index + 1 
        : 0;

      const { data: milestone, error } = await supabase
        .from('rock_milestones')
        .insert({
          rock_id: rockId,
          title,
          description,
          due_date: dueDate ? new Date(dueDate).toISOString().split('T')[0] : null,
          order_index: nextOrderIndex
        })
        .select()
        .single();

      if (error) {
        console.error('Milestone creation error:', error);
        return res.status(500).json({
          error: 'Failed to create milestone'
        });
      }

      res.status(201).json({
        message: 'Milestone added successfully',
        milestone
      });

    } catch (error) {
      console.error('Add milestone error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Update milestone
router.put('/milestones/:milestoneId', 
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
    body('dueDate')
      .optional()
      .isISO8601()
      .withMessage('Due date must be a valid date'),
    body('isCompleted')
      .optional()
      .isBoolean()
      .withMessage('isCompleted must be a boolean'),
    body('orderIndex')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Order index must be a non-negative integer')
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

      const { milestoneId } = req.params;
      const { title, description, dueDate, isCompleted, orderIndex } = req.body;

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (dueDate !== undefined) updateData.due_date = dueDate ? new Date(dueDate).toISOString().split('T')[0] : null;
      if (orderIndex !== undefined) updateData.order_index = orderIndex;
      if (isCompleted !== undefined) {
        updateData.is_completed = isCompleted;
        updateData.completed_at = isCompleted ? new Date().toISOString() : null;
      }

      const { data: updatedMilestone, error } = await supabase
        .from('rock_milestones')
        .update(updateData)
        .eq('id', milestoneId)
        .select()
        .single();

      if (error) {
        console.error('Milestone update error:', error);
        return res.status(500).json({
          error: 'Failed to update milestone'
        });
      }

      if (!updatedMilestone) {
        return res.status(404).json({
          error: 'Milestone not found'
        });
      }

      res.json({
        message: 'Milestone updated successfully',
        milestone: updatedMilestone
      });

    } catch (error) {
      console.error('Update milestone error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Delete milestone
router.delete('/milestones/:milestoneId', authenticateToken, async (req, res) => {
  try {
    const { milestoneId } = req.params;

    const { error } = await supabase
      .from('rock_milestones')
      .delete()
      .eq('id', milestoneId);

    if (error) {
      console.error('Milestone deletion error:', error);
      return res.status(500).json({
        error: 'Failed to delete milestone'
      });
    }

    res.json({
      message: 'Milestone deleted successfully'
    });

  } catch (error) {
    console.error('Delete milestone error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get rocks summary for organization
router.get('/organization/:organizationId/summary', 
  authenticateToken, 
  getUserOrganizations, 
  requireOrganizationAccess,
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { quarter, year } = req.query;

      let query = supabase
        .from('rocks')
        .select('id, status, completion_percentage, quarter, year')
        .eq('organization_id', organizationId);

      if (quarter) {
        query = query.eq('quarter', parseInt(quarter));
      }
      if (year) {
        query = query.eq('year', parseInt(year));
      }

      const { data: rocks, error } = await query;

      if (error) {
        console.error('Rocks summary error:', error);
        return res.status(500).json({
          error: 'Failed to fetch rocks summary'
        });
      }

      const summary = {
        total: rocks.length,
        not_started: rocks.filter(r => r.status === 'not_started').length,
        in_progress: rocks.filter(r => r.status === 'in_progress').length,
        completed: rocks.filter(r => r.status === 'completed').length,
        abandoned: rocks.filter(r => r.status === 'abandoned').length,
        average_completion: rocks.length > 0 
          ? Math.round(rocks.reduce((sum, r) => sum + r.completion_percentage, 0) / rocks.length)
          : 0
      };

      res.json({ summary });

    } catch (error) {
      console.error('Get rocks summary error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get current quarter rocks for user
router.get('/my-rocks', authenticateToken, getUserOrganizations, async (req, res) => {
  try {
    const { organizationId } = req.query;
    const currentDate = new Date();
    const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3);
    const currentYear = currentDate.getFullYear();

    const organizationIds = organizationId 
      ? [organizationId]
      : req.user.organizations.map(org => org.organization_id);

    const { data: rocks, error } = await supabase
      .from('rocks')
      .select(`
        *,
        organization:organizations!rocks_organization_id_fkey (
          id,
          name
        ),
        rock_milestones (
          id,
          title,
          is_completed,
          due_date
        )
      `)
      .eq('owner_id', req.user.id)
      .in('organization_id', organizationIds)
      .eq('quarter', currentQuarter)
      .eq('year', currentYear)
      .order('priority', { ascending: true });

    if (error) {
      console.error('My rocks error:', error);
      return res.status(500).json({
        error: 'Failed to fetch your rocks'
      });
    }

    res.json({ 
      rocks,
      quarter: currentQuarter,
      year: currentYear
    });

  } catch (error) {
    console.error('Get my rocks error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
