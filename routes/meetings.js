const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/database');
const { authenticateToken, getUserOrganizations, requireOrganizationAccess } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const meetingValidation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Title must be between 2 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('meetingType')
    .optional()
    .isIn(['level_10', 'one_on_one', 'quarterly', 'annual', 'ad_hoc'])
    .withMessage('Meeting type must be level_10, one_on_one, quarterly, annual, or ad_hoc'),
  body('scheduledAt')
    .isISO8601()
    .withMessage('Scheduled time must be a valid date'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration must be between 15 and 480 minutes'),
  body('organizationId')
    .notEmpty()
    .isUUID()
    .withMessage('Valid organization ID is required')
];

// Get meetings for organization
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
        meetingType = '', 
        status = '',
        startDate,
        endDate,
        organizerId = ''
      } = req.query;

      let query = supabase
        .from('meetings')
        .select(`
          *,
          organizer:users!meetings_organizer_id_fkey (
            id,
            first_name,
            last_name,
            email
          ),
          meeting_attendees (
            id,
            status,
            role,
            user:users!meeting_attendees_user_id_fkey (
              id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('organization_id', organizationId);

      // Apply filters
      if (search) {
        query = query.ilike('title', `%${search}%`);
      }
      if (meetingType) {
        query = query.eq('meeting_type', meetingType);
      }
      if (status) {
        query = query.eq('status', status);
      }
      if (organizerId) {
        query = query.eq('organizer_id', organizerId);
      }
      if (startDate) {
        query = query.gte('scheduled_at', startDate);
      }
      if (endDate) {
        query = query.lte('scheduled_at', endDate);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data: meetings, error, count } = await query
        .range(from, to)
        .order('scheduled_at', { ascending: false });

      if (error) {
        console.error('Meetings fetch error:', error);
        return res.status(500).json({
          error: 'Failed to fetch meetings'
        });
      }

      res.json({
        meetings,
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
      console.error('Get meetings error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get single meeting
router.get('/:meetingId', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;

    const { data: meeting, error } = await supabase
      .from('meetings')
      .select(`
        *,
        organizer:users!meetings_organizer_id_fkey (
          id,
          first_name,
          last_name,
          email
        ),
        meeting_attendees (
          id,
          status,
          role,
          user:users!meeting_attendees_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        ),
        issues (
          id,
          title,
          status,
          priority
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
        )
      `)
      .eq('id', meetingId)
      .single();

    if (error || !meeting) {
      return res.status(404).json({
        error: 'Meeting not found'
      });
    }

    res.json({ meeting });

  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Create meeting
router.post('/', 
  authenticateToken, 
  getUserOrganizations, 
  meetingValidation,
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
        meetingType = 'level_10',
        scheduledAt,
        durationMinutes = 90,
        location,
        meetingUrl,
        agenda,
        organizationId,
        attendees = []
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

      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          organization_id: organizationId,
          title,
          description,
          meeting_type: meetingType,
          organizer_id: req.user.id,
          scheduled_at: scheduledAt,
          duration_minutes: durationMinutes,
          location,
          meeting_url: meetingUrl,
          agenda: agenda ? JSON.stringify(agenda) : null
        })
        .select(`
          *,
          organizer:users!meetings_organizer_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Meeting creation error:', error);
        return res.status(500).json({
          error: 'Failed to create meeting'
        });
      }

      // Add attendees
      if (attendees.length > 0) {
        const attendeeInserts = attendees.map(attendee => ({
          meeting_id: meeting.id,
          user_id: attendee.userId,
          role: attendee.role || 'attendee'
        }));

        const { error: attendeeError } = await supabase
          .from('meeting_attendees')
          .insert(attendeeInserts);

        if (attendeeError) {
          console.error('Attendee creation error:', attendeeError);
        }
      }

      res.status(201).json({
        message: 'Meeting created successfully',
        meeting
      });

    } catch (error) {
      console.error('Create meeting error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Update meeting
router.put('/:meetingId', 
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
    body('scheduledAt')
      .optional()
      .isISO8601()
      .withMessage('Scheduled time must be a valid date'),
    body('durationMinutes')
      .optional()
      .isInt({ min: 15, max: 480 })
      .withMessage('Duration must be between 15 and 480 minutes'),
    body('status')
      .optional()
      .isIn(['scheduled', 'in_progress', 'completed', 'cancelled'])
      .withMessage('Status must be scheduled, in_progress, completed, or cancelled')
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

      const { meetingId } = req.params;
      const { 
        title, 
        description, 
        scheduledAt,
        durationMinutes,
        location,
        meetingUrl,
        agenda,
        notes,
        actionItems,
        status
      } = req.body;

      // Check if meeting exists and user has access
      const { data: existingMeeting, error: fetchError } = await supabase
        .from('meetings')
        .select('id, organization_id, organizer_id')
        .eq('id', meetingId)
        .single();

      if (fetchError || !existingMeeting) {
        return res.status(404).json({
          error: 'Meeting not found'
        });
      }

      // Check if user can edit (organizer, manager, or admin)
      const canEdit = existingMeeting.organizer_id === req.user.id || 
                     req.user.role === 'admin' || 
                     req.user.role === 'manager';

      if (!canEdit) {
        return res.status(403).json({
          error: 'You do not have permission to edit this meeting'
        });
      }

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (scheduledAt !== undefined) updateData.scheduled_at = scheduledAt;
      if (durationMinutes !== undefined) updateData.duration_minutes = durationMinutes;
      if (location !== undefined) updateData.location = location;
      if (meetingUrl !== undefined) updateData.meeting_url = meetingUrl;
      if (agenda !== undefined) updateData.agenda = agenda ? JSON.stringify(agenda) : null;
      if (notes !== undefined) updateData.notes = notes;
      if (actionItems !== undefined) updateData.action_items = actionItems;
      if (status !== undefined) updateData.status = status;

      const { data: updatedMeeting, error: updateError } = await supabase
        .from('meetings')
        .update(updateData)
        .eq('id', meetingId)
        .select(`
          *,
          organizer:users!meetings_organizer_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (updateError) {
        console.error('Meeting update error:', updateError);
        return res.status(500).json({
          error: 'Failed to update meeting'
        });
      }

      res.json({
        message: 'Meeting updated successfully',
        meeting: updatedMeeting
      });

    } catch (error) {
      console.error('Update meeting error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Delete meeting
router.delete('/:meetingId', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;

    // Check if meeting exists and user has access
    const { data: meeting, error: fetchError } = await supabase
      .from('meetings')
      .select('id, organizer_id')
      .eq('id', meetingId)
      .single();

    if (fetchError || !meeting) {
      return res.status(404).json({
        error: 'Meeting not found'
      });
    }

    // Check if user can delete (organizer, manager, or admin)
    const canDelete = meeting.organizer_id === req.user.id || 
                     req.user.role === 'admin' || 
                     req.user.role === 'manager';

    if (!canDelete) {
      return res.status(403).json({
        error: 'You do not have permission to delete this meeting'
      });
    }

    const { error: deleteError } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId);

    if (deleteError) {
      console.error('Meeting deletion error:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete meeting'
      });
    }

    res.json({
      message: 'Meeting deleted successfully'
    });

  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Add attendee to meeting
router.post('/:meetingId/attendees', 
  authenticateToken,
  [
    body('userId')
      .notEmpty()
      .isUUID()
      .withMessage('Valid user ID is required'),
    body('role')
      .optional()
      .isIn(['organizer', 'presenter', 'attendee'])
      .withMessage('Role must be organizer, presenter, or attendee')
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

      const { meetingId } = req.params;
      const { userId, role = 'attendee' } = req.body;

      // Check if attendee already exists
      const { data: existingAttendee } = await supabase
        .from('meeting_attendees')
        .select('id')
        .eq('meeting_id', meetingId)
        .eq('user_id', userId)
        .single();

      if (existingAttendee) {
        return res.status(409).json({
          error: 'User is already an attendee of this meeting'
        });
      }

      const { data: attendee, error } = await supabase
        .from('meeting_attendees')
        .insert({
          meeting_id: meetingId,
          user_id: userId,
          role
        })
        .select(`
          *,
          user:users!meeting_attendees_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Attendee creation error:', error);
        return res.status(500).json({
          error: 'Failed to add attendee'
        });
      }

      res.status(201).json({
        message: 'Attendee added successfully',
        attendee
      });

    } catch (error) {
      console.error('Add attendee error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Update attendee status
router.put('/attendees/:attendeeId', 
  authenticateToken,
  [
    body('status')
      .isIn(['invited', 'accepted', 'declined', 'attended', 'absent'])
      .withMessage('Status must be invited, accepted, declined, attended, or absent')
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

      const { attendeeId } = req.params;
      const { status } = req.body;

      const { data: updatedAttendee, error } = await supabase
        .from('meeting_attendees')
        .update({ status })
        .eq('id', attendeeId)
        .select(`
          *,
          user:users!meeting_attendees_user_id_fkey (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (error) {
        console.error('Attendee update error:', error);
        return res.status(500).json({
          error: 'Failed to update attendee status'
        });
      }

      if (!updatedAttendee) {
        return res.status(404).json({
          error: 'Attendee not found'
        });
      }

      res.json({
        message: 'Attendee status updated successfully',
        attendee: updatedAttendee
      });

    } catch (error) {
      console.error('Update attendee error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get my meetings
router.get('/my-meetings', authenticateToken, getUserOrganizations, async (req, res) => {
  try {
    const { organizationId, status = '', upcoming = 'true', limit = 50 } = req.query;
    
    const organizationIds = organizationId 
      ? [organizationId]
      : req.user.organizations.map(org => org.organization_id);

    let query = supabase
      .from('meeting_attendees')
      .select(`
        id,
        status,
        role,
        meetings!inner (
          *,
          organizer:users!meetings_organizer_id_fkey (
            id,
            first_name,
            last_name
          ),
          organization:organizations!meetings_organization_id_fkey (
            id,
            name
          )
        )
      `)
      .eq('user_id', req.user.id)
      .in('meetings.organization_id', organizationIds);

    if (status) {
      query = query.eq('status', status);
    }
    
    if (upcoming === 'true') {
      query = query.gte('meetings.scheduled_at', new Date().toISOString());
    }

    const { data: attendeeRecords, error } = await query
      .limit(parseInt(limit))
      .order('meetings.scheduled_at', { ascending: true });

    if (error) {
      console.error('My meetings error:', error);
      return res.status(500).json({
        error: 'Failed to fetch your meetings'
      });
    }

    const meetings = attendeeRecords.map(record => ({
      ...record.meetings,
      my_status: record.status,
      my_role: record.role
    }));

    res.json({ meetings });

  } catch (error) {
    console.error('Get my meetings error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
