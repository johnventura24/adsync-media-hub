const express = require('express');
const { supabase } = require('../config/database');
const { authenticateToken, getUserOrganizations } = require('../middleware/auth');

const router = express.Router();

// Get dashboard overview for organization
router.get('/organization/:organizationId', 
  authenticateToken, 
  getUserOrganizations,
  async (req, res) => {
    try {
      const { organizationId } = req.params;

      // Check organization access
      const hasAccess = req.user.organizations.some(
        org => org.organization_id === organizationId
      );

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this organization'
        });
      }

      // Get current quarter and year
      const now = new Date();
      const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
      const currentYear = now.getFullYear();
      const today = now.toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch all data in parallel
      const [
        rocksResult,
        todosResult,
        issuesResult,
        meetingsResult,
        scoresResult,
        processesResult,
        usersResult
      ] = await Promise.all([
        // Rocks (current quarter)
        supabase
          .from('rocks')
          .select('id, status, completion_percentage, priority, due_date')
          .eq('organization_id', organizationId)
          .eq('quarter', currentQuarter)
          .eq('year', currentYear),

        // Todos
        supabase
          .from('todos')
          .select('id, status, priority, due_date, created_at')
          .eq('organization_id', organizationId),

        // Issues
        supabase
          .from('issues')
          .select('id, status, priority, created_at, resolved_at')
          .eq('organization_id', organizationId),

        // Meetings (upcoming and recent)
        supabase
          .from('meetings')
          .select('id, status, scheduled_at, meeting_type')
          .eq('organization_id', organizationId)
          .gte('scheduled_at', thirtyDaysAgo),

        // Scorecard entries (recent)
        supabase
          .from('scorecard_entries')
          .select(`
            id, value, status, period_start, period_end,
            scorecard_metrics!inner (
              id, name, target_value,
              scorecards!inner (
                organization_id
              )
            )
          `)
          .eq('scorecard_metrics.scorecards.organization_id', organizationId)
          .gte('period_start', thirtyDaysAgo),

        // Processes
        supabase
          .from('processes')
          .select('id, is_active, last_reviewed')
          .eq('organization_id', organizationId),

        // Active users count
        supabase
          .from('user_organizations')
          .select(`
            user_id,
            users!inner (
              id, is_active, last_login
            )
          `)
          .eq('organization_id', organizationId)
          .eq('users.is_active', true)
      ]);

      // Process the data
      const rocks = rocksResult.data || [];
      const todos = todosResult.data || [];
      const issues = issuesResult.data || [];
      const meetings = meetingsResult.data || [];
      const scoreEntries = scoresResult.data || [];
      const processes = processesResult.data || [];
      const users = usersResult.data || [];

      // Calculate metrics
      const dashboard = {
        organization_id: organizationId,
        generated_at: now.toISOString(),
        period: {
          quarter: currentQuarter,
          year: currentYear
        },
        
        // Rocks metrics
        rocks: {
          total: rocks.length,
          not_started: rocks.filter(r => r.status === 'not_started').length,
          in_progress: rocks.filter(r => r.status === 'in_progress').length,
          completed: rocks.filter(r => r.status === 'completed').length,
          abandoned: rocks.filter(r => r.status === 'abandoned').length,
          average_completion: rocks.length > 0 
            ? Math.round(rocks.reduce((sum, r) => sum + r.completion_percentage, 0) / rocks.length)
            : 0,
          overdue: rocks.filter(r => r.due_date && r.due_date < today && r.status !== 'completed').length,
          high_priority: rocks.filter(r => r.priority <= 3 && r.status !== 'completed').length
        },

        // Todos metrics
        todos: {
          total: todos.length,
          pending: todos.filter(t => t.status === 'pending').length,
          in_progress: todos.filter(t => t.status === 'in_progress').length,
          completed: todos.filter(t => t.status === 'completed').length,
          cancelled: todos.filter(t => t.status === 'cancelled').length,
          overdue: todos.filter(t => t.due_date && t.due_date < today && t.status !== 'completed').length,
          due_today: todos.filter(t => t.due_date === today && t.status !== 'completed').length,
          created_this_month: todos.filter(t => t.created_at >= thirtyDaysAgo).length,
          by_priority: {
            urgent: todos.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
            high: todos.filter(t => t.priority === 'high' && t.status !== 'completed').length,
            medium: todos.filter(t => t.priority === 'medium' && t.status !== 'completed').length,
            low: todos.filter(t => t.priority === 'low' && t.status !== 'completed').length
          }
        },

        // Issues metrics
        issues: {
          total: issues.length,
          open: issues.filter(i => i.status === 'open').length,
          in_progress: issues.filter(i => i.status === 'in_progress').length,
          resolved: issues.filter(i => i.status === 'resolved').length,
          closed: issues.filter(i => i.status === 'closed').length,
          created_this_month: issues.filter(i => i.created_at >= thirtyDaysAgo).length,
          resolved_this_month: issues.filter(i => i.resolved_at && i.resolved_at >= thirtyDaysAgo).length,
          by_priority: {
            critical: issues.filter(i => i.priority === 'critical' && i.status !== 'resolved' && i.status !== 'closed').length,
            high: issues.filter(i => i.priority === 'high' && i.status !== 'resolved' && i.status !== 'closed').length,
            medium: issues.filter(i => i.priority === 'medium' && i.status !== 'resolved' && i.status !== 'closed').length,
            low: issues.filter(i => i.priority === 'low' && i.status !== 'resolved' && i.status !== 'closed').length
          }
        },

        // Meetings metrics
        meetings: {
          total_this_month: meetings.length,
          upcoming: meetings.filter(m => m.scheduled_at > now.toISOString()).length,
          completed: meetings.filter(m => m.status === 'completed').length,
          cancelled: meetings.filter(m => m.status === 'cancelled').length,
          by_type: meetings.reduce((acc, m) => {
            acc[m.meeting_type] = (acc[m.meeting_type] || 0) + 1;
            return acc;
          }, {})
        },

        // Scorecard metrics
        scorecards: {
          total_entries: scoreEntries.length,
          on_track: scoreEntries.filter(e => e.status === 'on_track').length,
          off_track: scoreEntries.filter(e => e.status === 'off_track').length,
          at_risk: scoreEntries.filter(e => e.status === 'at_risk').length,
          metrics_tracked: [...new Set(scoreEntries.map(e => e.scorecard_metrics.id))].length
        },

        // Process metrics
        processes: {
          total: processes.length,
          active: processes.filter(p => p.is_active).length,
          inactive: processes.filter(p => !p.is_active).length,
          needs_review: processes.filter(p => 
            !p.last_reviewed || new Date(p.last_reviewed) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          ).length
        },

        // Team metrics
        team: {
          total_members: users.length,
          active_members: users.filter(u => u.users.is_active).length,
          recent_logins: users.filter(u => 
            u.users.last_login && new Date(u.users.last_login) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length
        }
      };

      res.json({ dashboard });

    } catch (error) {
      console.error('Dashboard overview error:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard data'
      });
    }
  }
);

