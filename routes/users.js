const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/database');
const { authenticateToken, requireManagerOrAdmin, getUserOrganizations, requireOrganizationAccess } = require('../middleware/auth');

const router = express.Router();

// Get all users (no auth required for demo)
router.get('/', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        department,
        position,
        phone,
        is_active,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      users: users || [],
      total: users?.length || 0
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all users in organization
router.get('/organization/:organizationId', 
  authenticateToken, 
  getUserOrganizations, 
  requireOrganizationAccess, 
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 10, search = '', role = '', department = '' } = req.query;

      let query = supabase
        .from('user_organizations')
        .select(`
          user_id,
          role,
          joined_at,
          users (
            id,
            email,
            first_name,
            last_name,
            role,
            department,
            position,
            phone,
            avatar_url,
            is_active,
            last_login,
            created_at
          )
        `)
        .eq('organization_id', organizationId);

      // Apply filters
      if (search) {
        query = query.or(`users.first_name.ilike.%${search}%,users.last_name.ilike.%${search}%,users.email.ilike.%${search}%`);
      }
      if (role) {
        query = query.eq('users.role', role);
      }
      if (department) {
        query = query.eq('users.department', department);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await query
        .range(from, to)
        .order('users.first_name', { ascending: true });

      if (error) {
        console.error('Users fetch error:', error);
        return res.status(500).json({
          error: 'Failed to fetch users'
        });
      }

      const users = data.map(item => ({
        ...item.users,
        organization_role: item.role,
        joined_at: item.joined_at
      }));

      res.json({
        users,
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
      console.error('Get users error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get user profile
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        department,
        position,
        phone,
        avatar_url,
        is_active,
        last_login,
        created_at,
        user_organizations (
          organization_id,
          role,
          joined_at,
          organizations (
            id,
            name,
            description
          )
        )
      `)
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Check if current user can view this profile
    const canView = req.user.id === userId || 
                   req.user.role === 'admin' ||
                   req.user.organizations.some(org => 
                     user.user_organizations.some(userOrg => 
                       userOrg.organization_id === org.organization_id
                     )
                   );

    if (!canView) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Update user profile (admin only)
router.put('/:userId', 
  authenticateToken, 
  requireManagerOrAdmin,
  [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('First name must be between 2 and 100 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Last name must be between 2 and 100 characters'),
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'member'])
      .withMessage('Role must be admin, manager, or member'),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Department must be less than 100 characters'),
    body('position')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Position must be less than 100 characters'),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Phone must be less than 20 characters'),
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

      const { userId } = req.params;
      const { firstName, lastName, role, department, position, phone, isActive } = req.body;

      // Check if user exists
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .single();

      if (fetchError || !existingUser) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Only admin can change roles or activate/deactivate users
      if ((role && role !== existingUser.role) || (isActive !== undefined)) {
        if (req.user.role !== 'admin') {
          return res.status(403).json({
            error: 'Only administrators can change user roles or activation status'
          });
        }
      }

      const updateData = {};
      if (firstName !== undefined) updateData.first_name = firstName;
      if (lastName !== undefined) updateData.last_name = lastName;
      if (role !== undefined) updateData.role = role;
      if (department !== undefined) updateData.department = department;
      if (position !== undefined) updateData.position = position;
      if (phone !== undefined) updateData.phone = phone;
      if (isActive !== undefined) updateData.is_active = isActive;

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select('id, email, first_name, last_name, role, department, position, phone, is_active')
        .single();

      if (updateError) {
        console.error('User update error:', updateError);
        return res.status(500).json({
          error: 'Failed to update user'
        });
      }

      res.json({
        message: 'User updated successfully',
        user: updatedUser
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Add user to organization
router.post('/:userId/organizations', 
  authenticateToken, 
  requireManagerOrAdmin,
  [
    body('organizationId')
      .notEmpty()
      .isUUID()
      .withMessage('Valid organization ID is required'),
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'member'])
      .withMessage('Role must be admin, manager, or member')
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

      const { userId } = req.params;
      const { organizationId, role = 'member' } = req.body;

      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Check if organization exists
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', organizationId)
        .single();

      if (orgError || !organization) {
        return res.status(404).json({
          error: 'Organization not found'
        });
      }

      // Check if user is already in organization
      const { data: existingMembership } = await supabase
        .from('user_organizations')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single();

      if (existingMembership) {
        return res.status(409).json({
          error: 'User is already a member of this organization'
        });
      }

      // Add user to organization
      const { data: membership, error: membershipError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          role: role
        })
        .select(`
          id,
          role,
          joined_at,
          organizations (
            id,
            name,
            description
          )
        `)
        .single();

      if (membershipError) {
        console.error('Membership creation error:', membershipError);
        return res.status(500).json({
          error: 'Failed to add user to organization'
        });
      }

      res.status(201).json({
        message: 'User added to organization successfully',
        membership
      });

    } catch (error) {
      console.error('Add user to organization error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Remove user from organization
router.delete('/:userId/organizations/:organizationId', 
  authenticateToken, 
  requireManagerOrAdmin,
  async (req, res) => {
    try {
      const { userId, organizationId } = req.params;

      // Check if membership exists
      const { data: membership, error: fetchError } = await supabase
        .from('user_organizations')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .single();

      if (fetchError || !membership) {
        return res.status(404).json({
          error: 'User is not a member of this organization'
        });
      }

      // Remove membership
      const { error: deleteError } = await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      if (deleteError) {
        console.error('Membership deletion error:', deleteError);
        return res.status(500).json({
          error: 'Failed to remove user from organization'
        });
      }

      res.json({
        message: 'User removed from organization successfully'
      });

    } catch (error) {
      console.error('Remove user from organization error:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }
);

// Get user activity/stats
router.get('/:userId/activity', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { organizationId } = req.query;

    // Check access permissions
    const canView = req.user.id === userId || 
                   req.user.role === 'admin' ||
                   req.user.role === 'manager';

    if (!canView) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Get user activity statistics
    const [rocksResult, todosResult, issuesResult, meetingsResult] = await Promise.all([
      // Rocks owned
      supabase
        .from('rocks')
        .select('id, status')
        .eq('owner_id', userId)
        .eq('organization_id', organizationId || req.user.organizations[0]?.organization_id),
      
      // Todos assigned
      supabase
        .from('todos')
        .select('id, status')
        .eq('assignee_id', userId)
        .eq('organization_id', organizationId || req.user.organizations[0]?.organization_id),
      
      // Issues assigned
      supabase
        .from('issues')
        .select('id, status')
        .eq('assignee_id', userId)
        .eq('organization_id', organizationId || req.user.organizations[0]?.organization_id),
      
      // Meetings attended
      supabase
        .from('meeting_attendees')
        .select('id, status, meetings!inner(organization_id)')
        .eq('user_id', userId)
        .eq('meetings.organization_id', organizationId || req.user.organizations[0]?.organization_id)
    ]);

    const activity = {
      rocks: {
        total: rocksResult.data?.length || 0,
        completed: rocksResult.data?.filter(r => r.status === 'completed').length || 0,
        in_progress: rocksResult.data?.filter(r => r.status === 'in_progress').length || 0
      },
      todos: {
        total: todosResult.data?.length || 0,
        completed: todosResult.data?.filter(t => t.status === 'completed').length || 0,
        pending: todosResult.data?.filter(t => t.status === 'pending').length || 0
      },
      issues: {
        total: issuesResult.data?.length || 0,
        resolved: issuesResult.data?.filter(i => i.status === 'resolved').length || 0,
        open: issuesResult.data?.filter(i => i.status === 'open').length || 0
      },
      meetings: {
        total: meetingsResult.data?.length || 0,
        attended: meetingsResult.data?.filter(m => m.status === 'attended').length || 0
      }
    };

    res.json({ activity });

  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Search users across all accessible organizations
router.get('/search', authenticateToken, getUserOrganizations, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: 'Search query must be at least 2 characters long'
      });
    }

    const organizationIds = req.user.organizations.map(org => org.organization_id);

    if (organizationIds.length === 0) {
      return res.json({ users: [] });
    }

    const { data: users, error } = await supabase
      .from('user_organizations')
      .select(`
        users (
          id,
          email,
          first_name,
          last_name,
          role,
          department,
          position,
          avatar_url,
          is_active
        )
      `)
      .in('organization_id', organizationIds)
      .or(`users.first_name.ilike.%${q}%,users.last_name.ilike.%${q}%,users.email.ilike.%${q}%`)
      .limit(limit);

    if (error) {
      console.error('User search error:', error);
      return res.status(500).json({
        error: 'Search failed'
      });
    }

    const uniqueUsers = users.reduce((acc, item) => {
      const user = item.users;
      if (!acc.find(u => u.id === user.id)) {
        acc.push(user);
      }
      return acc;
    }, []);

    res.json({ users: uniqueUsers });

  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = router;
