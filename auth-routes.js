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

module.exports = { router, initialize }; 