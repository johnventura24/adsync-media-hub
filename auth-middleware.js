const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Database connection (will be passed from main server)
let db;

// Initialize with database connection
function initialize(database) {
    db = database;
}

// Authentication middleware
function requireAuth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1] || req.session?.token;
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid token' 
        });
    }
}

// Team membership middleware
function requireTeamAccess(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    
    // Admin users have access to all teams
    if (req.user.role === 'admin') {
        return next();
    }
    
    // Check if user is member of the team
    const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
    
    if (!teamId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Team ID required' 
        });
    }
    
    // Check team membership
    db.query(
        'SELECT role, permissions FROM team_members WHERE team_id = $1 AND user_id = $2 AND is_active = true',
        [teamId, req.user.id]
    ).then(result => {
        if (result.rows.length === 0) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied to this team' 
            });
        }
        
        req.teamRole = result.rows[0].role;
        req.teamPermissions = JSON.parse(result.rows[0].permissions || '[]');
        next();
    }).catch(error => {
        console.error('Team access check error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error checking team access' 
        });
    });
}

// Permission check middleware
function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }
        
        // Admin users have all permissions
        if (req.user.role === 'admin') {
            return next();
        }
        
        // Check if user has the required permission
        if (!req.teamPermissions || !req.teamPermissions.includes(permission)) {
            return res.status(403).json({ 
                success: false, 
                message: `Permission denied: ${permission} required` 
            });
        }
        
        next();
    };
}

