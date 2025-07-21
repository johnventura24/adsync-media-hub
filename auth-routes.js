const express = require('express');
const router = express.Router();
const authMiddleware = require('./auth-middleware');
const path = require('path');
const fs = require('fs');

// Database service (will be passed from main server)
let dbService;
let useFileBasedAuth = false;

// Initialize authentication middleware with database
function initialize(database) {
    dbService = database;
    
    // Check if database is configured
    const dbConfigured = process.env.DATABASE_URL || (process.env.PG_HOST && process.env.PG_DATABASE && process.env.PG_USER);
    
    if (!dbConfigured) {
        console.log('⚠️ Database not configured for auth routes, using file-based authentication');
        useFileBasedAuth = true;
        authMiddleware.initialize(null); // This will trigger file-based auth in middleware
        console.log('✅ Auth routes initialized with file-based authentication');
        return;
    }
    
    // Verify dbService has required methods
    if (!dbService) {
        console.error('❌ No database service provided to auth routes');
        console.log('⚠️ Falling back to file-based authentication');
        useFileBasedAuth = true;
        authMiddleware.initialize(null);
        return;
    }
    
    if (typeof dbService.query !== 'function') {
        console.error('❌ Database service does not have query method');
        console.log('Available methods:', Object.getOwnPropertyNames(dbService));
        
        // Try to create a fallback query method using direct PostgreSQL connection
        try {
            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL
            });
            
            dbService.query = async function(queryString, values = []) {
                console.log('🔄 Using direct PostgreSQL connection for query in auth routes');
                const result = await pool.query(queryString, values);
                return result;
            };
            
            console.log('✅ Added fallback query method to dbService in auth routes');
        } catch (error) {
            console.error('❌ PostgreSQL fallback failed in auth routes:', error.message);
            console.log('⚠️ Falling back to file-based authentication');
            useFileBasedAuth = true;
            authMiddleware.initialize(null);
            return;
        }
    }
    
    authMiddleware.initialize(database);
    console.log('✅ Auth routes initialized with database service');
}

function getFileBasedAuthData() {
    const authFile = path.join(__dirname, 'data', 'auth.json');
    if (fs.existsSync(authFile)) {
        return JSON.parse(fs.readFileSync(authFile, 'utf8'));
    }
    return { users: [], teams: [], team_members: [], nextUserId: 1, nextTeamId: 1 };
}

function saveFileBasedAuthData(data) {
    const authFile = path.join(__dirname, 'data', 'auth.json');
    fs.writeFileSync(authFile, JSON.stringify(data, null, 2));
}

