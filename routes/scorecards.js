const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/database');
const { authenticateToken, getUserOrganizations, requireOrganizationAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const scorecardValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'quarterly'])
    .withMessage('Frequency must be daily, weekly, monthly, or quarterly'),
  body('organizationId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid organization ID is required')
];

const metricValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Metric name must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('targetValue')
    .optional()
    .isNumeric()
    .withMessage('Target value must be a number'),
  body('measurementUnit')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Measurement unit must be less than 50 characters')
];

const entryValidation = [
  body('value')
    .isNumeric()
    .withMessage('Value must be a number'),
  body('periodStart')
    .isISO8601()
    .withMessage('Period start must be a valid date'),
  body('periodEnd')
    .isISO8601()
    .withMessage('Period end must be a valid date'),
  body('status')
    .optional()
    .isIn(['on_track', 'off_track', 'at_risk'])
    .withMessage('Status must be on_track, off_track, or at_risk'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

// Get all scorecards for organization
router.get('/organization/:organizationId', 
  authenticateToken, 
  getUserOrganizations, 
  requireOrganizationAccess,
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 10, search = '', frequency = '', ownerId = '', isActive } = req.query;

      let query = supabase
        .from('scorecards')
        .select(`
          *,
          owner:users!scorecards_owner_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          scorecard_metrics (
            id,
            name,
            target_value,
            measurement_unit,
            is_active
          )
        `)
        .eq('organization_id', organizationId);

      // Apply filters
      if (search) {
        query = query.ilike('name', `%${search}%`);
      }
      if (frequency) {
        query = query.eq('frequency', frequency);
      }
      if (ownerId) {
        query = query.eq('owner_id', ownerId);
      }
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive === 'true');
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: scorecards, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Scorecards fetch error:', error);
        return res.status(500).json({
          error: 'Failed to fetch scorecards'
        });
      }

      res.json({
        scorecards,
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
      console.error('Get scorecards error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get single scorecard
router.get('/:scorecardId', authenticateToken, async (req, res) => {
  try {
    const { scorecardId } = req.params;

    const { data: scorecard, error } = await supabase
      .from('scorecards')
      .select(`
        *,
        owner:users!scorecards_owner_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        scorecard_metrics (
          id,
          name,
          description,
          target_value,
          measurement_unit,
          order_index,
          is_active,
          owner:users!scorecard_metrics_owner_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          scorecard_entries (
            id,
            value,
            period_start,
            period_end,
            status,
            notes,
            created_at,
            entered_by:users!scorecard_entries_entered_by_fkey (
              id,
              first_name,
              last_name
            )
          )
        )
      `)
      .eq('id', scorecardId)
      .single();

    if (error || !scorecard) {
      return res.status(404).json({
        error: 'Scorecard not found'
      });
    }

    // Sort metrics by order_index and entries by period_start
    scorecard.scorecard_metrics = scorecard.scorecard_metrics
      .sort((a, b) => a.order_index - b.order_index)
      .map(metric => ({
        ...metric,
        scorecard_entries: metric.scorecard_entries
          .sort((a, b) => new Date(b.period_start) - new Date(a.period_start))
      }));

    res.json({ scorecard });

  } catch (error) {
    console.error('Get scorecard error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Create new scorecard
router.post('/', 
  authenticateToken, 
  getUserOrganizations, 
  scorecardValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { name, description, frequency = 'weekly', organizationId } = req.body;

      // Check organization access
      const hasAccess = req.user.organizations.some(
        org => org.organization_id === organizationId
      );

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this organization'
        });
      }

      const { data: scorecard, error } = await supabase
        .from('scorecards')
        .insert({
          organization_id: organizationId,
          name,
          description,
          frequency,
          owner_id: req.user.id
        })
        .select(`
          *,
          owner:users!scorecards_owner_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Scorecard creation error:', error);
        return res.status(500).json({
          error: 'Failed to create scorecard'
        });
      }

      res.status(201).json({
        message: 'Scorecard created successfully',
        scorecard
      });

    } catch (error) {
      console.error('Create scorecard error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Update scorecard
router.put('/:scorecardId', 
  authenticateToken, 
  getUserOrganizations,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Name must be between 2 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('frequency')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'quarterly'])
      .withMessage('Frequency must be daily, weekly, monthly, or quarterly'),
    body('ownerId')
      .optional()
      .isUUID()
      .withMessage('Owner ID must be a valid UUID'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
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

      const { scorecardId } = req.params;
      const { name, description, frequency, ownerId, isActive } = req.body;

      // Check if scorecard exists and user has access
      const { data: existingScorecard, error: fetchError } = await supabase
        .from('scorecards')
        .select('id, organization_id, owner_id')
        .eq('id', scorecardId)
        .single();

      if (fetchError || !existingScorecard) {
        return res.status(404).json({
          error: 'Scorecard not found'
        });
      }

      // Check organization access
      const hasAccess = req.user.organizations.some(
        org => org.organization_id === existingScorecard.organization_id
      );

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this scorecard'
        });
      }

      // Check if user can edit (owner, manager, or admin)
      const canEdit = existingScorecard.owner_id === req.user.id || 
                     req.user.role === 'admin' || 
                     req.user.role === 'manager';

      if (!canEdit) {
        return res.status(403).json({
          error: 'You do not have permission to edit this scorecard'
        });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (frequency !== undefined) updateData.frequency = frequency;
      if (ownerId !== undefined) updateData.owner_id = ownerId;
      if (isActive !== undefined) updateData.is_active = isActive;

      const { data: updatedScorecard, error: updateError } = await supabase
        .from('scorecards')
        .update(updateData)
        .eq('id', scorecardId)
        .select(`
          *,
          owner:users!scorecards_owner_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (updateError) {
        console.error('Scorecard update error:', updateError);
        return res.status(500).json({
          error: 'Failed to update scorecard'
        });
      }

      res.json({
        message: 'Scorecard updated successfully',
        scorecard: updatedScorecard
      });

    } catch (error) {
      console.error('Update scorecard error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Delete scorecard
router.delete('/:scorecardId', authenticateToken, async (req, res) => {
  try {
    const { scorecardId } = req.params;

    // Check if scorecard exists and user has access
    const { data: scorecard, error: fetchError } = await supabase
      .from('scorecards')
      .select('id, organization_id, owner_id')
      .eq('id', scorecardId)
      .single();

    if (fetchError || !scorecard) {
      return res.status(404).json({
        error: 'Scorecard not found'
      });
    }

    // Check if user can delete (owner, manager, or admin)
    const canDelete = scorecard.owner_id === req.user.id || 
                     req.user.role === 'admin' || 
                     req.user.role === 'manager';

    if (!canDelete) {
      return res.status(403).json({
        error: 'You do not have permission to delete this scorecard'
      });
    }

    const { error: deleteError } = await supabase
      .from('scorecards')
      .delete()
      .eq('id', scorecardId);

    if (deleteError) {
      console.error('Scorecard deletion error:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete scorecard'
      });
    }

    res.json({
      message: 'Scorecard deleted successfully'
    });

  } catch (error) {
    console.error('Delete scorecard error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Add metric to scorecard
router.post('/:scorecardId/metrics', 
  authenticateToken, 
  metricValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { scorecardId } = req.params;
      const { name, description, targetValue, measurementUnit, ownerId } = req.body;

      // Check if scorecard exists and user has access
      const { data: scorecard, error: fetchError } = await supabase
        .from('scorecards')
        .select('id, organization_id, owner_id')
        .eq('id', scorecardId)
        .single();

      if (fetchError || !scorecard) {
        return res.status(404).json({
          error: 'Scorecard not found'
        });
      }

      // Get next order index
      const { data: existingMetrics } = await supabase
        .from('scorecard_metrics')
        .select('order_index')
        .eq('scorecard_id', scorecardId)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = existingMetrics && existingMetrics.length > 0 
        ? existingMetrics[0].order_index + 1 
        : 0;

      const { data: metric, error } = await supabase
        .from('scorecard_metrics')
        .insert({
          scorecard_id: scorecardId,
          name,
          description,
          target_value: targetValue,
          measurement_unit: measurementUnit,
          owner_id: ownerId || req.user.id,
          order_index: nextOrderIndex
        })
        .select(`
          *,
          owner:users!scorecard_metrics_owner_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Metric creation error:', error);
        return res.status(500).json({
          error: 'Failed to create metric'
        });
      }

      res.status(201).json({
        message: 'Metric added successfully',
        metric
      });

    } catch (error) {
      console.error('Add metric error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Update metric
router.put('/metrics/:metricId', 
  authenticateToken,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Metric name must be between 2 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('targetValue')
      .optional()
      .isNumeric()
      .withMessage('Target value must be a number'),
    body('measurementUnit')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Measurement unit must be less than 50 characters'),
    body('orderIndex')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Order index must be a non-negative integer'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
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

      const { metricId } = req.params;
      const { name, description, targetValue, measurementUnit, orderIndex, ownerId, isActive } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (targetValue !== undefined) updateData.target_value = targetValue;
      if (measurementUnit !== undefined) updateData.measurement_unit = measurementUnit;
      if (orderIndex !== undefined) updateData.order_index = orderIndex;
      if (ownerId !== undefined) updateData.owner_id = ownerId;
      if (isActive !== undefined) updateData.is_active = isActive;

      const { data: updatedMetric, error } = await supabase
        .from('scorecard_metrics')
        .update(updateData)
        .eq('id', metricId)
        .select(`
          *,
          owner:users!scorecard_metrics_owner_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Metric update error:', error);
        return res.status(500).json({
          error: 'Failed to update metric'
        });
      }

      if (!updatedMetric) {
        return res.status(404).json({
          error: 'Metric not found'
        });
      }

      res.json({
        message: 'Metric updated successfully',
        metric: updatedMetric
      });

    } catch (error) {
      console.error('Update metric error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Delete metric
router.delete('/metrics/:metricId', authenticateToken, async (req, res) => {
  try {
    const { metricId } = req.params;

    const { error } = await supabase
      .from('scorecard_metrics')
      .delete()
      .eq('id', metricId);

    if (error) {
      console.error('Metric deletion error:', error);
      return res.status(500).json({
        error: 'Failed to delete metric'
      });
    }

    res.json({
      message: 'Metric deleted successfully'
    });

  } catch (error) {
    console.error('Delete metric error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Add scorecard entry
router.post('/metrics/:metricId/entries', 
  authenticateToken, 
  entryValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { metricId } = req.params;
      const { value, periodStart, periodEnd, status = 'on_track', notes } = req.body;

      const { data: entry, error } = await supabase
        .from('scorecard_entries')
        .insert({
          metric_id: metricId,
          value,
          period_start: periodStart,
          period_end: periodEnd,
          status,
          notes,
          entered_by: req.user.id
        })
        .select(`
          *,
          entered_by:users!scorecard_entries_entered_by_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .single();

      if (error) {
        console.error('Entry creation error:', error);
        return res.status(500).json({
          error: 'Failed to create entry'
        });
      }

      res.status(201).json({
        message: 'Entry added successfully',
        entry
      });

    } catch (error) {
      console.error('Add entry error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Update scorecard entry
router.put('/entries/:entryId', 
  authenticateToken,
  [
    body('value')
      .optional()
      .isNumeric()
      .withMessage('Value must be a number'),
    body('status')
      .optional()
      .isIn(['on_track', 'off_track', 'at_risk'])
      .withMessage('Status must be on_track, off_track, or at_risk'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Notes must be less than 1000 characters')
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

      const { entryId } = req.params;
      const { value, status, notes } = req.body;

      const updateData = {};
      if (value !== undefined) updateData.value = value;
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;

      const { data: updatedEntry, error } = await supabase
        .from('scorecard_entries')
        .update(updateData)
        .eq('id', entryId)
        .select(`
          *,
          entered_by:users!scorecard_entries_entered_by_fkey (
            id,
            first_name,
            last_name
          )
        `)
        .single();

      if (error) {
        console.error('Entry update error:', error);
        return res.status(500).json({
          error: 'Failed to update entry'
        });
      }

      if (!updatedEntry) {
        return res.status(404).json({
          error: 'Entry not found'
        });
      }

      res.json({
        message: 'Entry updated successfully',
        entry: updatedEntry
      });

    } catch (error) {
      console.error('Update entry error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Delete scorecard entry
router.delete('/entries/:entryId', authenticateToken, async (req, res) => {
  try {
    const { entryId } = req.params;

    const { error } = await supabase
      .from('scorecard_entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      console.error('Entry deletion error:', error);
      return res.status(500).json({
        error: 'Failed to delete entry'
      });
    }

    res.json({
      message: 'Entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
