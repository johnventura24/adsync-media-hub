const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const multer = require('multer');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
// Optional modules - load only if available
let dataService, tableauAutoExtractor, dailyDataTracker;

try {
    dataService = require('./data-service');
    console.log('✅ Data service loaded');
} catch (error) {
    console.warn('⚠️ Data service not available:', error.message);
    // Create minimal data service with basic functions
    dataService = {
        initialize: async () => Promise.resolve(),
        getAllDashboardData: async () => Promise.resolve({}),
        query: async () => Promise.resolve({ rowCount: 0 }),
        saveLeadershipToDatabase: async () => Promise.resolve({})
    };
}

try {
    tableauAutoExtractor = require('./tableau-auto-extractor');
    console.log('✅ Tableau auto extractor loaded');
} catch (error) {
    console.warn('⚠️ Tableau auto extractor not available:', error.message);
    tableauAutoExtractor = null;
}

try {
    dailyDataTracker = require('./daily-data-tracker');
    console.log('✅ Daily data tracker loaded');
} catch (error) {
    console.warn('⚠️ Daily data tracker not available:', error.message);
    dailyDataTracker = null;
}
// Optional leadership backup system - load only if available
let leadershipBackup;
try {
    leadershipBackup = require('./leadership-backup-system');
    console.log('✅ Leadership backup system loaded');
} catch (error) {
    console.warn('⚠️ Leadership backup system not available:', error.message);
    leadershipBackup = null;
}
require('dotenv').config();