// File-based profile update function
function updateProfileFromFile(req, res, profileData) {
    try {
        const { username, email, firstName, lastName, preferences } = profileData;
        const data = getFileBasedAuthData();
        
        // Find the user
        const userIndex = data.users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if email or username already exists for another user
        if (email || username) {
            const existingUser = data.users.find(u => 
                (u.email === email || u.username === username) && u.id !== req.user.id
            );
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email or username already exists'
                });
            }
        }
        
        // Update user profile
        const user = data.users[userIndex];
        if (username) user.username = username;
        if (email) user.email = email;
        if (firstName) user.first_name = firstName;
        if (lastName) user.last_name = lastName;
        if (preferences) user.preferences = preferences;
        user.updated_at = new Date().toISOString();
        
        // Save the updated data
        saveFileBasedAuthData(data);
        
        res.json({
            success: true,
            message: 'Profile updated successfully',
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
        console.error('Error updating profile from file:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

// File-based profile get function
function getProfileFromFile(req, res) {
    try {
        const data = getFileBasedAuthData();
        
        // Find the user
        const user = data.users.find(u => u.id === req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
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
        console.error('Error getting profile from file:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

// File-based password change function
async function changePasswordFromFile(req, res, passwordData) {
    try {
        const { currentPassword, newPassword } = passwordData;
        const data = getFileBasedAuthData();
        
        // Find the user
        const userIndex = data.users.findIndex(u => u.id === req.user.id);
        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = data.users[userIndex];
        
        // Verify current password
        const bcrypt = require('bcrypt');
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Update password
        user.password_hash = newPasswordHash;
        user.updated_at = new Date().toISOString();
        
        // Save the updated data
        saveFileBasedAuthData(data);
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Error changing password from file:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
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
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    });
});

// Get current user info
router.get('/me', authMiddleware.requireAuth, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
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
        
        const team = await authMiddleware.createTeam({
            name,
            description
        }, req.user.id);
        
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
router.get('/teams/:teamId/members', authMiddleware.requireAuth, async (req, res) => {
    try {
        const teamId = req.params.teamId;
        const members = await authMiddleware.getTeamMembers(teamId);
        
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
router.post('/teams/:teamId/invite', authMiddleware.requireAuth, async (req, res) => {
    try {
        const teamId = req.params.teamId;
        const { email, role } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        
        const result = await authMiddleware.inviteToTeam(teamId, email, role || 'member', req.user.id);
        
        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Invite to team error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to invite user'
        });
    }
});

// Update team settings
router.put('/teams/:teamId', authMiddleware.requireAuth, async (req, res) => {
    try {
        const teamId = req.params.teamId;
        const { name, description } = req.body;
        
        const result = await dbService.query(
            'UPDATE teams SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND owner_id = $4 RETURNING *',
            [name, description, teamId, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Team not found or you are not the owner'
            });
        }
        
        res.json({
            success: true,
            message: 'Team updated successfully',
            team: result.rows[0]
        });
    } catch (error) {
        console.error('Update team error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update team'
        });
    }
});

// Remove team member
router.delete('/teams/:teamId/members/:userId', authMiddleware.requireAuth, async (req, res) => {
    try {
        const teamId = req.params.teamId;
        const userId = req.params.userId;
        
        // Check if user has permission to remove members
        const hasPermission = await authMiddleware.checkTeamPermission(req.user.id, teamId, 'admin');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to remove team members'
            });
        }
        
        const result = await dbService.query(
            'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
            [teamId, userId]
        );
        
        res.json({
            success: true,
            message: 'Team member removed successfully'
        });
    } catch (error) {
        console.error('Remove team member error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove team member'
        });
    }
});

// Update team member role
router.put('/teams/:teamId/members/:userId/role', authMiddleware.requireAuth, async (req, res) => {
    try {
        const teamId = req.params.teamId;
        const userId = req.params.userId;
        const { role } = req.body;
        
        // Check if user has permission to update roles
        const hasPermission = await authMiddleware.checkTeamPermission(req.user.id, teamId, 'admin');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to update team member roles'
            });
        }
        
        const permissions = role === 'admin' ? ['read', 'write', 'admin', 'invite'] : ['read', 'write'];
        
        const result = await dbService.query(
            'UPDATE team_members SET role = $1, permissions = $2 WHERE team_id = $3 AND user_id = $4',
            [role, JSON.stringify(permissions), teamId, userId]
        );
        
        res.json({
            success: true,
            message: 'Team member role updated successfully'
        });
    } catch (error) {
        console.error('Update team member role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update team member role'
        });
    }
});

// Delete team
router.delete('/teams/:teamId', authMiddleware.requireAuth, async (req, res) => {
    try {
        const teamId = req.params.teamId;
        
        const result = await dbService.query(
            'DELETE FROM teams WHERE id = $1 AND owner_id = $2',
            [teamId, req.user.id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Team not found or you are not the owner'
            });
        }
        
        res.json({
            success: true,
            message: 'Team deleted successfully'
        });
    } catch (error) {
        console.error('Delete team error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete team'
        });
    }
});

// User Profile Management Endpoints

// Get user profile
router.get('/profile', authMiddleware.requireAuth, async (req, res) => {
    try {
        // Use file-based authentication if database is not available
        if (useFileBasedAuth) {
            return getProfileFromFile(req, res);
        }
        
        const result = await dbService.query(
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
        
        // Validate required fields
        if (!firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'First name and last name are required'
            });
        }
        
        // Use file-based authentication if database is not available
        if (useFileBasedAuth) {
            return updateProfileFromFile(req, res, { username, email, firstName, lastName, preferences });
        }
        
        // Check if email or username already exists for another user
        if (email || username) {
            const existingUser = await dbService.query(
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
        const result = await dbService.query(
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
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }
        
        // Use file-based authentication if database is not available
        if (useFileBasedAuth) {
            return await changePasswordFromFile(req, res, { currentPassword, newPassword });
        }
        
        // Get current user password
        const userResult = await dbService.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Verify current password
        const bcrypt = require('bcrypt');
        const isCurrentValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
        
        if (!isCurrentValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }
        
        // Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        await dbService.query(
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
        
        const result = await dbService.query(
            'UPDATE users SET preferences = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING preferences',
            [JSON.stringify(preferences), req.user.id]
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
        
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required to delete account'
            });
        }
        
        // Get current user password
        const userResult = await dbService.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Verify password
        const bcrypt = require('bcrypt');
        const isValid = await bcrypt.compare(password, userResult.rows[0].password_hash);
        
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Password is incorrect'
            });
        }
        
        // Delete user account
        await dbService.query('DELETE FROM users WHERE id = $1', [req.user.id]);
        
        // Destroy session
        req.session.destroy();
        
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