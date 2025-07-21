const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Database service (will be passed from main server)
let dataService;
let useFileBasedAuth = false;

// Initialize with database service
function initialize(dbService) {
    dataService = dbService;
    
    // Verify dataService has required methods
    if (!dataService) {
        console.error('❌ No database service provided to auth middleware');
        console.log('🔄 Falling back to file-based authentication');
        useFileBasedAuth = true;
        initializeFileBasedAuth();
        return;
    }
    
    if (typeof dataService.query !== 'function') {
        console.error('❌ Database service does not have query method');
        console.log('Available methods:', Object.getOwnPropertyNames(dataService));
        
        // Try to create a fallback query method using direct PostgreSQL connection
        try {
            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL || `postgresql://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DATABASE}`
            });
            
            dataService.query = async function(queryString, values = []) {
                console.log('🔄 Using direct PostgreSQL connection for query');
                const result = await pool.query(queryString, values);
                return result;
            };
            
            console.log('✅ Added fallback query method to dataService');
        } catch (error) {
            console.error('❌ PostgreSQL fallback failed:', error.message);
            console.log('🔄 Falling back to file-based authentication');
            useFileBasedAuth = true;
            initializeFileBasedAuth();
            return;
        }
    }
    
    console.log('✅ Auth middleware initialized with database service');
}

function initializeFileBasedAuth() {
    const authFile = path.join(__dirname, 'data', 'auth.json');
    const authDir = path.dirname(authFile);
    
    // Ensure data directory exists
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
    }
    
    // Create auth file with admin user if it doesn't exist
    if (!fs.existsSync(authFile)) {
        const adminPasswordHash = bcrypt.hashSync('Jventura1234!', 10);
        
        const initialData = {
            users: [
                {
                    id: 1,
                    username: 'ventura',
                    email: 'ventura@adsyncmedia.com',
                    password_hash: adminPasswordHash,
                    first_name: 'Ventura',
                    last_name: 'Admin',
                    role: 'admin',
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ],
            teams: [
                {
                    id: 1,
                    name: 'Default Team',
                    description: 'Default team for all users',
                    owner_id: 1,
                    created_at: new Date().toISOString()
                }
            ],
            team_members: [
                {
                    team_id: 1,
                    user_id: 1,
                    role: 'owner',
                    permissions: ['read', 'write', 'delete', 'admin'],
                    joined_at: new Date().toISOString()
                }
            ],
            nextUserId: 2,
            nextTeamId: 2
        };
        
        fs.writeFileSync(authFile, JSON.stringify(initialData, null, 2));
        console.log('✅ File-based auth initialized with admin user');
    } else {
        console.log('✅ File-based auth loaded from existing data');
    }
}

function getFileBasedData() {
    const authFile = path.join(__dirname, 'data', 'auth.json');
    if (fs.existsSync(authFile)) {
        return JSON.parse(fs.readFileSync(authFile, 'utf8'));
    }
    return { users: [], teams: [], team_members: [], nextUserId: 1, nextTeamId: 1 };
}

function saveFileBasedData(data) {
    const authFile = path.join(__dirname, 'data', 'auth.json');
    fs.writeFileSync(authFile, JSON.stringify(data, null, 2));
}

// File-based authentication functions
async function loginUserFromFile(email, password) {
    const data = getFileBasedData();
    const user = data.users.find(u => u.email === email);
    
    if (!user) {
        throw new Error('Invalid credentials');
    }
    
    if (!user.is_active) {
        throw new Error('Account is disabled');
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
        throw new Error('Invalid credentials');
    }
    
    // Update last login
    user.last_login = new Date().toISOString();
    saveFileBasedData(data);
    
    // Generate JWT token
    const token = jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            role: user.role 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    );
    
    return {
        success: true,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
        },
        token
    };
}

async function registerUserFromFile(email, username, password, firstName, lastName) {
    const data = getFileBasedData();
    
    // Check if user already exists
    const existingUser = data.users.find(u => u.email === email || u.username === username);
    if (existingUser) {
        throw new Error('User already exists');
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
        id: data.nextUserId,
        username,
        email,
        password_hash,
        first_name: firstName,
        last_name: lastName,
        role: 'member',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    data.users.push(newUser);
    data.nextUserId++;
    
    // Add user to default team
    data.team_members.push({
        team_id: 1,
        user_id: newUser.id,
        role: 'member',
        permissions: ['read', 'write'],
        joined_at: new Date().toISOString()
    });
    
    saveFileBasedData(data);
    
    return {
        success: true,
        user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            firstName: newUser.first_name,
            lastName: newUser.last_name,
            role: newUser.role
        }
    };
}