// Authentication imports
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { router: authRoutes, initialize: initializeAuth } = require('./auth-routes');
const authMiddleware = require('./auth-middleware');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Session configuration
app.use(session({
    store: new pgSession({
        conString: process.env.DATABASE_URL || 'postgresql://localhost:5432/dashboard',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('📁 Created uploads directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// File filter to only allow PDF and Excel files
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, Excel (.xlsx, .xls), and CSV files are allowed'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Serve static files with error handling
// Check if public directory exists, if not serve from root
const publicPath = path.join(__dirname, 'public');
const rootPath = __dirname;
console.log('Checking for public directory at:', publicPath);
console.log('Root directory path:', rootPath);

if (fs.existsSync(publicPath)) {
  console.log('Using public directory for static files');
  // Configure static files to exclude admin.html from automatic serving
  app.use(express.static(publicPath, {
    index: false,  // Don't serve directory indexes
    setHeaders: (res, path) => {
      // Don't cache admin.html
      if (path.endsWith('admin.html')) {
        res.set('Cache-Control', 'no-cache');
      }
    }
  }));
} else {
  console.log('Public directory not found, serving static files from root directory');
  // Serve specific static files from root, excluding server files
  app.use('/dashboard.js', express.static(path.join(__dirname, 'dashboard.js')));
  app.use('/styles.css', express.static(path.join(__dirname, 'styles.css')));
}

// Initialize dashboard data (will be replaced with live data)
let dashboardData = {};

// Default dashboard data for when database connections fail
function getDefaultDashboardData() {
    return {
        goals: {
            quarterly: {
                target: 1000000,
                current: 750000,
                progress: 75
            },
            monthly: {
                target: 333333,
                current: 280000,
                progress: 84
            }
        },
        revenueFunnel: {
            leads: 150,
            prospects: 75,
            qualified: 45,
            proposals: 20,
            closed: 8,
            revenue: 125000
        },
        vto: {
            available: 20,
            used: 12,
            pending: 2,
            remaining: 6
        },
        issues: {
            critical: 0,
            high: 2,
            medium: 8,
            low: 15
        },
        scorecard: {
            customerSatisfaction: 92,
            teamEfficiency: 88,
            qualityScore: 95,
            deliveryTime: 85
        },
        knowledgeBase: [
            { title: "Company Handbook", url: "#", category: "HR" },
            { title: "Technical Documentation", url: "#", category: "Tech" },
            { title: "Sales Process", url: "#", category: "Sales" }
        ],
        leadershipTeam: {
            leaders: []
        },
        ninetyData: {
            todos: [],
            rocks: [],
            issues: [],
            data: []
        }
    };
}

// Initialize data service and fetch initial data
async function initializeApp() {
  console.log('🚀 Initializing Adsync Media Hub with data repository connections...');
  
  try {
    // Initialize data service connections - make database connections optional
    try {
      await dataService.initialize();
      console.log('✅ Database connections initialized');
    } catch (error) {
      console.warn('⚠️ Database connections failed, using file-based storage:', error.message);
      // Continue without database connections - use file-based storage
    }
    
    // Fetch initial dashboard data from repositories or files
    try {
      dashboardData = await dataService.getAllDashboardData();
      console.log('✅ Initial dashboard data loaded from repositories');
    } catch (error) {
      console.warn('⚠️ Repository data loading failed, using default data:', error.message);
      // Use default dashboard data if repository fails
      dashboardData = getDefaultDashboardData();
    }
    
    // Initialize authentication system
    await initializeAuthentication();
    
    // Start the server after data is loaded
    server.listen(PORT, () => {
      console.log(`🚀 Adsync Media Hub server running on port ${PORT}`);
      console.log(`📊 Dashboard available at: http://localhost:${PORT}`);
      console.log(`⚙️ Admin interface at: http://localhost:${PORT}/admin`);
      console.log(`🔄 Data refresh interval: ${process.env.DATA_REFRESH_INTERVAL || '*/15 * * * *'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize app:', error);
    // Start server anyway with minimal functionality
    server.listen(PORT, () => {
      console.log(`🚀 Adsync Media Hub server running on port ${PORT} (minimal mode)`);
    });
  }
}

// Serve main dashboard
app.get('/', (req, res) => {
    if (fs.existsSync(path.join(__dirname, 'public', 'index.html'))) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// Serve admin panel
app.get('/admin', (req, res) => {
    res.redirect('/admin.html');
});

app.get('/admin.html', (req, res) => {
    if (fs.existsSync(path.join(__dirname, 'public', 'admin.html'))) {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.status(404).json({ error: 'Admin panel not found' });
    }
});

// Admin interface route (protected)
app.get('/admin-interface', authMiddleware.requireAuth, (req, res) => {
    // Only allow admin and owner roles
    if (req.user.role !== 'admin' && req.user.role !== 'owner') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    
    if (fs.existsSync(path.join(__dirname, 'public', 'admin.html'))) {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.status(404).json({ error: 'Admin panel not found' });
    }
});

// Dashboard data endpoint
app.get('/api/dashboard', 
    authMiddleware.requireAuth, 
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.VIEW_ANALYTICS),
    (req, res) => {
        // Filter dashboard data by team if not an admin
        if (req.user.role !== 'admin' && req.teamId) {
            // In production, this would filter data by team
            // For now, return filtered dashboard data
            const filteredData = {
                ...dashboardData,
                teamId: req.teamId,
                userId: req.user.id
            };
            res.json(filteredData);
        } else {
            res.json(dashboardData);
        }
    }
);

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

// Initialize authentication middleware with database connection
async function initializeAuthentication() {
    try {
        if (dataService && dataService.initialize) {
            await dataService.initialize();
            
            // Set up database connection for authentication routes
            app.locals.db = dataService;
            
            // Initialize authentication with proper database connection
            initializeAuth(dataService);
            authMiddleware.initialize(dataService);
            
            console.log('✅ Authentication system initialized');
        } else {
            console.warn('⚠️ Authentication system not initialized - database service not available');
        }
    } catch (error) {
        console.error('❌ Authentication initialization error:', error);
    }
}

// Authentication routes
app.use('/api/auth', authRoutes);

// ============================================================================
// ADMIN ROUTES - USER MANAGEMENT
// ============================================================================

// Admin middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

// Get all users (Admin only)
app.get('/api/admin/users', 
    authMiddleware.requireAuth, 
    requireAdmin,
    async (req, res) => {
        try {
            const result = await dataService.query(`
                SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, 
                       u.is_active, u.created_at, u.last_login,
                       COUNT(tm.id) as team_count
                FROM users u
                LEFT JOIN team_members tm ON u.id = tm.user_id
                GROUP BY u.id, u.username, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at, u.last_login
                ORDER BY u.created_at DESC
            `);
            
            res.json({
                success: true,
                users: result.rows.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    isActive: user.is_active,
                    createdAt: user.created_at,
                    lastLogin: user.last_login,
                    teamCount: parseInt(user.team_count)
                }))
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve users'
            });
        }
    }
);

// Get user details (Admin only)
app.get('/api/admin/users/:userId', 
    authMiddleware.requireAuth, 
    requireAdmin,
    async (req, res) => {
        try {
            const userId = req.params.userId;
            
            // Get user details
            const userResult = await dataService.query(`
                SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.role, 
                       u.is_active, u.created_at, u.last_login, u.preferences
                FROM users u
                WHERE u.id = $1
            `, [userId]);
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const user = userResult.rows[0];
            
            // Get user's teams
            const teamsResult = await dataService.query(`
                SELECT t.id, t.name, t.description, tm.role, tm.joined_at
                FROM teams t
                JOIN team_members tm ON t.id = tm.team_id
                WHERE tm.user_id = $1
                ORDER BY tm.joined_at DESC
            `, [userId]);
            
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    isActive: user.is_active,
                    createdAt: user.created_at,
                    lastLogin: user.last_login,
                    preferences: user.preferences ? JSON.parse(user.preferences) : {},
                    teams: teamsResult.rows.map(team => ({
                        id: team.id,
                        name: team.name,
                        description: team.description,
                        role: team.role,
                        joinedAt: team.joined_at
                    }))
                }
            });
        } catch (error) {
            console.error('Get user details error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve user details'
            });
        }
    }
);

// Update user role and status (Admin only)
app.put('/api/admin/users/:userId', 
    authMiddleware.requireAuth, 
    requireAdmin,
    async (req, res) => {
        try {
            const userId = req.params.userId;
            const { role, isActive } = req.body;
            
            // Validate role
            if (role && !['admin', 'owner', 'member'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role specified'
                });
            }
            
            // Update user
            const result = await dataService.query(`
                UPDATE users 
                SET role = COALESCE($1, role), 
                    is_active = COALESCE($2, is_active),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 
                RETURNING id, username, email, first_name, last_name, role, is_active
            `, [role, isActive, userId]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const user = result.rows[0];
            
            res.json({
                success: true,
                message: 'User updated successfully',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    role: user.role,
                    isActive: user.is_active
                }
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update user'
            });
        }
    }
);

// Reset user password (Admin only)
app.post('/api/admin/users/:userId/reset-password', 
    authMiddleware.requireAuth, 
    requireAdmin,
    async (req, res) => {
        try {
            const userId = req.params.userId;
            const { newPassword } = req.body;
            
            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters long'
                });
            }
            
            // Hash the new password
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);
            
            // Update user password
            const result = await dataService.query(`
                UPDATE users 
                SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 
                RETURNING id, username, email
            `, [passwordHash, userId]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            res.json({
                success: true,
                message: 'Password reset successfully'
            });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to reset password'
            });
        }
    }
);

// Delete user (Admin only)
app.delete('/api/admin/users/:userId', 
    authMiddleware.requireAuth, 
    requireAdmin,
    async (req, res) => {
        try {
            const userId = req.params.userId;
            
            // Check if user exists
            const userCheck = await dataService.query('SELECT id FROM users WHERE id = $1', [userId]);
            if (userCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Delete user (this will cascade to team_members, user_sessions, etc.)
            await dataService.query('DELETE FROM users WHERE id = $1', [userId]);
            
            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete user'
            });
        }
    }
);

// Get all teams (Admin only)
app.get('/api/admin/teams', 
    authMiddleware.requireAuth, 
    requireAdmin,
    async (req, res) => {
        try {
            const result = await dataService.query(`
                SELECT t.id, t.name, t.description, t.owner_id, t.is_active, t.created_at,
                       u.username as owner_username, u.email as owner_email,
                       COUNT(tm.id) as member_count
                FROM teams t
                LEFT JOIN users u ON t.owner_id = u.id
                LEFT JOIN team_members tm ON t.id = tm.team_id
                GROUP BY t.id, t.name, t.description, t.owner_id, t.is_active, t.created_at, u.username, u.email
                ORDER BY t.created_at DESC
            `);
            
            res.json({
                success: true,
                teams: result.rows.map(team => ({
                    id: team.id,
                    name: team.name,
                    description: team.description,
                    ownerId: team.owner_id,
                    ownerUsername: team.owner_username,
                    ownerEmail: team.owner_email,
                    isActive: team.is_active,
                    createdAt: team.created_at,
                    memberCount: parseInt(team.member_count)
                }))
            });
        } catch (error) {
            console.error('Get teams error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve teams'
            });
        }
    }
);

// ============================================================================
// EXISTING API ROUTES - NOW SECURED WITH AUTHENTICATION AND TEAM FILTERING
// ============================================================================

app.get('/api/dashboard', 
    authMiddleware.requireAuth, 
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.VIEW_ANALYTICS),
    (req, res) => {
        // Filter dashboard data by team if not an admin
        if (req.user.role !== 'admin' && req.teamId) {
            // In production, this would filter data by team
            // For now, return filtered dashboard data
            const filteredData = {
                ...dashboardData,
                teamId: req.teamId,
                userId: req.user.id
            };
            res.json(filteredData);
        } else {
            res.json(dashboardData);
        }
    });

// ENHANCED: Get available dates for dropdown (now includes Tableau dates)
app.get('/api/available-dates', 
    authMiddleware.requireAuth, 
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.VIEW_ANALYTICS),
    async (req, res) => {
  try {
    console.log('📅 Fetching available dates from all sources...');
    const allDates = new Set();
    
    // First, get dates from local history
    let history = { google: [], facebook: [] };
    if (dailyDataTracker) {
        history = await dailyDataTracker.getDailyHistory(30);
    } else {
        console.log('⚠️ Daily data tracker not available for date fetching');
    }
    if (history.google && history.google.length > 0) {
      history.google.forEach(day => {
        if (day.date) {
          allDates.add(day.date);
        }
      });
    }
    
    // Then, try to get available dates from Tableau
    try {
      if (tableauAutoExtractor) {
        console.log('🔍 Fetching dates from Tableau dashboard...');
        const tableauDates = await tableauAutoExtractor.getAvailableDates();
        
        if (tableauDates && tableauDates.length > 0) {
          tableauDates.forEach(date => allDates.add(date));
          console.log(`✅ Found ${tableauDates.length} dates in Tableau dashboard`);
        } else {
          console.log('⚠️ No dates found in Tableau dashboard');
        }
      } else {
        console.log('⚠️ Tableau auto extractor not available');
      }
    } catch (tableauError) {
      console.log('❌ Error fetching dates from Tableau:', tableauError.message);
    }
    
    // Convert to array and sort in descending order (newest first)
    const dates = Array.from(allDates).sort((a, b) => new Date(b) - new Date(a));
    
    console.log(`📋 Total available dates: ${dates.length} (from local history + Tableau)`);
    
    res.json({ 
      success: true, 
      dates: dates,
      totalDays: dates.length,
      sources: {
        local: history.google ? history.google.length : 0,
        tableau: dates.length - (history.google ? history.google.length : 0)
      }
    });
  } catch (error) {
    console.error('Error fetching available dates:', error);
    res.json({ 
      success: false, 
      dates: [],
      error: 'Could not load available dates' 
    });
  }
});

// ENHANCED: Get data for specific date (now fetches from Tableau if not locally available)
app.get('/api/daily-data/:date', 
    authMiddleware.requireAuth, 
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.VIEW_ANALYTICS),
    async (req, res) => {
  try {
    const date = req.params.date;
    console.log(`📅 API request for date: ${date}`);
    
    // First, check if we have local data for this date
    let history = { google: [], facebook: [] };
    if (dailyDataTracker) {
        history = await dailyDataTracker.getDailyHistory(30);
    } else {
        console.log('⚠️ Daily data tracker not available');
    }
    let dayData = null;
    
    if (history.google && history.google.length > 0) {
      const googleDay = history.google.find(day => day.date === date);
      const facebookDay = history.facebook ? history.facebook.find(day => day.date === date) : null;
      const comparisonDay = history.comparison ? history.comparison.find(day => day.date === date) : null;
      
      if (googleDay) {
        dayData = {
          date: date,
          google: {
            daily: googleDay,
            labels: {
              status: googleDay.performance?.profitability === 'profitable' ? 'Profitable' : 'Needs Optimization',
              recommendation: googleDay.performance?.efficiency === 'efficient' ? 'Performing Well' : 'Optimize Campaigns'
            }
          },
          facebook: facebookDay ? {
            daily: facebookDay,
            labels: {
              status: facebookDay.performance?.profitability === 'profitable' ? 'Profitable' : 'Needs Optimization',
              recommendation: facebookDay.performance?.efficiency === 'efficient' ? 'Performing Well' : 'Optimize Campaigns'
            }
          } : null,
          comparison: comparisonDay || null
        };
        
        console.log(`✅ Found local data for ${date}`);
      }
    }
    
    // If no local data found, try to fetch from Tableau
    if (!dayData) {
      console.log(`🔍 No local data for ${date}, trying to fetch from Tableau...`);
      
      try {
        if (tableauAutoExtractor) {
          const tableauData = await tableauAutoExtractor.extractDataForDate(date);
          
          if (tableauData) {
            dayData = tableauData;
            console.log(`✅ Successfully fetched Tableau data for ${date}`);
          } else {
            console.log(`⚠️ No Tableau data found for ${date}`);
          }
        } else {
          console.log(`⚠️ Tableau auto extractor not available for ${date}`);
        }
      } catch (tableauError) {
        console.log(`❌ Error fetching from Tableau for ${date}:`, tableauError.message);
      }
    }
    
    if (dayData) {
      res.json({ 
        success: true, 
        data: dayData,
        source: dayData.date ? 'tableau' : 'local'
      });
    } else {
      res.json({ 
        success: false, 
        message: `No data available for ${date}. Please check your Tableau dashboard or try a different date.`,
        requestedDate: date
      });
    }
  } catch (error) {
    console.error('Error fetching daily data:', error);
    res.json({ 
      success: false, 
      error: 'Could not load data for selected date',
      details: error.message
    });
  }
});

// NEW: Get data for date range
app.get('/api/date-range/:startDate/:endDate', async (req, res) => {
  try {
    const startDate = req.params.startDate;
    const endDate = req.params.endDate;
    let history = { google: [], facebook: [] };
    if (dailyDataTracker) {
        history = await dailyDataTracker.getDailyHistory(60); // Get more days for range queries
    } else {
        console.log('⚠️ Daily data tracker not available for range queries');
    }
    
    // Filter data for the date range
    const rangeData = {
      startDate,
      endDate,
      google: [],
      facebook: [],
      comparison: [],
      totals: {
        revenue: 0,
        profit: 0,
        adSpend: 0,
        impressions: 0,
        clicks: 0
      }
    };
    
    if (history.google && history.google.length > 0) {
      // Filter Google data for the date range
      rangeData.google = history.google.filter(day => {
        const dayDate = new Date(day.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return dayDate >= start && dayDate <= end;
      });
      
      // Filter Facebook data for the date range
      if (history.facebook) {
        rangeData.facebook = history.facebook.filter(day => {
          const dayDate = new Date(day.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return dayDate >= start && dayDate <= end;
        });
      }
      
      // Filter comparison data for the date range
      if (history.comparison) {
        rangeData.comparison = history.comparison.filter(day => {
          const dayDate = new Date(day.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return dayDate >= start && dayDate <= end;
        });
      }
      
      // Calculate totals for the range
      rangeData.google.forEach(day => {
        rangeData.totals.revenue += day.revenue || 0;
        rangeData.totals.profit += day.grossProfit || 0;
        rangeData.totals.adSpend += day.adSpend || 0;
        rangeData.totals.impressions += day.impressions || 0;
        rangeData.totals.clicks += day.clicks || 0;
      });
      
      rangeData.facebook.forEach(day => {
        rangeData.totals.revenue += day.revenue || 0;
        rangeData.totals.profit += day.grossProfit || 0;
        rangeData.totals.adSpend += day.adSpend || 0;
        rangeData.totals.impressions += day.impressions || 0;
        rangeData.totals.clicks += day.clicks || 0;
      });
      
      // Calculate averages
      const totalDays = rangeData.google.length + rangeData.facebook.length;
      if (totalDays > 0) {
        rangeData.averages = {
          dailyRevenue: rangeData.totals.revenue / totalDays,
          dailyProfit: rangeData.totals.profit / totalDays,
          dailyAdSpend: rangeData.totals.adSpend / totalDays,
          averageROAS: rangeData.totals.adSpend > 0 ? rangeData.totals.revenue / rangeData.totals.adSpend : 0
        };
      }
    }
    
    res.json({ 
      success: true, 
      data: rangeData,
      daysInRange: rangeData.google.length + rangeData.facebook.length
    });
  } catch (error) {
    console.error('Error fetching date range data:', error);
    res.json({ 
      success: false, 
      error: 'Could not load data for selected date range' 
    });
  }
});

// NEW: Get summary data for all days
app.get('/api/summary-data', async (req, res) => {
  try {
    let history = { google: [], facebook: [] };
    let trends = { revenue: { direction: 'neutral', percentage: 0 }, roas: { direction: 'neutral', percentage: 0 }, profit: { direction: 'neutral', percentage: 0 } };
    
    if (dailyDataTracker) {
        history = await dailyDataTracker.getDailyHistory(30);
        trends = await dailyDataTracker.getPlatformTrends(7); // 7-day trends
    } else {
        console.log('⚠️ Daily data tracker not available for summary data');
    }
    
    if (!history.google || history.google.length === 0) {
      return res.json({ 
        success: false, 
        message: 'No historical data available for summary' 
      });
    }
    
    // Calculate totals and averages
    const googleTotals = {
      totalImpressions: 0,
      totalRevenue: 0,
      totalProfit: 0,
      totalAdSpend: 0,
      totalROAS: 0,
      daysCount: 0
    };
    
    const facebookTotals = {
      totalImpressions: 0,
      totalRevenue: 0,
      totalProfit: 0,
      totalAdSpend: 0,
      totalROAS: 0,
      daysCount: 0
    };
    
    // Calculate Google totals
    history.google.forEach(day => {
      googleTotals.totalImpressions += day.impressions || 0;
      googleTotals.totalRevenue += day.revenue || 0;
      googleTotals.totalProfit += day.grossProfit || 0;
      googleTotals.totalAdSpend += day.adSpend || 0;
      googleTotals.totalROAS += day.roas || 0;
      googleTotals.daysCount++;
    });
    
    // Calculate Facebook totals
    if (history.facebook && history.facebook.length > 0) {
      history.facebook.forEach(day => {
        facebookTotals.totalImpressions += day.impressions || 0;
        facebookTotals.totalRevenue += day.revenue || 0;
        facebookTotals.totalProfit += day.grossProfit || 0;
        facebookTotals.totalAdSpend += day.adSpend || 0;
        facebookTotals.totalROAS += day.roas || 0;
        facebookTotals.daysCount++;
      });
    }
    
    // Prepare summary data
    const summaryData = {
      totalDays: history.totalDays || history.google.length,
      totals: {
        revenue: googleTotals.totalRevenue + facebookTotals.totalRevenue,
        profit: googleTotals.totalProfit + facebookTotals.totalProfit,
        adSpend: googleTotals.totalAdSpend + facebookTotals.totalAdSpend,
        averageROAS: googleTotals.daysCount > 0 ? 
          ((googleTotals.totalROAS / googleTotals.daysCount) + 
           (facebookTotals.daysCount > 0 ? (facebookTotals.totalROAS / facebookTotals.daysCount) : 0)) / 
          (facebookTotals.daysCount > 0 ? 2 : 1) : 0
      },
      google: {
        totalImpressions: googleTotals.totalImpressions,
        totalRevenue: googleTotals.totalRevenue,
        totalProfit: googleTotals.totalProfit,
        averageROAS: googleTotals.daysCount > 0 ? googleTotals.totalROAS / googleTotals.daysCount : 0
      },
      facebook: {
        totalImpressions: facebookTotals.totalImpressions,
        totalRevenue: facebookTotals.totalRevenue,
        totalProfit: facebookTotals.totalProfit,
        averageROAS: facebookTotals.daysCount > 0 ? facebookTotals.totalROAS / facebookTotals.daysCount : 0
      },
      dailyHistory: history.comparison ? history.comparison.map((day, index) => ({
        date: day.date,
        google: history.google[index] || {},
        facebook: history.facebook && history.facebook[index] ? history.facebook[index] : {},
        comparison: day
      })) : [],
      trends: {
        revenue: trends.revenue || { direction: 'neutral', percentage: 0 },
        roas: trends.roas || { direction: 'neutral', percentage: 0 },
        profit: trends.profit || { direction: 'neutral', percentage: 0 }
      }
    };
    
    res.json({ 
      success: true, 
      data: summaryData 
    });
  } catch (error) {
    console.error('Error fetching summary data:', error);
    res.json({ 
      success: false, 
      error: 'Could not load summary data' 
    });
  }
});

// Manual data refresh endpoint
app.post('/api/refresh', async (req, res) => {
  console.log('🔄 Manual data refresh requested...');
  
  try {
    // Fetch fresh data from all repositories
    const freshData = await dataService.getAllDashboardData();
    
    // Update the dashboard data
    const previousData = JSON.stringify(dashboardData);
    dashboardData = freshData;
    
    // Check if data actually changed
    const newData = JSON.stringify(dashboardData);
    const dataChanged = previousData !== newData;
    
    if (dataChanged) {
      console.log('✅ Manual refresh completed - changes detected');
      // Broadcast updates to all connected clients
      io.emit('dashboardUpdate', { section: 'all', data: dashboardData });
    } else {
      console.log('📋 Manual refresh completed - no changes detected');
    }
    
    res.json({
      success: true,
      message: 'Dashboard data refreshed successfully',
      dataChanged,
      lastUpdated: dashboardData.lastUpdated
    });
    
  } catch (error) {
    console.error('❌ Manual refresh failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh dashboard data',
      error: error.message
    });
  }
});

// Data source status endpoint
app.get('/api/status', (req, res) => {
  const status = {
    server: 'running',
    dataService: 'initialized',
    connections: {
      postgres: !!dataService.connections?.postgres,
      mysql: !!dataService.connections?.mysql,
      mongodb: !!dataService.connections?.mongodb
    },
    config: {
      refreshInterval: process.env.DATA_REFRESH_INTERVAL || '*/15 * * * *',
      autoRefreshEnabled: process.env.ENABLE_AUTO_REFRESH !== 'false',
      apiEndpoints: {
        funnelData: !!process.env.FUNNEL_API_URL,
        goalsData: !!process.env.GOALS_API_URL,
        vtoData: !!process.env.VTO_API_URL,
        issuesData: !!process.env.ISSUES_API_URL,
        scorecardData: !!process.env.SCORECARD_API_URL
      }
    },
    lastUpdated: dashboardData.lastUpdated
  };
  
  res.json(status);
});

app.post('/api/update', (req, res) => {
  const { section, data } = req.body;
  if (dashboardData[section]) {
    dashboardData[section] = { ...dashboardData[section], ...data };
    dashboardData.lastUpdated = new Date().toISOString();
    
    // Broadcast update to all connected clients
    io.emit('dashboardUpdate', { section, data: dashboardData[section] });
    
    res.json({ success: true, message: 'Dashboard updated successfully' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid section' });
  }
});

// New endpoint to add data to sections
app.post('/api/section/add-data', (req, res) => {
  const { sectionType, sectionKey, title, content, url } = req.body;
  
  // Validate required fields
  if (!sectionType || !sectionKey || !title || !content) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: sectionType, sectionKey, title, content' 
    });
  }

  // Check if section exists
  if (!dashboardData[sectionType] || !dashboardData[sectionType][sectionKey]) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid section type or key' 
    });
  }

  // Create new data entry
  const newEntry = {
    id: Date.now().toString(), // Simple ID generation
    title,
    content,
    url: url || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Add to the section
  dashboardData[sectionType][sectionKey].data.push(newEntry);
  dashboardData.lastUpdated = new Date().toISOString();

  // Broadcast update to all connected clients
  io.emit('sectionDataUpdate', {
    sectionType,
    sectionKey,
    data: dashboardData[sectionType][sectionKey].data,
    newEntry
  });

  res.json({
    success: true,
    message: 'Data added successfully',
    entry: newEntry
  });
});

// Endpoint to get data for a specific section
app.get('/api/section/:sectionType/:sectionKey', 
    authMiddleware.requireAuth, 
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.READ),
    (req, res) => {
  const { sectionType, sectionKey } = req.params;
  
  if (!dashboardData[sectionType] || !dashboardData[sectionType][sectionKey]) {
    return res.status(404).json({ 
      success: false, 
      message: 'Section not found' 
    });
  }

  res.json({
    success: true,
    section: dashboardData[sectionType][sectionKey]
  });
});

// Bulk update leadership team (for manual data management - replaces Ninety.io)
app.put('/api/leadership-team/bulk-update', async (req, res) => {
    try {
        const { leaders } = req.body;
        
        if (!leaders || !Array.isArray(leaders)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid leaders data provided'
            });
        }
        
        console.log(`📝 Bulk updating ${leaders.length} leadership members`);
        
        const results = [];
        const errors = [];
        
        for (const leader of leaders) {
            try {
                // Add metadata
                leader.lastUpdated = new Date().toISOString();
                leader.updatedBy = 'bulk_update';
                
                if (leader.id) {
                    // Update existing
                    const result = await dataService.saveLeadershipToDatabase(leader);
                    results.push(result);
                } else {
                    // Create new
                    leader.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                    const result = await dataService.saveLeadershipToDatabase(leader);
                    results.push(result);
                }
            } catch (error) {
                errors.push({ id: leader.id || 'unknown', error: error.message });
            }
        }
        
        // Broadcast update to all connected clients
        io.emit('dashboardUpdate', {
            section: 'leadershipTeam',
            data: await dataService.getLeadershipTeamData()
        });
        
        res.json({
            success: true,
            message: `Bulk update completed. ${results.length} successful, ${errors.length} errors`,
            results: results,
            errors: errors
        });
        
    } catch (error) {
        console.error('❌ Error in bulk update:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to bulk update leadership team',
            error: error.message
        });
    }
});

// ============================================================================
// LEADERSHIP BACKUP AND RESTORE ENDPOINTS
// ============================================================================

// Create manual backup
app.post('/api/leadership-backup', async (req, res) => {
    try {
        if (!leadershipBackup) {
            return res.status(503).json({
                success: false,
                message: 'Leadership backup system not available'
            });
        }
        
        console.log('💾 Creating manual leadership backup...');
        
        const result = await leadershipBackup.createBackup('manual');
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Leadership backup created successfully',
                backup: result
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to create backup',
                error: result.error
            });
        }
    } catch (error) {
        console.error('❌ Error creating backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create backup',
            error: error.message
        });
    }
});

// List all backups
app.get('/api/leadership-backups', (req, res) => {
    try {
        if (!leadershipBackup) {
            return res.status(503).json({
                success: false,
                message: 'Leadership backup system not available'
            });
        }
        
        const result = leadershipBackup.listBackups();
        
        res.json({
            success: result.success,
            backups: result.backups,
            error: result.error
        });
    } catch (error) {
        console.error('❌ Error listing backups:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list backups',
            error: error.message
        });
    }
});

// Restore from backup
app.post('/api/leadership-restore/:filename', async (req, res) => {
    try {
        if (!leadershipBackup) {
            return res.status(503).json({
                success: false,
                message: 'Leadership backup system not available'
            });
        }
        
        const filename = req.params.filename;
        console.log(`🔄 Restoring leadership data from backup: ${filename}`);
        
        const result = await leadershipBackup.restoreFromBackup(filename);
        
        if (result.success) {
            // Broadcast update to all connected clients
            io.emit('dashboardUpdate', {
                section: 'leadershipTeam',
                data: await dataService.getLeadershipTeamData(),
                action: 'restore',
                source: 'backup_restore'
            });
            
            res.json({
                success: true,
                message: `Successfully restored ${result.restored} leaders from backup`,
                result: result
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to restore from backup',
                error: result.error
            });
        }
    } catch (error) {
        console.error('❌ Error restoring from backup:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to restore from backup',
            error: error.message
        });
    }
});

// Export leadership data to Excel
app.get('/api/leadership-export', async (req, res) => {
    try {
        if (!leadershipBackup) {
            return res.status(503).json({
                success: false,
                message: 'Leadership backup system not available'
            });
        }
        
        console.log('📊 Exporting leadership data to Excel...');
        
        const result = await leadershipBackup.exportToExcel();
        
        if (result.success) {
            // Send file as download
            res.download(result.path, result.filename, (err) => {
                if (err) {
                    console.error('❌ Error downloading file:', err);
                    res.status(500).json({
                        success: false,
                        message: 'Failed to download export file'
                    });
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to export data',
                error: result.error
            });
        }
    } catch (error) {
        console.error('❌ Error exporting data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export data',
            error: error.message
        });
    }
});

// ============================================================================
// FILE UPLOAD AND DATA PROCESSING ENDPOINTS
// ============================================================================

// Upload and process data files (PDF, Excel, CSV)
app.post('/api/upload-data', 
    authMiddleware.requireAuth, 
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.WRITE),
    upload.single('dataFile'), 
    async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        console.log(`📁 Processing uploaded file: ${req.file.originalname}`);
        
        const filePath = req.file.path;
        const fileType = req.file.mimetype;
        const originalName = req.file.originalname;
        
        let extractedData = null;
        let dataType = req.body.dataType || 'general'; // leadership, funnel, goals, etc.
        
        // Process file based on type
        if (fileType === 'application/pdf') {
            extractedData = await processPDFFile(filePath, dataType);
        } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
            extractedData = await processExcelFile(filePath, dataType);
        } else if (fileType === 'text/csv') {
            extractedData = await processCSVFile(filePath, dataType);
        }
        
        // Save processed data based on type
        let savedResult = null;
        if (extractedData) {
            savedResult = await saveProcessedData(extractedData, dataType);
        }
        
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        
        // Broadcast update to all connected clients if data was saved
        if (savedResult) {
            io.emit('dashboardUpdate', {
                section: dataType === 'leadership' ? 'leadershipTeam' : dataType,
                data: savedResult,
                source: 'file_upload'
            });
        }
        
        res.json({
            success: true,
            message: `File processed successfully`,
            filename: originalName,
            dataType: dataType,
            recordsProcessed: extractedData ? extractedData.length : 0,
            savedData: savedResult ? true : false
        });
        
    } catch (error) {
        console.error('❌ Error processing uploaded file:', error);
        
        // Clean up file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to process uploaded file',
            error: error.message
        });
    }
});

// Get list of uploaded files and processing history
app.get('/api/upload-history', (req, res) => {
    try {
        const historyFile = path.join(__dirname, 'data', 'upload-history.json');
        
        if (fs.existsSync(historyFile)) {
            const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
            res.json({
                success: true,
                history: history
            });
        } else {
            res.json({
                success: true,
                history: []
            });
        }
    } catch (error) {
        console.error('❌ Error fetching upload history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch upload history',
            error: error.message
        });
    }
});

// Download sample template files
app.get('/api/download-template/:type', (req, res) => {
    try {
        const templateType = req.params.type;
        const templates = {
            leadership: generateLeadershipTemplate(),
            funnel: generateFunnelTemplate(),
            goals: generateGoalsTemplate()
        };
        
        if (!templates[templateType]) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }
        
        // Create Excel file
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(templates[templateType]);
        xlsx.utils.book_append_sheet(workbook, worksheet, templateType);
        
        // Generate buffer
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', `attachment; filename="${templateType}-template.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
        
    } catch (error) {
        console.error('❌ Error generating template:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate template',
            error: error.message
        });
    }
});

// ============================================================================
// LEADERSHIP TEAM API ENDPOINTS
// ============================================================================

// Get all leadership team members
app.get('/api/leadership-team', 
    authMiddleware.requireAuth, 
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.READ),
    async (req, res) => {
  try {
    console.log('👥 API: Fetching leadership team data...');
    const leadershipData = await dataService.getLeadershipTeamData();
    
    res.json({
      success: true,
      leaders: leadershipData.leaders || [],
      lastUpdated: leadershipData.lastUpdated,
      source: leadershipData.source
    });
  } catch (error) {
    console.error('❌ Error fetching leadership team:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leadership team data',
      error: error.message
    });
  }
});

// Add new leadership team member
app.post('/api/leadership-team', async (req, res) => {
  try {
    console.log('➕ API: Adding new leadership team member...');
    const leaderData = req.body;
    
    // Validate required fields
    if (!leaderData.name || !leaderData.role || !leaderData.department || !leaderData.email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, role, department, email'
      });
    }
    
    // Generate ID if not provided
    if (!leaderData.id) {
      leaderData.id = Date.now().toString();
    }
    
    // Save to database
    const savedLeader = await dataService.saveLeadershipToDatabase(leaderData);
    
    // Broadcast update to all connected clients
    io.emit('dashboardUpdate', {
      section: 'leadershipTeam',
      data: await dataService.getLeadershipTeamData()
    });
    
    console.log('✅ Leadership team member added successfully');
    res.json({
      success: true,
      message: 'Leadership team member added successfully',
      leader: savedLeader
    });
    
  } catch (error) {
    console.error('❌ Error adding leadership team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add leadership team member',
      error: error.message
    });
  }
});

// Update leadership team member
app.put('/api/leadership-team/:id', async (req, res) => {
  try {
    const leaderId = req.params.id;
    const leaderData = req.body;
    
    console.log(`✏️ API: Updating leadership team member ${leaderId}...`);
    
    // Validate required fields
    if (!leaderData.name || !leaderData.role || !leaderData.department || !leaderData.email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, role, department, email'
      });
    }
    
    // Ensure ID matches
    leaderData.id = leaderId;
    
    // Update in database
    const updatedLeader = await dataService.saveLeadershipToDatabase(leaderData);
    
    // Broadcast update to all connected clients
    io.emit('dashboardUpdate', {
      section: 'leadershipTeam',
      data: await dataService.getLeadershipTeamData()
    });
    
    console.log('✅ Leadership team member updated successfully');
    res.json({
      success: true,
      message: 'Leadership team member updated successfully',
      leader: updatedLeader
    });
    
  } catch (error) {
    console.error('❌ Error updating leadership team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leadership team member',
      error: error.message
    });
  }
});

