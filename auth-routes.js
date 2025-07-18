const express = require('express');
const router = express.Router();
const authMiddleware = require('./auth-middleware');

// Initialize authentication middleware with database
function initialize(database) {
    authMiddleware.initialize(database);
}

// User registration endpoint
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, role } = req.body;
        
        // Validate required fields
        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        
        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }
        
        // Register user
        const user = await authMiddleware.registerUser({
            username,
            email,
            password,
            firstName,
            lastName,
            role
        });
        
        res.json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Registration failed'
        });
    }
});

// User login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        const loginResult = await authMiddleware.loginUser(email, password);
        
        // Set session
        req.session.token = loginResult.token;
        req.session.userId = loginResult.user.id;
        req.session.sessionToken = loginResult.sessionToken;
        
        res.json({
            success: true,
            message: 'Login successful',
            user: loginResult.user,
            token: loginResult.token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({
            success: false,
            message: error.message || 'Login failed'
        });
    }
});

// User logout endpoint
router.post('/logout', authMiddleware.requireAuth, async (req, res) => {
    try {
        const sessionToken = req.session?.sessionToken;
        
        if (sessionToken) {
            await authMiddleware.logoutUser(sessionToken);
        }
        
        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
            }
        });
        
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

// Get current user info
router.get('/me', authMiddleware.requireAuth, async (req, res) => {
    try {
        const teams = await authMiddleware.getUserTeams(req.user.id);
        
        res.json({
            success: true,
            user: req.user,
            teams: teams
        });
    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user information'
        });
    }
});

// Get user teams
router.get('/teams', authMiddleware.requireAuth, async (req, res) => {
    try {
        const teams = await authMiddleware.getUserTeams(req.user.id);
        
        res.json({
            success: true,
            teams: teams
        });
    } catch (error) {
        console.error('Get teams error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get teams'
        });
    }
});

// Create team
router.post('/teams', authMiddleware.requireAuth, async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Team name is required'
            });
        }
        
        const team = await authMiddleware.createTeam(
            { name, description },
            req.user.id
        );
        
        res.json({
            success: true,
            message: 'Team created successfully',
            team: team
        });
    } catch (error) {
        console.error('Create team error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create team'
        });
    }
});

// Get team members
router.get('/teams/:teamId/members', 
    authMiddleware.requireAuth, 
    authMiddleware.requireTeamAccess, 
    async (req, res) => {
    try {
        const members = await authMiddleware.getTeamMembers(req.params.teamId);
        
        res.json({
            success: true,
            members: members
        });
    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get team members'
        });
    }
});

// Invite user to team
router.post('/teams/:teamId/invite', 
    authMiddleware.requireAuth, 
    authMiddleware.requireTeamAccess, 
    authMiddleware.requirePermission('invite'),
    async (req, res) => {
    try {
        const { email, role = 'member' } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        
        const result = await authMiddleware.inviteToTeam(
            req.params.teamId,
            email,
            role,
            req.user.id
        );
        
        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Invite user error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to invite user'
        });
    }
});

// Check authentication status
router.get('/status', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1] || req.session?.token;
    
    if (!token) {
        return res.json({
            success: false,
            authenticated: false,
            message: 'Not authenticated'
        });
    }
    
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        res.json({
            success: true,
            authenticated: true,
            user: decoded
        });
    } catch (error) {
        res.json({
            success: false,
            authenticated: false,
            message: 'Invalid token'
        });
    }
});

// Update team settings
router.put('/teams/:teamId', 
    authMiddleware.requireAuth, 
    authMiddleware.requireTeamAccess, 
    authMiddleware.requirePermission('admin'),
    async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Team name is required'
            });
        }
        
        const result = await authMiddleware.updateTeam(req.params.teamId, { name, description });
        
        res.json({
            success: true,
            message: 'Team updated successfully',
            team: result
        });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update team'
        });
    }
});

// Remove team member
router.delete('/teams/:teamId/members/:userId', 
    authMiddleware.requireAuth, 
    authMiddleware.requireTeamAccess, 
    authMiddleware.requirePermission('admin'),
    async (req, res) => {
    try {
        const result = await authMiddleware.removeTeamMember(req.params.teamId, req.params.userId);
        
        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Remove team member error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to remove team member'
        });
    }
});