async function getUserTeamsFromFile(userId) {
    const data = getFileBasedData();
    const userTeams = data.team_members
        .filter(tm => tm.user_id === userId)
        .map(tm => {
            const team = data.teams.find(t => t.id === tm.team_id);
            return {
                id: team.id,
                name: team.name,
                description: team.description,
                role: tm.role,
                permissions: tm.permissions
            };
        });
    
    return userTeams;
}

// Permission constants
const PERMISSIONS = {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    ADMIN: 'admin',
    INVITE: 'invite',
    VIEW_ANALYTICS: 'view_analytics',
    MANAGE_USERS: 'manage_users',
    MANAGE_TEAMS: 'manage_teams'
};

// Default permissions for each role
const ROLE_PERMISSIONS = {
    owner: ['read', 'write', 'delete', 'admin', 'invite', 'view_analytics', 'manage_users', 'manage_teams'],
    admin: ['read', 'write', 'delete', 'admin', 'invite', 'view_analytics', 'manage_users', 'manage_teams'],
    member: ['read', 'write', 'view_analytics'],
    viewer: ['read', 'view_analytics']
};

// Helper function to get user permissions
function getUserPermissions(user, teamRole = null) {
    const basePermissions = ROLE_PERMISSIONS[user.role] || [];
    
    if (teamRole) {
        const teamPermissions = ROLE_PERMISSIONS[teamRole] || [];
        return [...new Set([...basePermissions, ...teamPermissions])];
    }
    
    return basePermissions;
}

// Check if user has specific permission
function hasPermission(user, permission, teamRole = null) {
    const permissions = getUserPermissions(user, teamRole);
    return permissions.includes(permission);
}

// Validate team data access
async function validateTeamDataAccess(userId, teamId) {
    try {
        const result = await dataService.query(
            'SELECT tm.role, tm.permissions FROM team_members tm WHERE tm.user_id = $1 AND tm.team_id = $2 AND tm.is_active = true',
            [userId, teamId]
        );
        
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Team access validation error:', error);
        return null;
    }
}

// Team access middleware
function requireTeamAccess(req, res, next) {
    const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
    
    if (!teamId) {
        return res.status(400).json({
            success: false,
            message: 'Team ID is required'
        });
    }
    
    validateTeamDataAccess(req.user.id, teamId)
        .then(teamMember => {
            if (!teamMember) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this team'
                });
            }
            
            req.teamId = teamId;
            req.teamRole = teamMember.role;
            req.teamPermissions = JSON.parse(teamMember.permissions || '[]');
            next();
        })
        .catch(error => {
            console.error('Team access middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Server error checking team access'
            });
        });
}

// Team access with specific permissions
function requireTeamAccessWithPermissions(permissions) {
    return function(req, res, next) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
        
        if (!teamId) {
            return res.status(400).json({
                success: false,
                message: 'Team ID is required'
            });
        }
        
        validateTeamDataAccess(req.user.id, teamId)
            .then(teamMember => {
                if (!teamMember) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have access to this team'
                    });
                }
                
                const userPermissions = JSON.parse(teamMember.permissions || '[]');
                const hasRequiredPermissions = permissions.every(permission => 
                    userPermissions.includes(permission)
                );
                
                if (!hasRequiredPermissions) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have the required permissions for this action'
                    });
                }
                
                req.teamId = teamId;
                req.teamRole = teamMember.role;
                req.teamPermissions = userPermissions;
                next();
            })
            .catch(error => {
                console.error('Team access middleware error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Server error checking team access'
                });
            });
    };
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

// Permission-based middleware
function requirePermission(permission) {
    return function(req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        
        const userHasPermission = hasPermission(req.user, permission, req.teamRole);
        
        if (!userHasPermission) {
            return res.status(403).json({
                success: false,
                message: `You do not have the required permission: ${permission}`
            });
        }
        
        next();
    };
}