// Delete leadership team member
app.delete('/api/leadership-team/:id', async (req, res) => {
  try {
    const leaderId = req.params.id;
    
    console.log(`🗑️ API: Deleting leadership team member ${leaderId}...`);
    
    // Delete from database
    const deletedLeader = await dataService.deleteLeadershipFromDatabase(leaderId);
    
    // Broadcast update to all connected clients
    io.emit('dashboardUpdate', {
      section: 'leadershipTeam',
      data: await dataService.getLeadershipTeamData()
    });
    
    console.log('✅ Leadership team member deleted successfully');
    res.json({
      success: true,
      message: 'Leadership team member deleted successfully',
      leader: deletedLeader
    });
    
  } catch (error) {
    console.error('❌ Error deleting leadership team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete leadership team member',
      error: error.message
    });
  }
});

// Get individual leadership team member
app.get('/api/leadership-team/:id', 
    authMiddleware.requireAuth, 
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.READ),
    async (req, res) => {
  try {
    const leaderId = req.params.id;
    
    console.log(`👤 API: Fetching leadership team member ${leaderId}...`);
    
    const leadershipData = await dataService.getLeadershipTeamData();
    const leader = leadershipData.leaders.find(l => l.id === leaderId);
    
    if (!leader) {
      return res.status(404).json({
        success: false,
        message: 'Leadership team member not found'
      });
    }
    
    res.json({
      success: true,
      leader: leader
    });
    
  } catch (error) {
    console.error('❌ Error fetching leadership team member:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leadership team member',
      error: error.message
    });
  }
});