// Get user's personal dashboard
router.get('/my-dashboard', authenticateToken, getUserOrganizations, async (req, res) => {
  try {
    const { organizationId } = req.query;
    
    const organizationIds = organizationId 
      ? [organizationId]
      : req.user.organizations.map(org => org.organization_id);

    if (organizationIds.length === 0) {
      return res.json({
        dashboard: {
          rocks: [],
          todos: [],
          issues: [],
          meetings: [],
          notifications: []
        }
      });
    }

    const now = new Date();
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
    const currentYear = now.getFullYear();
    const today = now.toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch user-specific data
    const [
      rocksResult,
      todosResult,
      issuesResult,
      meetingsResult,
      notificationsResult
    ] = await Promise.all([
      // My rocks (current quarter)
      supabase
        .from('rocks')
        .select(`
          id, title, status, completion_percentage, due_date, priority,
          organization:organizations!rocks_organization_id_fkey (id, name)
        `)
        .eq('owner_id', req.user.id)
        .in('organization_id', organizationIds)
        .eq('quarter', currentQuarter)
        .eq('year', currentYear)
        .order('priority', { ascending: true })
        .limit(10),

      // My todos (active)
      supabase
        .from('todos')
        .select(`
          id, title, status, priority, due_date,
          organization:organizations!todos_organization_id_fkey (id, name),
          rock:rocks (id, title)
        `)
        .eq('assignee_id', req.user.id)
        .in('organization_id', organizationIds)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true, nullsLast: true })
        .order('priority', { ascending: false })
        .limit(15),

      // My issues (active)
      supabase
        .from('issues')
        .select(`
          id, title, status, priority, due_date,
          organization:organizations!issues_organization_id_fkey (id, name)
        `)
        .eq('assignee_id', req.user.id)
        .in('organization_id', organizationIds)
        .neq('status', 'resolved')
        .neq('status', 'closed')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10),

      // My upcoming meetings
      supabase
        .from('meeting_attendees')
        .select(`
          id, status, role,
          meetings!inner (
            id, title, scheduled_at, meeting_type, location, meeting_url,
            organization:organizations!meetings_organization_id_fkey (id, name),
            organizer:users!meetings_organizer_id_fkey (id, first_name, last_name)
          )
        `)
        .eq('user_id', req.user.id)
        .in('meetings.organization_id', organizationIds)
        .gte('meetings.scheduled_at', now.toISOString())
        .lte('meetings.scheduled_at', weekFromNow)
        .order('meetings.scheduled_at', { ascending: true })
        .limit(10),

      // My notifications (unread)
      supabase
        .from('notifications')
        .select('id, title, message, type, created_at, entity_type, entity_id')
        .eq('user_id', req.user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20)
    ]);

    const rocks = rocksResult.data || [];
    const todos = todosResult.data || [];
    const issues = issuesResult.data || [];
    const meetingAttendees = meetingsResult.data || [];
    const notifications = notificationsResult.data || [];

    // Extract meetings from attendee records
    const meetings = meetingAttendees.map(attendee => ({
      ...attendee.meetings,
      my_status: attendee.status,
      my_role: attendee.role
    }));

    // Calculate quick stats
    const stats = {
      rocks_completion: rocks.length > 0 
        ? Math.round(rocks.reduce((sum, r) => sum + r.completion_percentage, 0) / rocks.length)
        : 0,
      todos_overdue: todos.filter(t => t.due_date && t.due_date < today).length,
      todos_due_today: todos.filter(t => t.due_date === today).length,
      high_priority_items: [
        ...todos.filter(t => t.priority === 'urgent' || t.priority === 'high'),
        ...issues.filter(i => i.priority === 'critical' || i.priority === 'high')
      ].length,
      meetings_today: meetings.filter(m => 
        m.scheduled_at.split('T')[0] === today
      ).length
    };

    const dashboard = {
      user_id: req.user.id,
      generated_at: now.toISOString(),
      stats,
      rocks,
      todos,
      issues,
      meetings,
      notifications
    };

    res.json({ dashboard });

  } catch (error) {
    console.error('Personal dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch personal dashboard'
    });
  }
});