// Check team permission
async function checkTeamPermission(userId, teamId, permission) {
    try {
        const result = await dataService.query(
            'SELECT tm.role, tm.permissions FROM team_members tm WHERE tm.user_id = $1 AND tm.team_id = $2 AND tm.is_active = true',
            [userId, teamId]
        );
        
        if (result.rows.length === 0) {
            return false;
        }
        
        const teamMember = result.rows[0];
        const permissions = JSON.parse(teamMember.permissions || '[]');
        
        return permissions.includes(permission);
    } catch (error) {
        console.error('Check team permission error:', error);
        return false;
    }
}

// User registration
async function registerUser(userData) {
    const { username, email, password, firstName, lastName, role = 'member' } = userData;
    
    try {
        // Use file-based authentication if database is not available
        if (useFileBasedAuth) {
            return registerUserFromFile(email, username, password, firstName, lastName);
        }
        
        // Check if user already exists
        const existingUser = await dataService.query(
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
        const result = await dataService.query(
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
        // Use file-based authentication if database is not available
        if (useFileBasedAuth) {
            return loginUserFromFile(email, password);
        }
        
        // Find user
        const result = await dataService.query(
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
        await dataService.query(
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
        await dataService.query(
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
        // Use file-based authentication if database is not available
        if (useFileBasedAuth) {
            return getUserTeamsFromFile(userId);
        }
        const result = await dataService.query(
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
        const teamResult = await dataService.query(
            'INSERT INTO teams (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
            [name, description, ownerId]
        );
        
        const team = teamResult.rows[0];
        
        // Add owner as admin member
        await dataService.query(
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
        const userResult = await dataService.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );
        
        if (userResult.rows.length === 0) {
            throw new Error('User not found');
        }
        
        const userId = userResult.rows[0].id;
        
        // Check if user is already a member
        const memberResult = await dataService.query(
            'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
            [teamId, userId]
        );
        
        if (memberResult.rows.length > 0) {
            throw new Error('User is already a member of this team');
        }
        
        // Add user to team
        const permissions = role === 'admin' ? ['read', 'write', 'admin', 'invite'] : ['read', 'write'];
        
        await dataService.query(
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
        const result = await dataService.query(
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
        await dataService.query(
            'UPDATE user_sessions SET is_active = false WHERE session_token = $1',
            [sessionToken]
        );
        
        return { success: true, message: 'Logged out successfully' };
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

// Update team
async function updateTeam(teamId, teamData) {
    const { name, description } = teamData;
    
    try {
        const result = await dataService.query(
            'UPDATE teams SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
            [name, description, teamId]
        );
        
        return result.rows[0];
    } catch (error) {
        console.error('Update team error:', error);
        throw error;
    }
}

// Remove team member
async function removeTeamMember(teamId, userId) {
    try {
        const result = await dataService.query(
            'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
            [teamId, userId]
        );
        
        return { success: true, message: 'Team member removed successfully' };
    } catch (error) {
        console.error('Remove team member error:', error);
        throw error;
    }
}

// Update team member role
async function updateTeamMemberRole(teamId, userId, role) {
    try {
        const permissions = role === 'admin' ? ['read', 'write', 'admin', 'invite'] : ['read', 'write'];
        
        const result = await dataService.query(
            'UPDATE team_members SET role = $1, permissions = $2 WHERE team_id = $3 AND user_id = $4',
            [role, JSON.stringify(permissions), teamId, userId]
        );
        
        return { success: true, message: 'Team member role updated successfully' };
    } catch (error) {
        console.error('Update team member role error:', error);
        throw error;
    }
}

// Delete team
async function deleteTeam(teamId, ownerId) {
    try {
        const result = await dataService.query(
            'DELETE FROM teams WHERE id = $1 AND owner_id = $2',
            [teamId, ownerId]
        );
        
        if (result.rowCount === 0) {
            throw new Error('Team not found or you are not the owner');
        }
        
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
    requireTeamAccessWithPermissions,
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
    deleteTeam,
    checkTeamPermission,
    // Enhanced permission functions
    PERMISSIONS,
    ROLE_PERMISSIONS,
    getUserPermissions,
    hasPermission,
    validateTeamDataAccess
}; 