// Sync leadership team data with Ninety.io
app.post('/api/leadership-team/sync', async (req, res) => {
  try {
    console.log('🔄 API: Syncing leadership team data with Ninety.io...');
    
    // Force refresh from Ninety.io
    const leadershipData = await dataService.getLeadershipTeamData();
    
    // Broadcast update to all connected clients
    io.emit('dashboardUpdate', {
      section: 'leadershipTeam',
      data: leadershipData
    });
    
    console.log('✅ Leadership team data synced successfully');
    res.json({
      success: true,
      message: 'Leadership team data synced successfully',
      source: leadershipData.source,
      leaders: leadershipData.leaders.length,
      lastUpdated: leadershipData.lastUpdated
    });
    
  } catch (error) {
    console.error('❌ Error syncing leadership team data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync leadership team data',
      error: error.message
    });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current dashboard data to newly connected client
  socket.emit('dashboardData', dashboardData);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Schedule automatic data refresh from repositories
const refreshInterval = process.env.DATA_REFRESH_INTERVAL || '*/15 * * * *'; // Default: every 15 minutes
const enableAutoRefresh = process.env.ENABLE_AUTO_REFRESH === 'true' || true;

if (enableAutoRefresh) {
  console.log(`🔄 Setting up automatic data refresh: ${refreshInterval}`);
  
  cron.schedule(refreshInterval, async () => {
    console.log('🔄 Refreshing dashboard data from repositories...');
    
    try {
      // Fetch fresh data from all repositories
      const freshData = await dataService.getAllDashboardData();
      
      // Update the dashboard data
      const previousData = JSON.stringify(dashboardData);
      dashboardData = freshData;
      
      // Check if data actually changed
      const newData = JSON.stringify(dashboardData);
      const dataChanged = previousData !== newData;
      
      if (dataChanged) {
        console.log('✅ Dashboard data refreshed - changes detected');
        // Broadcast updates to all connected clients
        io.emit('dashboardUpdate', { section: 'all', data: dashboardData });
      } else {
        console.log('📋 Dashboard data refreshed - no changes detected');
      }
      
    } catch (error) {
      console.error('❌ Failed to refresh dashboard data:', error);
      // Don't update dashboardData if refresh fails, keep existing data
    }
  });
} else {
  console.log('⏸️ Automatic data refresh is disabled');
}

// DAILY DATA REFRESH SCHEDULER

// Schedule daily data refresh at 8:00 AM every day
cron.schedule('0 8 * * *', async () => {
    console.log('🕐 Daily data refresh started at 8:00 AM');
    await performDailyDataRefresh();
}, {
    scheduled: true,
    timezone: "America/New_York" // Adjust timezone as needed
});

// Also refresh data every 6 hours for more frequent updates
cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 6-hour data refresh started');
    await performDailyDataRefresh();
}, {
    scheduled: true,
    timezone: "America/New_York"
});