// User registration
async function registerUser(userData) {
    const { username, email, password, firstName, lastName, role = 'member' } = userData;
    
    try {
        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        if (existingUser.rows.length > 0) {
            throw new Error('User already exists with this email or username');
        }
        
        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Insert new user
        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, first_name, last_name, role) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, username, email, first_name, last_name, role, created_at`,
            [username, email, passwordHash, firstName, lastName, role]
        );
        
        return result.rows[0];
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

// User login
async function loginUser(email, password) {
    try {
        // Find user
        const result = await db.query(
            'SELECT id, username, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Invalid credentials');
        }
        
        const user = result.rows[0];
        
        if (!user.is_active) {
            throw new Error('Account is disabled');
        }
        
        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            throw new Error('Invalid credentials');
        }
        
        // Update last login
        await db.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );
        
        // Create session record
        const sessionToken = uuidv4();
        await db.query(
            'INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES ($1, $2, $3)',
            [user.id, sessionToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
        );
        
        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role
            },
            token,
            sessionToken
        };
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Get user teams
async function getUserTeams(userId) {
    try {
        const result = await db.query(
            `SELECT t.id, t.name, t.description, t.avatar_url, tm.role, tm.permissions
             FROM teams t
             JOIN team_members tm ON t.id = tm.team_id
             WHERE tm.user_id = $1 AND tm.is_active = true AND t.is_active = true
             ORDER BY t.name`,
            [userId]
        );
        
        return result.rows;
    } catch (error) {
        console.error('Get user teams error:', error);
        throw error;
    }
}

// Create team
async function createTeam(teamData, ownerId) {
    const { name, description } = teamData;
    
    try {
        // Create team
        const teamResult = await db.query(
            'INSERT INTO teams (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
            [name, description, ownerId]
        );
        
        const team = teamResult.rows[0];
        
        // Add owner as admin member
        await db.query(
            'INSERT INTO team_members (team_id, user_id, role, permissions) VALUES ($1, $2, $3, $4)',
            [team.id, ownerId, 'admin', JSON.stringify(['read', 'write', 'admin', 'invite'])]
        );
        
        return team;
    } catch (error) {
        console.error('Create team error:', error);
        throw error;
    }
}

// Invite user to team
async function inviteToTeam(teamId, email, role, invitedBy) {
    try {
        // Check if user exists
        const userResult = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        
        if (userResult.rows.length === 0) {
            throw new Error('User not found');
        }
        
        const userId = userResult.rows[0].id;
        
        // Check if user is already a member
        const memberResult = await db.query(
            'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
            [teamId, userId]
        );
        
        if (memberResult.rows.length > 0) {
            throw new Error('User is already a member of this team');
        }
        
        // Add user to team
        const permissions = role === 'admin' ? ['read', 'write', 'admin', 'invite'] : ['read', 'write'];
        
        await db.query(
            'INSERT INTO team_members (team_id, user_id, role, permissions) VALUES ($1, $2, $3, $4)',
            [teamId, userId, role, JSON.stringify(permissions)]
        );
        
        return { success: true, message: 'User added to team successfully' };
    } catch (error) {
        console.error('Invite to team error:', error);
        throw error;
    }
}

// Get team members
async function getTeamMembers(teamId) {
    try {
        const result = await db.query(
            `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.avatar_url,
                    tm.role, tm.permissions, tm.joined_at
             FROM users u
             JOIN team_members tm ON u.id = tm.user_id
             WHERE tm.team_id = $1 AND tm.is_active = true AND u.is_active = true
             ORDER BY tm.joined_at`,
            [teamId]
        );
        
        return result.rows;
    } catch (error) {
        console.error('Get team members error:', error);
        throw error;
    }
}

// Logout user
async function logoutUser(sessionToken) {
    try {
        await db.query(
            'UPDATE user_sessions SET is_active = false WHERE session_token = $1',
            [sessionToken]
        );
        
        return { success: true, message: 'Logged out successfully' };
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

// Update team settings
async function updateTeam(teamId, teamData) {
    const { name, description } = teamData;
    
    try {
        const result = await db.query(
            'UPDATE teams SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [name, description, teamId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Team not found');
        }
        
        return result.rows[0];
    } catch (error) {
        console.error('Update team error:', error);
        throw error;
    }
}

// Remove team member
async function removeTeamMember(teamId, userId) {
    try {
        const result = await db.query(
            'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
            [teamId, userId]
        );
        
        if (result.rowCount === 0) {
            throw new Error('Team member not found');
        }
        
        return { success: true, message: 'Team member removed successfully' };
    } catch (error) {
        console.error('Remove team member error:', error);
        throw error;
    }
}

// Update team member role
async function updateTeamMemberRole(teamId, userId, newRole) {
    try {
        const permissions = newRole === 'admin' ? ['read', 'write', 'admin', 'invite'] : ['read', 'write'];
        
        const result = await db.query(
            'UPDATE team_members SET role = $1, permissions = $2 WHERE team_id = $3 AND user_id = $4',
            [newRole, JSON.stringify(permissions), teamId, userId]
        );
        
        if (result.rowCount === 0) {
            throw new Error('Team member not found');
        }
        
        return { success: true, message: 'Team member role updated successfully' };
    } catch (error) {
        console.error('Update team member role error:', error);
        throw error;
    }
}

// Delete team
async function deleteTeam(teamId, userId) {
    try {
        // Check if user is the team owner
        const teamResult = await db.query(
            'SELECT owner_id FROM teams WHERE id = $1',
            [teamId]
        );
        
        if (teamResult.rows.length === 0) {
            throw new Error('Team not found');
        }
        
        const team = teamResult.rows[0];
        
        if (team.owner_id !== userId) {
            throw new Error('Only team owner can delete the team');
        }
        
        // Delete team (cascade will handle team_members)
        await db.query('DELETE FROM teams WHERE id = $1', [teamId]);
        
        return { success: true, message: 'Team deleted successfully' };
    } catch (error) {
        console.error('Delete team error:', error);
        throw error;
    }
}

module.exports = {
    initialize,
    requireAuth,
    requireTeamAccess,
    requirePermission,
    registerUser,
    loginUser,
    getUserTeams,
    createTeam,
    inviteToTeam,
    getTeamMembers,
    logoutUser,
    updateTeam,
    removeTeamMember,
    updateTeamMemberRole,
    deleteTeam
}; 