// Update team member role
router.put('/teams/:teamId/members/:userId/role', 
    authMiddleware.requireAuth, 
    authMiddleware.requireTeamAccess, 
    authMiddleware.requirePermission('admin'),
    async (req, res) => {
    try {
        const { role } = req.body;
        
        if (!role || !['admin', 'member'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Valid role is required (admin or member)'
            });
        }
        
        const result = await authMiddleware.updateTeamMemberRole(req.params.teamId, req.params.userId, role);
        
        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Update team member role error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to update team member role'
        });
    }
});

// Delete team
router.delete('/teams/:teamId', 
    authMiddleware.requireAuth, 
    authMiddleware.requireTeamAccess, 
    authMiddleware.requirePermission('admin'),
    async (req, res) => {
    try {
        const result = await authMiddleware.deleteTeam(req.params.teamId, req.user.id);
        
        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete team'
        });
    }
});

// User Profile Management Endpoints

// Get user profile
router.get('/profile', authMiddleware.requireAuth, async (req, res) => {
    try {
        const { db } = req.app.locals;
        const result = await db.query(
            'SELECT id, username, email, first_name, last_name, role, created_at, updated_at, preferences FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = result.rows[0];
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
                preferences: user.preferences ? JSON.parse(user.preferences) : {}
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile'
        });
    }
});

// Update user profile
router.put('/profile', authMiddleware.requireAuth, async (req, res) => {
    try {
        const { username, email, firstName, lastName, preferences } = req.body;
        const { db } = req.app.locals;
        
        // Validate required fields
        if (!firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'First name and last name are required'
            });
        }
        
        // Check if email or username already exists for another user
        if (email || username) {
            const existingUser = await db.query(
                'SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3',
                [email || '', username || '', req.user.id]
            );
            
            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email or username already exists'
                });
            }
        }
        
        // Update user profile
        const result = await db.query(
            `UPDATE users 
             SET username = COALESCE($1, username), 
                 email = COALESCE($2, email), 
                 first_name = $3, 
                 last_name = $4, 
                 preferences = $5, 
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 
             RETURNING id, username, email, first_name, last_name, role, updated_at, preferences`,
            [username, email, firstName, lastName, preferences ? JSON.stringify(preferences) : null, req.user.id]
        );
        
        const user = result.rows[0];
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role,
                updatedAt: user.updated_at,
                preferences: user.preferences ? JSON.parse(user.preferences) : {}
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

// Change password
router.put('/profile/password', authMiddleware.requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const { db } = req.app.locals;
        
        // Validate required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        
        // Validate new password strength
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }
        
        // Get current user
        const userResult = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = userResult.rows[0];
        const bcrypt = require('bcrypt');
        
        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPasswordHash, req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

// Update user preferences
router.put('/profile/preferences', authMiddleware.requireAuth, async (req, res) => {
    try {
        const { preferences } = req.body;
        const { db } = req.app.locals;
        
        // Update preferences
        const result = await db.query(
            `UPDATE users 
             SET preferences = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING preferences`,
            [JSON.stringify(preferences || {}), req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Preferences updated successfully',
            preferences: JSON.parse(result.rows[0].preferences)
        });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update preferences'
        });
    }
});

// Delete user account
router.delete('/profile', authMiddleware.requireAuth, async (req, res) => {
    try {
        const { password } = req.body;
        const { db } = req.app.locals;
        
        // Validate password
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required to delete account'
            });
        }
        
        // Get current user
        const userResult = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = userResult.rows[0];
        const bcrypt = require('bcrypt');
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Invalid password'
            });
        }
        
        // Remove user from all teams
        await db.query('DELETE FROM team_members WHERE user_id = $1', [req.user.id]);
        
        // Delete user account
        await db.query('DELETE FROM users WHERE id = $1', [req.user.id]);
        
        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account'
        });
    }
});

module.exports = { router, initialize }; 