// Function to perform comprehensive data refresh
async function performDailyDataRefresh() {
    try {
        console.log('🔄 Starting comprehensive data refresh...');
        
        // Get fresh data from Tableau
        let freshTableauData = null;
        if (tableauAutoExtractor) {
            freshTableauData = await tableauAutoExtractor.getFreshData();
            console.log('✅ Fresh Tableau data retrieved');
        } else {
            console.log('⚠️ Tableau auto extractor not available, using fallback data');
            freshTableauData = { google: null, facebook: null }; // Fallback structure
        }
        
        // Extract Google and Facebook data separately
        let googleData = null;
        let facebookData = null;
        
        if (freshTableauData.google) {
            googleData = freshTableauData.google;
            console.log('📊 Google Ads data extracted');
        }
        
        if (freshTableauData.facebook) {
            facebookData = freshTableauData.facebook;
            console.log('📘 Facebook Ads data extracted');
        }
        
        // Save daily tracking data (separate platforms)
        if (googleData && facebookData) {
            if (dailyDataTracker) {
            await dailyDataTracker.saveDailyData(googleData.daily, facebookData.daily);
        } else {
            console.log('⚠️ Daily data tracker not available for saving data');
        }
            console.log('💾 Daily tracking data saved');
        }
        
        // Get complete dashboard data (this will now include the fresh Tableau data)
        const dashboardData = await dataService.getAllDashboardData();
        console.log('📊 Complete dashboard data assembled with fresh Tableau data');
        
        // Broadcast updated data to all connected clients
        io.emit('dashboardUpdate', {
            section: 'all',
            data: dashboardData,
            timestamp: new Date().toISOString(),
            updateType: 'daily_refresh'
        });
        
        console.log('✅ Daily data refresh completed and broadcasted to clients');
        
        // Log refresh summary
        logRefreshSummary(dashboardData);
        
    } catch (error) {
        console.error('❌ Error during daily data refresh:', error);
        
        // Broadcast error notification to clients
        io.emit('dashboardError', {
            message: 'Data refresh failed',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// Log refresh summary
function logRefreshSummary(data) {
    console.log('\n📋 DAILY REFRESH SUMMARY');
    console.log('========================');
    
    if (data.google) {
        console.log('🔍 Google Ads:');
        console.log(`   Revenue: $${data.google.daily?.revenue || 0}`);
        console.log(`   Impressions: ${data.google.daily?.impressions || 0}`);
        console.log(`   ROAS: ${data.google.daily?.roas || 0}`);
    }
    
    if (data.facebook) {
        console.log('📘 Facebook Ads:');
        console.log(`   Revenue: $${data.facebook.daily?.revenue || 0}`);
        console.log(`   Impressions: ${data.facebook.daily?.impressions || 0}`);
        console.log(`   ROAS: ${data.facebook.daily?.roas || 0}`);
    }
    
    if (data.revenueFunnel) {
        console.log('📊 Revenue Funnel:');
        console.log(`   Total Leads: ${data.revenueFunnel.leads || 0}`);
        console.log(`   Total Revenue: $${data.revenueFunnel.revenue || 0}`);
    }
    
    if (data.platformComparison) {
        console.log('⚖️ Platform Winner: ' + (data.platformComparison.winner || 'Unknown'));
    }
    
    console.log('========================\n');
}

// Socket.io connection handling
io.on('connection', async (socket) => {
    console.log('🔌 New client connected:', socket.id);

    try {
        // Send initial dashboard data
        const dashboardData = await dataService.getAllDashboardData();
        socket.emit('dashboardData', dashboardData);
        console.log('📊 Initial data sent to client:', socket.id);
    } catch (error) {
        console.error('❌ Error sending initial data:', error);
        socket.emit('dashboardError', {
            message: 'Failed to load initial data',
            error: error.message
        });
    }

    // Handle client disconnect
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
    
    // Handle manual refresh request
    socket.on('requestRefresh', async () => {
        console.log('🔄 Manual refresh requested by client:', socket.id);
        await performDailyDataRefresh();
    });
});

// API endpoint for manual data refresh
app.get('/api/refresh', async (req, res) => {
    try {
        console.log('🔄 Manual refresh triggered via API');
        await performDailyDataRefresh();
        res.json({ 
            success: true, 
            message: 'Data refresh completed successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ API refresh error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Data refresh failed',
            error: error.message 
        });
    }
});

// API endpoint to get current data status
app.get('/api/status', async (req, res) => {
    try {
        const dashboardData = await dataService.getAllDashboardData();
        res.json({
            success: true,
            lastUpdated: dashboardData.lastUpdated,
            extractionInfo: dashboardData.extractionInfo,
            platforms: {
                google: dashboardData.google ? 'active' : 'inactive',
                facebook: dashboardData.facebook ? 'active' : 'inactive'
            },
            dataPoints: {
                totalLeads: dashboardData.revenueFunnel?.leads || 0,
                totalRevenue: dashboardData.revenueFunnel?.revenue || 0,
                platformWinner: dashboardData.platformComparison?.winner || 'unknown'
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'Adsync Media Hub Dashboard'
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server gracefully...');
    
    // Close data service connections
    try {
        await dataService.closeConnections();
        console.log('✅ Data service connections closed');
    } catch (error) {
        console.error('❌ Error closing data service connections:', error);
    }
    
    // Close server
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// NEW: Debug endpoint to test Tableau data extraction
app.get('/api/debug/tableau/:date?', async (req, res) => {
  try {
    const testDate = req.params.date || new Date().toISOString().split('T')[0];
    console.log(`🔍 DEBUG: Testing Tableau extraction for ${testDate}`);
    
    // Test the extraction process
    const result = {
      testDate,
      availableDates: [],
      extractedData: null,
      errors: []
    };
    
    // Test getting available dates
    try {
      result.availableDates = await tableauAutoExtractor.getAvailableDates();
      console.log(`✅ DEBUG: Found ${result.availableDates.length} available dates`);
    } catch (error) {
      result.errors.push(`Available dates error: ${error.message}`);
    }
    
    // Test extracting data for specific date
    try {
      result.extractedData = await tableauAutoExtractor.extractDataForDate(testDate);
      console.log(`✅ DEBUG: Extracted data for ${testDate}:`, result.extractedData ? 'SUCCESS' : 'NO DATA');
    } catch (error) {
      result.errors.push(`Data extraction error: ${error.message}`);
    }
    
    res.json({
      success: true,
      debug: result,
      message: 'Debug information extracted successfully'
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.json({
      success: false,
      error: error.message,
      message: 'Debug extraction failed'
    });
  }
});

// ============================================================================
// FILE PROCESSING FUNCTIONS
// ============================================================================

// Process PDF files
async function processPDFFile(filePath, dataType) {
    try {
        console.log(`📄 Processing PDF file for ${dataType} data...`);
        
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        const text = pdfData.text;
        
        // Extract data based on type
        let extractedData = [];
        
        if (dataType === 'leadership') {
            extractedData = extractLeadershipFromText(text);
        } else if (dataType === 'funnel') {
            extractedData = extractFunnelFromText(text);
        } else if (dataType === 'goals') {
            extractedData = extractGoalsFromText(text);
        } else {
            // General text extraction
            extractedData = [{ content: text, type: 'text', source: 'pdf' }];
        }
        
        console.log(`✅ Extracted ${extractedData.length} records from PDF`);
        return extractedData;
        
    } catch (error) {
        console.error('❌ Error processing PDF:', error);
        throw error;
    }
}

// Process Excel files
async function processExcelFile(filePath, dataType) {
    try {
        console.log(`📊 Processing Excel file for ${dataType} data...`);
        
        const workbook = xlsx.readFile(filePath);
        const sheetNames = workbook.SheetNames;
        let extractedData = [];
        
        // Process each sheet
        for (const sheetName of sheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet);
            
            if (dataType === 'leadership') {
                const leadershipData = processLeadershipExcelData(jsonData);
                extractedData = extractedData.concat(leadershipData);
            } else if (dataType === 'funnel') {
                const funnelData = processFunnelExcelData(jsonData);
                extractedData = extractedData.concat(funnelData);
            } else if (dataType === 'goals') {
                const goalsData = processGoalsExcelData(jsonData);
                extractedData = extractedData.concat(goalsData);
            } else {
                // General data processing
                extractedData = extractedData.concat(jsonData.map(row => ({
                    ...row,
                    source: 'excel',
                    sheet: sheetName
                })));
            }
        }
        
        console.log(`✅ Extracted ${extractedData.length} records from Excel`);
        return extractedData;
        
    } catch (error) {
        console.error('❌ Error processing Excel:', error);
        throw error;
    }
}

// Process CSV files
async function processCSVFile(filePath, dataType) {
    try {
        console.log(`📋 Processing CSV file for ${dataType} data...`);
        
        const workbook = xlsx.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        
        let extractedData = [];
        
        if (dataType === 'leadership') {
            extractedData = processLeadershipExcelData(jsonData);
        } else if (dataType === 'funnel') {
            extractedData = processFunnelExcelData(jsonData);
        } else if (dataType === 'goals') {
            extractedData = processGoalsExcelData(jsonData);
        } else {
            extractedData = jsonData.map(row => ({
                ...row,
                source: 'csv'
            }));
        }
        
        console.log(`✅ Extracted ${extractedData.length} records from CSV`);
        return extractedData;
        
    } catch (error) {
        console.error('❌ Error processing CSV:', error);
        throw error;
    }
}

// Process comprehensive leadership data from Excel/CSV (Ninety.io style)
function processLeadershipExcelData(jsonData) {
    return jsonData.map(row => {
        // Map common column names to our comprehensive format
        const leader = {
            id: row.id || row.ID || row.employeeId || row.EmployeeId || Date.now().toString() + Math.random(),
            name: row.name || row.Name || row.FULL_NAME || row['Full Name'] || row.fullName || '',
            role: row.role || row.Role || row.TITLE || row.Title || row.Position || row.position || '',
            department: mapDepartment(row.department || row.Department || row.DEPT || row.Team || row.team || ''),
            email: row.email || row.Email || row.EMAIL || row['Email Address'] || row.emailAddress || '',
            phone: row.phone || row.Phone || row.PHONE || row['Phone Number'] || row.phoneNumber || '',
            goals: row.goals || row.Goals || row.GOALS || row.Objectives || row.objectives || '',
            metrics: row.metrics || row.Metrics || row.METRICS || row.KPIs || row.kpis || '',
            status: row.status || row.Status || row.STATUS || 'active',
            
            // Extended Ninety.io-style fields
            startDate: row.startDate || row.StartDate || row.start_date || row.hireDate || '',
            reportingTo: row.reportingTo || row.ReportingTo || row.reporting_to || row.manager || row.Manager || '',
            directReports: row.directReports || row.DirectReports || row.direct_reports || row.reports || '',
            skills: row.skills || row.Skills || row.SKILLS || row.competencies || row.Competencies || '',
            certifications: row.certifications || row.Certifications || row.certificates || row.Certificates || '',
            emergencyContact: row.emergencyContact || row.EmergencyContact || row.emergency_contact || row.emergencyContactInfo || '',
            location: row.location || row.Location || row.LOCATION || row.office || row.Office || '',
            workStyle: row.workStyle || row.WorkStyle || row.work_style || row.workArrangement || row.WorkArrangement || 'On-site',
            performanceRating: row.performanceRating || row.PerformanceRating || row.performance_rating || row.rating || '',
            lastReviewDate: row.lastReviewDate || row.LastReviewDate || row.last_review_date || row.lastReview || '',
            nextReviewDate: row.nextReviewDate || row.NextReviewDate || row.next_review_date || row.nextReview || '',
            salary: row.salary || row.Salary || row.SALARY || row.compensation || row.Compensation || '',
            notes: row.notes || row.Notes || row.NOTES || row.comments || row.Comments || '',
            
            // Metadata
            lastUpdated: new Date().toISOString(),
            updatedBy: 'file_upload'
        };
        
        // Validate required fields
        if (!leader.name || !leader.email) {
            console.warn(`⚠️ Skipping incomplete leader record: ${JSON.stringify(row)}`);
            return null;
        }
        
        // Clean up department mapping
        leader.department = leader.department || 'executive';
        
        return leader;
    }).filter(leader => leader !== null);
}

// Process funnel data from Excel/CSV
function processFunnelExcelData(jsonData) {
    return jsonData.map(row => ({
        date: row.date || row.Date || new Date().toISOString().split('T')[0],
        leads: parseInt(row.leads || row.Leads || 0),
        prospects: parseInt(row.prospects || row.Prospects || 0),
        qualified: parseInt(row.qualified || row.Qualified || 0),
        proposals: parseInt(row.proposals || row.Proposals || 0),
        closed: parseInt(row.closed || row.Closed || 0),
        revenue: parseFloat(row.revenue || row.Revenue || 0),
        source: 'excel'
    }));
}

// Process goals data from Excel/CSV
function processGoalsExcelData(jsonData) {
    const goals = {
        quarterly: { target: 0, current: 0, percentage: 0 },
        monthly: { target: 0, current: 0, percentage: 0 }
    };
    
    jsonData.forEach(row => {
        if (row.period === 'quarterly' || row.Period === 'quarterly') {
            goals.quarterly.target = parseFloat(row.target || row.Target || 0);
            goals.quarterly.current = parseFloat(row.current || row.Current || 0);
            goals.quarterly.percentage = Math.round((goals.quarterly.current / goals.quarterly.target) * 100);
        } else if (row.period === 'monthly' || row.Period === 'monthly') {
            goals.monthly.target = parseFloat(row.target || row.Target || 0);
            goals.monthly.current = parseFloat(row.current || row.Current || 0);
            goals.monthly.percentage = Math.round((goals.monthly.current / goals.monthly.target) * 100);
        }
    });
    
    return [goals];
}

// Map department names to our system
function mapDepartment(dept) {
    if (!dept) return 'executive';
    
    const deptLower = dept.toLowerCase();
    const mapping = {
        'executive': 'executive',
        'exec': 'executive',
        'ceo': 'executive',
        'cto': 'executive',
        'cfo': 'executive',
        'marketing': 'marketing',
        'sales': 'sales',
        'operations': 'operations',
        'ops': 'operations',
        'finance': 'finance',
        'hr': 'hr',
        'human resources': 'hr',
        'technology': 'technology',
        'tech': 'technology',
        'it': 'technology',
        'creative': 'creative',
        'design': 'creative'
    };
    
    return mapping[deptLower] || 'executive';
}

// Save processed data based on type
async function saveProcessedData(extractedData, dataType) {
    try {
        console.log(`💾 Saving ${extractedData.length} records of type: ${dataType}`);
        
        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        if (dataType === 'leadership') {
            // Save leadership data to database
            const savedLeaders = [];
            for (const leader of extractedData) {
                try {
                    const saved = await dataService.saveLeadershipToDatabase(leader);
                    savedLeaders.push(saved);
                } catch (error) {
                    console.warn(`⚠️ Failed to save leader ${leader.name}:`, error.message);
                }
            }
            
            // Update upload history
            await updateUploadHistory('leadership', extractedData.length, savedLeaders.length);
            
            return { leaders: savedLeaders };
        } else {
            // Save other data types to files
            const fileName = `${dataType}-${Date.now()}.json`;
            const filePath = path.join(dataDir, fileName);
            
            fs.writeFileSync(filePath, JSON.stringify(extractedData, null, 2));
            
            // Update upload history
            await updateUploadHistory(dataType, extractedData.length, extractedData.length);
            
            return extractedData;
        }
        
    } catch (error) {
        console.error('❌ Error saving processed data:', error);
        throw error;
    }
}

// Update upload history
async function updateUploadHistory(dataType, totalRecords, savedRecords) {
    try {
        const historyFile = path.join(__dirname, 'data', 'upload-history.json');
        let history = [];
        
        if (fs.existsSync(historyFile)) {
            history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        }
        
        const newEntry = {
            id: Date.now().toString(),
            dataType: dataType,
            totalRecords: totalRecords,
            savedRecords: savedRecords,
            uploadDate: new Date().toISOString(),
            success: savedRecords > 0
        };
        
        history.unshift(newEntry);
        
        // Keep only last 50 entries
        if (history.length > 50) {
            history = history.slice(0, 50);
        }
        
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
        
    } catch (error) {
        console.error('❌ Error updating upload history:', error);
    }
}

// Generate comprehensive Ninety.io-style leadership template for manual upload
function generateLeadershipTemplate() {
    return [
        {
            id: 'L001',
            name: 'John Smith',
            role: 'Chief Executive Officer',
            department: 'executive',
            email: 'john.smith@company.com',
            phone: '+1-555-0101',
            goals: 'Drive company growth by 25% this quarter and expand market presence',
            metrics: 'Revenue growth %, Market share %, Team satisfaction score',
            status: 'active',
            startDate: '2024-01-15',
            reportingTo: '',
            directReports: 'L002,L003,L004,L005',
            skills: 'Leadership, Strategic Planning, Vision Development',
            certifications: 'MBA Harvard Business School, Executive Leadership Certificate',
            emergencyContact: 'Jane Smith - +1-555-0199',
            location: 'New York, NY',
            workStyle: 'Hybrid',
            performanceRating: 'Exceeds Expectations',
            lastReviewDate: '2024-06-01',
            nextReviewDate: '2024-12-01',
            salary: '250000',
            notes: 'Strong strategic leader with excellent communication and vision-setting abilities'
        },
        {
            id: 'L002',
            name: 'Sarah Johnson',
            role: 'Chief Marketing Officer',
            department: 'marketing',
            email: 'sarah.johnson@company.com',
            phone: '+1-555-0102',
            goals: 'Launch 5 new campaigns and increase brand awareness by 40%',
            metrics: 'Campaign ROI %, Brand awareness %, Lead generation count',
            status: 'active',
            startDate: '2023-08-20',
            reportingTo: 'L001',
            directReports: 'L006,L007',
            skills: 'Digital Marketing, Brand Management, Analytics, Content Strategy',
            certifications: 'Google Analytics Certified, Facebook Blueprint, HubSpot Marketing',
            emergencyContact: 'Mike Johnson - +1-555-0298',
            location: 'Los Angeles, CA',
            workStyle: 'Remote',
            performanceRating: 'Meets Expectations',
            lastReviewDate: '2024-05-15',
            nextReviewDate: '2024-11-15',
            salary: '180000',
            notes: 'Creative marketing professional with strong analytical and campaign management skills'
        },
        {
            id: 'L003',
            name: 'Michael Chen',
            role: 'Chief Technology Officer',
            department: 'technology',
            email: 'michael.chen@company.com',
            phone: '+1-555-0103',
            goals: 'Modernize tech stack and achieve 99.9% system uptime',
            metrics: 'System uptime %, Deployment frequency, Security score, Code quality',
            status: 'active',
            startDate: '2023-03-10',
            reportingTo: 'L001',
            directReports: 'L008,L009,L010',
            skills: 'Cloud Architecture, DevOps, Cybersecurity, Team Leadership',
            certifications: 'AWS Solutions Architect Professional, CISSP, Kubernetes Certified',
            emergencyContact: 'Linda Chen - +1-555-0398',
            location: 'San Francisco, CA',
            workStyle: 'Hybrid',
            performanceRating: 'Exceeds Expectations',
            lastReviewDate: '2024-04-20',
            nextReviewDate: '2024-10-20',
            salary: '220000',
            notes: 'Innovative technology leader with strong problem-solving and system architecture abilities'
        },
        {
            id: 'L004',
            name: 'Emily Davis',
            role: 'Chief Financial Officer',
            department: 'finance',
            email: 'emily.davis@company.com',
            phone: '+1-555-0104',
            goals: 'Optimize cash flow and reduce operational costs by 15%',
            metrics: 'Cash flow optimization %, Cost reduction %, Profit margins %, Budget accuracy',
            status: 'active',
            startDate: '2022-11-05',
            reportingTo: 'L001',
            directReports: 'L011,L012',
            skills: 'Financial Planning, Risk Management, Compliance, Strategic Analysis',
            certifications: 'CPA, CFA, Six Sigma Black Belt',
            emergencyContact: 'Robert Davis - +1-555-0498',
            location: 'Chicago, IL',
            workStyle: 'On-site',
            performanceRating: 'Exceeds Expectations',
            lastReviewDate: '2024-03-10',
            nextReviewDate: '2024-09-10',
            salary: '200000',
            notes: 'Detail-oriented financial expert with strong analytical mindset and compliance expertise'
        },
        {
            id: 'L005',
            name: 'David Wilson',
            role: 'VP of Sales',
            department: 'sales',
            email: 'david.wilson@company.com',
            phone: '+1-555-0105',
            goals: 'Exceed sales targets by 20% and improve customer retention to 90%',
            metrics: 'Sales revenue growth %, Customer retention %, Deal closure rate %, Pipeline health',
            status: 'active',
            startDate: '2023-06-15',
            reportingTo: 'L001',
            directReports: 'L013,L014,L015',
            skills: 'Sales Strategy, Customer Relations, Team Leadership, CRM Management',
            certifications: 'Salesforce Administrator, Sales Management Certificate, Challenger Sale',
            emergencyContact: 'Maria Wilson - +1-555-0598',
            location: 'Austin, TX',
            workStyle: 'Hybrid',
            performanceRating: 'Meets Expectations',
            lastReviewDate: '2024-06-15',
            nextReviewDate: '2024-12-15',
            salary: '160000',
            notes: 'Results-driven sales leader with excellent customer relationship and team building skills'
        }
    ];
}

function generateFunnelTemplate() {
    return [
        {
            date: '2024-01-15',
            leads: 1250,
            prospects: 875,
            qualified: 425,
            proposals: 180,
            closed: 85,
            revenue: 750000
        }
    ];
}

function generateGoalsTemplate() {
    return [
        {
            period: 'quarterly',
            target: 1000000,
            current: 750000,
            percentage: 75
        },
        {
            period: 'monthly',
            target: 333333,
            current: 280000,
            percentage: 84
        }
    ];
}

// Text extraction functions (basic implementations)
function extractLeadershipFromText(text) {
    // Basic text parsing for leadership data
    const lines = text.split('\n').filter(line => line.trim());
    const leaders = [];
    
    // Look for email patterns to identify potential leaders
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
    const emails = text.match(emailRegex) || [];
    
    emails.forEach((email, index) => {
        leaders.push({
            id: Date.now().toString() + index,
            name: `Leader ${index + 1}`,
            role: 'Extracted from PDF',
            department: 'executive',
            email: email,
            phone: '',
            goals: 'Extracted from uploaded document',
            metrics: 'To be updated',
            status: 'active'
        });
    });
    
    return leaders;
}

function extractFunnelFromText(text) {
    // Basic number extraction for funnel data
    const numbers = text.match(/\d+/g) || [];
    
    if (numbers.length >= 6) {
        return [{
            leads: parseInt(numbers[0]) || 0,
            prospects: parseInt(numbers[1]) || 0,
            qualified: parseInt(numbers[2]) || 0,
            proposals: parseInt(numbers[3]) || 0,
            closed: parseInt(numbers[4]) || 0,
            revenue: parseInt(numbers[5]) || 0,
            source: 'pdf_extraction'
        }];
    }
    
    return [];
}

function extractGoalsFromText(text) {
    // Basic goal extraction
    const numbers = text.match(/\d+/g) || [];
    
    return [{
        quarterly: {
            target: parseInt(numbers[0]) || 1000000,
            current: parseInt(numbers[1]) || 750000,
            percentage: 75
        },
        monthly: {
            target: parseInt(numbers[2]) || 333333,
            current: parseInt(numbers[3]) || 280000,
            percentage: 84
        },
        source: 'pdf_extraction'
    }];
}

// ============================================================================
// NINETY.IO DATA MANAGEMENT API ENDPOINTS
// ============================================================================

// Upload Ninety.io data files
app.post('/api/ninety-data/upload', upload.single('ninetyDataFile'), async (req, res) => {
    try {
        const { dataType } = req.body;
        const uploadedFile = req.file;
        
        if (!uploadedFile) {
            return res.status(400).json({ 
                success: false, 
                message: 'No file uploaded' 
            });
        }
        
        if (!dataType) {
            return res.status(400).json({ 
                success: false, 
                message: 'Data type is required' 
            });
        }
        
        console.log(`📁 Processing Ninety.io ${dataType} upload: ${uploadedFile.filename}`);
        
        let processedData = [];
        let recordsProcessed = 0;
        
        // Process the file based on type
        if (uploadedFile.mimetype === 'application/pdf') {
            const fileBuffer = fs.readFileSync(uploadedFile.path);
            const pdfData = await pdfParse(fileBuffer);
            processedData = await processNinetyPdfData(pdfData.text, dataType);
        } else if (uploadedFile.mimetype.includes('sheet') || uploadedFile.mimetype.includes('excel')) {
            const workbook = xlsx.readFile(uploadedFile.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet);
            processedData = await processNinetyExcelData(jsonData, dataType);
        } else if (uploadedFile.mimetype === 'text/csv') {
            const workbook = xlsx.readFile(uploadedFile.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = xlsx.utils.sheet_to_json(worksheet);
            processedData = await processNinetyExcelData(jsonData, dataType);
        }
        
        recordsProcessed = processedData.length;
        
        // Save to database
        let savedRecords = 0;
        if (processedData.length > 0) {
            savedRecords = await saveNinetyDataToDatabase(processedData, dataType);
        }
        
        // Log upload history
        await logNinetyUploadHistory({
            filename: uploadedFile.filename,
            originalFilename: uploadedFile.originalname,
            dataType,
            fileSize: uploadedFile.size,
            recordsProcessed,
            recordsSaved: savedRecords,
            success: savedRecords > 0,
            errorMessage: savedRecords === 0 ? 'No data could be saved' : null
        });
        
        // Clean up uploaded file
        fs.unlinkSync(uploadedFile.path);
        
        res.json({
            success: true,
            message: `Ninety.io ${dataType} uploaded successfully`,
            filename: uploadedFile.originalname,
            dataType,
            recordsProcessed,
            savedData: savedRecords > 0
        });
        
    } catch (error) {
        console.error('❌ Error processing Ninety.io upload:', error);
        
        // Clean up uploaded file if it exists
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            success: false,
            message: 'Error processing upload: ' + error.message
        });
    }
});

// Get Ninety.io To-Do's
app.get('/api/ninety-data/todos', async (req, res) => {
    try {
        const todos = await getNinetyTodos();
        res.json({
            success: true,
            todos
        });
    } catch (error) {
        console.error('❌ Error fetching Ninety.io todos:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching todos: ' + error.message
        });
    }
});

// Get Ninety.io Rocks
app.get('/api/ninety-data/rocks', async (req, res) => {
    try {
        const rocks = await getNinetyRocks();
        res.json({
            success: true,
            rocks
        });
    } catch (error) {
        console.error('❌ Error fetching Ninety.io rocks:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching rocks: ' + error.message
        });
    }
});

// Get Ninety.io Issues
app.get('/api/ninety-data/issues', async (req, res) => {
    try {
        const issues = await getNinetyIssues();
        res.json({
            success: true,
            issues
        });
    } catch (error) {
        console.error('❌ Error fetching Ninety.io issues:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching issues: ' + error.message
        });
    }
});

// Get Ninety.io Data
app.get('/api/ninety-data/data', async (req, res) => {
    try {
        const data = await getNinetyData();
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('❌ Error fetching Ninety.io data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching data: ' + error.message
        });
    }
});

// Delete Ninety.io item
app.delete('/api/ninety-data/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        
        const filePath = path.join(__dirname, 'data', `ninety_${type}.json`);
        
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            let data = JSON.parse(fileContent);
            
            // Filter out the item with the specified ID
            const initialLength = data.length;
            data = data.filter(item => item.id.toString() !== id);
            
            if (data.length < initialLength) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                res.json({ success: true, message: `Item deleted successfully` });
            } else {
                res.json({ success: false, message: `Item not found` });
            }
        } else {
            res.json({ success: false, message: `No data found for ${type}` });
        }
    } catch (error) {
        console.error('❌ Error deleting item:', error);
        res.status(500).json({ success: false, message: 'Error deleting item' });
    }
});

// Clear all data for a specific type
app.delete('/api/ninety-data/clear', async (req, res) => {
    try {
        const { type } = req.query;
        
        if (type) {
            // Clear specific type
            const filePath = path.join(__dirname, 'data', `ninety_${type}.json`);
            if (fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify([], null, 2));
            }
            res.json({ success: true, message: `All ${type} data cleared` });
        } else {
            // Clear all types
            const types = ['todos', 'rocks', 'issues', 'data'];
            for (const dataType of types) {
                const filePath = path.join(__dirname, 'data', `ninety_${dataType}.json`);
                if (fs.existsSync(filePath)) {
                    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
                }
            }
            res.json({ success: true, message: 'All Ninety.io data cleared' });
        }
    } catch (error) {
        console.error('❌ Error clearing data:', error);
        res.status(500).json({ success: false, message: 'Error clearing data' });
    }
});

// ============================================================================
// NINETY.IO DATA PROCESSING FUNCTIONS
// ============================================================================

async function processNinetyPdfData(text, dataType) {
    console.log(`🔍 Processing PDF text for ${dataType}`);
    
    // Basic text processing - this can be enhanced based on your PDF structure
    const lines = text.split('\n').filter(line => line.trim());
    const processedData = [];
    
    switch (dataType) {
        case 'todos':
            // Extract To-Do items from PDF text
            lines.forEach((line, index) => {
                if (line.trim().length > 10) { // Basic filter for meaningful content
                    processedData.push({
                        id: `todo_${Date.now()}_${index}`,
                        title: line.trim().substring(0, 255),
                        description: line.trim(),
                        owner: 'PDF Import',
                        status: 'Open',
                        priority: 'Medium',
                        dueDate: null
                    });
                }
            });
            break;
            
        case 'rocks':
            // Extract Rocks from PDF text
            lines.forEach((line, index) => {
                if (line.trim().length > 10) {
                    processedData.push({
                        id: `rock_${Date.now()}_${index}`,
                        title: line.trim().substring(0, 255),
                        description: line.trim(),
                        owner: 'PDF Import',
                        status: 'Open',
                        progress: 0,
                        dueDate: null
                    });
                }
            });
            break;
            
        case 'issues':
            // Extract Issues from PDF text
            lines.forEach((line, index) => {
                if (line.trim().length > 10) {
                    processedData.push({
                        id: `issue_${Date.now()}_${index}`,
                        title: line.trim().substring(0, 255),
                        description: line.trim(),
                        owner: 'PDF Import',
                        status: 'Open',
                        priority: 'Medium'
                    });
                }
            });
            break;
            
        case 'data':
            // Extract Data from PDF text
            lines.forEach((line, index) => {
                if (line.trim().length > 10) {
                    processedData.push({
                        id: `data_${Date.now()}_${index}`,
                        title: line.trim().substring(0, 255),
                        description: line.trim(),
                        type: 'PDF Import',
                        value: line.trim(),
                        owner: 'PDF Import',
                        category: 'General'
                    });
                }
            });
            break;
    }
    
    return processedData;
}

async function processNinetyExcelData(jsonData, dataType) {
    console.log(`📊 Processing Excel data for ${dataType}`);
    
    const processedData = [];
    
    jsonData.forEach((row, index) => {
        const id = `${dataType}_${Date.now()}_${index}`;
        
        switch (dataType) {
            case 'todos':
                processedData.push({
                    id,
                    title: row.Title || row.title || row.Task || row.task || row.ToDo || row.todo || `Todo ${index + 1}`,
                    description: row.Description || row.description || row.Notes || row.notes || '',
                    owner: row.Owner || row.owner || row.Assignee || row.assignee || row.ResponsiblePerson || row.responsiblePerson || '',
                    status: row.Status || row.status || 'Open',
                    priority: row.Priority || row.priority || 'Medium',
                    dueDate: row.DueDate || row.dueDate || row.Due || row.due || null
                });
                break;
                
            case 'rocks':
                processedData.push({
                    id,
                    title: row.Title || row.title || row.Rock || row.rock || row.Goal || row.goal || `Rock ${index + 1}`,
                    description: row.Description || row.description || row.Notes || row.notes || '',
                    owner: row.Owner || row.owner || row.Assignee || row.assignee || row.ResponsiblePerson || row.responsiblePerson || '',
                    status: row.Status || row.status || 'Open',
                    progress: parseInt(row.Progress || row.progress || row.Completion || row.completion || 0),
                    dueDate: row.DueDate || row.dueDate || row.Due || row.due || null
                });
                break;
                
            case 'issues':
                processedData.push({
                    id,
                    title: row.Title || row.title || row.Issue || row.issue || row.Problem || row.problem || `Issue ${index + 1}`,
                    description: row.Description || row.description || row.Notes || row.notes || '',
                    owner: row.Owner || row.owner || row.Assignee || row.assignee || row.ResponsiblePerson || row.responsiblePerson || '',
                    status: row.Status || row.status || 'Open',
                    priority: row.Priority || row.priority || 'Medium'
                });
                break;
                
            case 'data':
                processedData.push({
                    id,
                    title: row.Title || row.title || row.Name || row.name || row.DataPoint || row.dataPoint || `Data ${index + 1}`,
                    description: row.Description || row.description || row.Notes || row.notes || '',
                    type: row.Type || row.type || row.Category || row.category || 'General',
                    value: row.Value || row.value || row.Data || row.data || '',
                    owner: row.Owner || row.owner || row.ResponsiblePerson || row.responsiblePerson || '',
                    category: row.Category || row.category || row.Type || row.type || 'General'
                });
                break;
        }
    });
    
    return processedData;
}

async function saveNinetyDataToDatabase(processedData, dataType) {
    console.log(`💾 Saving ${processedData.length} ${dataType} records to file storage`);
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const filePath = path.join(dataDir, `ninety_${dataType}.json`);
    
    let savedCount = 0;
    let existingData = [];
    
    try {
        // Read existing data if file exists
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            existingData = JSON.parse(fileContent);
        }
        
        // Add new data with unique IDs and timestamps
        for (const item of processedData) {
            const newItem = {
                id: Date.now() + Math.random(), // Simple unique ID
                ...item,
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString()
            };
            
            existingData.push(newItem);
            savedCount++;
        }
        
        // Save back to file
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
        console.log(`✅ Saved ${savedCount}/${processedData.length} ${dataType} records to file`);
        
    } catch (error) {
        console.error(`❌ Error saving ${dataType} data to file:`, error);
        throw error;
    }
    
    return savedCount;
}