// Get dashboard charts data
router.get('/organization/:organizationId/charts', 
  authenticateToken, 
  getUserOrganizations,
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { timeframe = '30' } = req.query; // days

      // Check organization access
      const hasAccess = req.user.organizations.some(
        org => org.organization_id === organizationId
      );

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied to this organization'
        });
      }

      const daysAgo = parseInt(timeframe);
      const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      // Fetch time-series data
      const [todosResult, issuesResult, meetingsResult] = await Promise.all([
        supabase
          .from('todos')
          .select('created_at, completed_at, status')
          .eq('organization_id', organizationId)
          .gte('created_at', startDate.toISOString()),

        supabase
          .from('issues')
          .select('created_at, resolved_at, status, priority')
          .eq('organization_id', organizationId)
          .gte('created_at', startDate.toISOString()),

        supabase
          .from('meetings')
          .select('scheduled_at, status, meeting_type')
          .eq('organization_id', organizationId)
          .gte('scheduled_at', startDate.toISOString())
      ]);

      const todos = todosResult.data || [];
      const issues = issuesResult.data || [];
      const meetings = meetingsResult.data || [];

      // Generate daily data points
      const chartData = [];
      for (let i = daysAgo; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        
        chartData.push({
          date: dateStr,
          todos_created: todos.filter(t => t.created_at.split('T')[0] === dateStr).length,
          todos_completed: todos.filter(t => t.completed_at && t.completed_at.split('T')[0] === dateStr).length,
          issues_created: issues.filter(i => i.created_at.split('T')[0] === dateStr).length,
          issues_resolved: issues.filter(i => i.resolved_at && i.resolved_at.split('T')[0] === dateStr).length,
          meetings_scheduled: meetings.filter(m => m.scheduled_at.split('T')[0] === dateStr).length
        });
      }

      // Priority distribution
      const priorityDistribution = {
        todos: todos.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {}),
        issues: issues.reduce((acc, i) => {
          acc[i.priority] = (acc[i.priority] || 0) + 1;
          return acc;
        }, {})
      };

      res.json({
        timeframe: daysAgo,
        chart_data: chartData,
        priority_distribution: priorityDistribution,
        totals: {
          todos_created: todos.length,
          todos_completed: todos.filter(t => t.status === 'completed').length,
          issues_created: issues.length,
          issues_resolved: issues.filter(i => i.status === 'resolved').length,
          meetings_held: meetings.filter(m => m.status === 'completed').length
        }
      });

    } catch (error) {
      console.error('Dashboard charts error:', error);
      res.status(500).json({
        error: 'Failed to fetch chart data'
      });
    }
  }
);

// Mark notification as read
router.put('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Notification update error:', error);
      return res.status(500).json({
        error: 'Failed to mark notification as read'
      });
    }

    if (!notification) {
      return res.status(404).json({
        error: 'Notification not found'
      });
    }

    res.json({
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Mark all notifications as read
router.put('/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', req.user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Mark all notifications read error:', error);
      return res.status(500).json({
        error: 'Failed to mark notifications as read'
      });
    }

    res.json({
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