async function getNinetyTodos() {
    try {
        const filePath = path.join(__dirname, 'data', 'ninety_todos.json');
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(fileContent);
            return data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
        return [];
    } catch (error) {
        console.error('❌ Error fetching todos:', error);
        return [];
    }
}

async function getNinetyRocks() {
    try {
        const filePath = path.join(__dirname, 'data', 'ninety_rocks.json');
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(fileContent);
            return data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
        return [];
    } catch (error) {
        console.error('❌ Error fetching rocks:', error);
        return [];
    }
}

async function getNinetyIssues() {
    try {
        const filePath = path.join(__dirname, 'data', 'ninety_issues.json');
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(fileContent);
            return data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
        return [];
    } catch (error) {
        console.error('❌ Error fetching issues:', error);
        return [];
    }
}

async function getNinetyData() {
    try {
        const filePath = path.join(__dirname, 'data', 'ninety_data.json');
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(fileContent);
            return data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        }
        return [];
    } catch (error) {
        console.error('❌ Error fetching data:', error);
        return [];
    }
}

async function deleteNinetyItem(type, id) {
    try {
        const dataDir = path.join(__dirname, 'data');
        let filePath;
        
        switch (type) {
            case 'todos':
                filePath = path.join(dataDir, 'ninety_todos.json');
                break;
            case 'rocks':
                filePath = path.join(dataDir, 'ninety_rocks.json');
                break;
            case 'issues':
                filePath = path.join(dataDir, 'ninety_issues.json');
                break;
            case 'data':
                filePath = path.join(dataDir, 'ninety_data.json');
                break;
            default:
                return false;
        }
        
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(fileContent);
            
            // Find and remove the item
            const initialLength = data.length;
            const filteredData = data.filter(item => item.id !== id);
            
            if (filteredData.length < initialLength) {
                fs.writeFileSync(filePath, JSON.stringify(filteredData, null, 2));
                console.log(`✅ Deleted ${type} item with id: ${id}`);
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('❌ Error deleting item:', error);
        return false;
    }
}

async function clearAllNinetyData() {
    try {
        console.log('🧹 Clearing all Ninety.io data...');
        
        const dataDir = path.join(__dirname, 'data');
        const filesToClear = [
            'ninety_todos.json',
            'ninety_rocks.json',
            'ninety_issues.json',
            'ninety_data.json',
            'ninety-upload-history.json'
        ];
        
        for (const fileName of filesToClear) {
            const filePath = path.join(dataDir, fileName);
            if (fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, '[]');
                console.log(`✅ Cleared ${fileName}`);
            }
        }
        
        console.log('✅ All Ninety.io data cleared');
    } catch (error) {
        console.error('❌ Error clearing data:', error);
        throw error;
    }
}

async function logNinetyUploadHistory(uploadData) {
    try {
        // Use file-based storage instead of database for upload history
        const historyFile = path.join(__dirname, 'data', 'ninety-upload-history.json');
        let history = [];
        
        if (fs.existsSync(historyFile)) {
            history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        }
        
        const newEntry = {
            id: Date.now().toString(),
            filename: uploadData.filename,
            originalFilename: uploadData.originalFilename,
            dataType: uploadData.dataType,
            fileSize: uploadData.fileSize,
            recordsProcessed: uploadData.recordsProcessed,
            recordsSaved: uploadData.recordsSaved,
            success: uploadData.success,
            errorMessage: uploadData.errorMessage,
            uploadDate: new Date().toISOString()
        };
        
        history.unshift(newEntry);
        
        // Keep only last 50 entries
        if (history.length > 50) {
            history = history.slice(0, 50);
        }
        
        fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
        console.log('✅ Upload history logged to file');
    } catch (error) {
        console.error('❌ Error logging upload history:', error);
    }
}

initializeApp(); 