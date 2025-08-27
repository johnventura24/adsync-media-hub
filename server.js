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
let dataService, tableauIntegration, dailyDataTracker;

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
    tableauIntegration = require('./tableau-integration');
    console.log('✅ Tableau integration layer loaded');
} catch (error) {
    console.warn('⚠️ Tableau integration layer not available:', error.message);
    tableauIntegration = null;
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
console.log('Admin.html exists at:', path.join(publicPath, 'admin.html'), fs.existsSync(path.join(publicPath, 'admin.html')));

if (fs.existsSync(publicPath)) {
  console.log('Using public directory for static files');
  console.log('Files in public directory:', fs.readdirSync(publicPath));
  
  // Configure static files with proper serving
  app.use(express.static(publicPath, {
    index: false,  // Don't serve directory indexes
    setHeaders: (res, filePath) => {
      console.log('Serving static file:', filePath);
      // Don't cache admin.html
      if (filePath.endsWith('admin.html')) {
        res.set('Cache-Control', 'no-cache');
      }
    }
  }));
} else {
  console.log('Public directory not found, serving static files from root directory');
  // Serve specific static files from root, excluding server files
  app.use('/dashboard.js', express.static(path.join(__dirname, 'dashboard.js')));
  app.use('/styles.css', express.static(path.join(__dirname, 'styles.css')));
  
  // Serve data files for testing
  app.use('/data', express.static(path.join(__dirname, 'data')));
}

// Initialize dashboard data (will be replaced with live data)
let dashboardData = {};

// Helper function to handle file-based auth queries
function getFileBasedAuthData() {
    const path = require('path');
    const fs = require('fs');
    const authFile = path.join(__dirname, 'data', 'auth.json');
    if (fs.existsSync(authFile)) {
        return JSON.parse(fs.readFileSync(authFile, 'utf8'));
    }
    return { users: [], teams: [], team_members: [], nextUserId: 1, nextTeamId: 1 };
}

function isUsingFileBasedAuth() {
    const dbConfigured = process.env.DATABASE_URL || (process.env.PG_HOST && process.env.PG_DATABASE && process.env.PG_USER);
    return !dbConfigured;
}

// Generate admin.html content dynamically if file doesn't exist
function generateAdminHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Adsync Media Hub</title>
    <link rel="stylesheet" href="/styles.css">
    <style>
        .admin-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .auth-form {
            max-width: 400px;
            margin: 100px auto;
            padding: 30px;
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #333;
        }
        .form-group input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        .btn-primary {
            background: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
        }
        .btn-primary:hover {
            background: #0056b3;
        }
        .notification {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            display: none;
        }
        .notification.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .notification.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .admin-panel {
            display: none;
        }
        .admin-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }
        .users-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .users-table th, .users-table td {
            padding: 12px;
            border: 1px solid #ddd;
            text-align: left;
        }
        .users-table th {
            background: #f8f9fa;
            font-weight: bold;
        }
        .btn-sm {
            padding: 5px 10px;
            font-size: 12px;
            margin: 2px;
        }
        .btn-danger {
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        .btn-warning {
            background: #ffc107;
            color: #212529;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        .btn-secondary {
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="admin-container">
        <!-- Authentication Form -->
        <div id="auth-container" class="auth-form">
            <h2>Admin Login</h2>
            <form id="admin-login-form">
                <div class="form-group">
                    <label for="admin-email">Email</label>
                    <input type="email" id="admin-email" required>
                </div>
                <div class="form-group">
                    <label for="admin-password">Password</label>
                    <input type="password" id="admin-password" required>
                </div>
                <div class="form-buttons">
                    <button type="submit" class="btn-primary">Login</button>
                </div>
            </form>
            <div id="auth-notification" class="notification"></div>
        </div>

        <!-- Admin Panel -->
        <div id="admin-panel" class="admin-panel">
            <div class="admin-header">
                <div>
                    <h1>Admin Panel</h1>
                    <p id="admin-user-info">Welcome, Admin</p>
                </div>
                <button id="logout-btn" class="btn-secondary">Logout</button>
            </div>

            <div class="admin-content">
                <h2>User Management</h2>
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="users-table-body">
                        <tr>
                            <td colspan="5">Loading users...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        let currentUser = null;
        let authToken = localStorage.getItem('adminToken');

        // Check if already logged in
        if (authToken) {
            checkAuthStatus();
        }

        async function checkAuthStatus() {
            if (authToken) {
                try {
                    const response = await fetch('/api/auth/me', {
                        headers: {
                            'Authorization': \`Bearer \${authToken}\`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.user.role === 'admin' || data.user.role === 'owner') {
                            currentUser = data.user;
                            showAdminPanel();
                        } else {
                            showNotification('Access denied. Admin privileges required.', 'error');
                            localStorage.removeItem('adminToken');
                        }
                    } else {
                        localStorage.removeItem('adminToken');
                    }
                } catch (error) {
                    console.error('Auth check failed:', error);
                    localStorage.removeItem('adminToken');
                }
            }
        }

        document.getElementById('admin-login-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (data.user.role === 'admin' || data.user.role === 'owner') {
                        currentUser = data.user;
                        authToken = data.token;
                        localStorage.setItem('adminToken', data.token);
                        showAdminPanel();
                    } else {
                        showNotification('Access denied. Admin privileges required.', 'error');
                    }
                } else {
                    showNotification(data.message, 'error');
                }
            } catch (error) {
                console.error('Login error:', error);
                showNotification('Login failed. Please try again.', 'error');
            }
        });

        function showAdminPanel() {
            document.getElementById('auth-container').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
            document.getElementById('admin-user-info').textContent = \`Welcome, \${currentUser.firstName} \${currentUser.lastName}\`;
            loadUsers();
        }

        async function loadUsers() {
            try {
                const response = await fetch('/api/admin/users', {
                    headers: {
                        'Authorization': \`Bearer \${authToken}\`
                    }
                });
                
                if (response.ok) {
                    const users = await response.json();
                    displayUsers(users);
                } else {
                    console.error('Failed to load users');
                }
            } catch (error) {
                console.error('Error loading users:', error);
            }
        }

        function displayUsers(users) {
            const tbody = document.getElementById('users-table-body');
            tbody.innerHTML = '';
            
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = \`
                    <td>\${user.first_name} \${user.last_name}</td>
                    <td>\${user.email}</td>
                    <td>\${user.role}</td>
                    <td>\${user.is_active ? 'Active' : 'Inactive'}</td>
                    <td>
                        <button class="btn-sm btn-warning" onclick="resetPassword('\${user.id}')">Reset Password</button>
                        <button class="btn-sm btn-secondary" onclick="toggleUserStatus('\${user.id}', \${user.is_active})">\${user.is_active ? 'Deactivate' : 'Activate'}</button>
                    </td>
                \`;
                tbody.appendChild(row);
            });
        }

        async function resetPassword(userId) {
            if (!confirm('Are you sure you want to reset this user\\'s password?')) {
                return;
            }
            
            try {
                const response = await fetch(\`/api/admin/users/\${userId}/reset-password\`, {
                    method: 'POST',
                    headers: {
                        'Authorization': \`Bearer \${authToken}\`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    alert(\`Password reset successfully. New password: \${data.newPassword}\`);
                } else {
                    alert('Failed to reset password');
                }
            } catch (error) {
                console.error('Error resetting password:', error);
                alert('Error resetting password');
            }
        }

        async function toggleUserStatus(userId, currentStatus) {
            try {
                const response = await fetch(\`/api/admin/users/\${userId}\`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': \`Bearer \${authToken}\`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ is_active: !currentStatus })
                });
                
                if (response.ok) {
                    loadUsers(); // Refresh the user list
                } else {
                    alert('Failed to update user status');
                }
            } catch (error) {
                console.error('Error updating user status:', error);
                alert('Error updating user status');
            }
        }

        document.getElementById('logout-btn').addEventListener('click', function() {
            localStorage.removeItem('adminToken');
            currentUser = null;
            authToken = null;
            document.getElementById('auth-container').style.display = 'block';
            document.getElementById('admin-panel').style.display = 'none';
            document.getElementById('admin-login-form').reset();
        });

        function showNotification(message, type = 'info') {
            const notification = document.getElementById('auth-notification');
            notification.textContent = message;
            notification.className = \`notification \${type}\`;
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 5000);
        }
    </script>
</body>
</html>`;
}

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

// Serve admin panel - multiple routes for maximum compatibility
app.get('/admin', (req, res) => {
    console.log('Admin route accessed - serving admin.html directly');
    const adminPath = path.join(__dirname, 'public', 'admin.html');
    
    try {
        if (fs.existsSync(adminPath)) {
            // Read the file directly and serve it
            const adminContent = fs.readFileSync(adminPath, 'utf8');
            res.setHeader('Content-Type', 'text/html');
            res.send(adminContent);
        } else {
            console.log('Admin.html not found at:', adminPath, '- generating dynamically');
            // Generate admin.html content dynamically
            const adminContent = generateAdminHtml();
            res.setHeader('Content-Type', 'text/html');
            res.send(adminContent);
        }
    } catch (error) {
        console.error('Error serving admin panel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/admin.html', (req, res) => {
    console.log('Admin.html route accessed - serving directly');
    const adminPath = path.join(__dirname, 'public', 'admin.html');
    
    try {
        if (fs.existsSync(adminPath)) {
            // Read the file directly and serve it
            const adminContent = fs.readFileSync(adminPath, 'utf8');
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Cache-Control', 'no-cache');
            res.send(adminContent);
        } else {
            console.log('Admin.html not found at:', adminPath, '- generating dynamically');
            // Generate admin.html content dynamically
            const adminContent = generateAdminHtml();
            res.setHeader('Content-Type', 'text/html');
            res.setHeader('Cache-Control', 'no-cache');
            res.send(adminContent);
        }
    } catch (error) {
        console.error('Error serving admin.html:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Additional admin routes for debugging
app.get('/admin-panel', (req, res) => {
    const adminPath = path.join(__dirname, 'public', 'admin.html');
    if (fs.existsSync(adminPath)) {
        res.sendFile(adminPath);
    } else {
        res.status(404).json({ error: 'Admin panel not found' });
    }
});

// Raw admin file content for testing
app.get('/admin-raw', (req, res) => {
    const adminPath = path.join(__dirname, 'public', 'admin.html');
    
    try {
        if (fs.existsSync(adminPath)) {
            const adminContent = fs.readFileSync(adminPath, 'utf8');
            res.setHeader('Content-Type', 'text/plain');
            res.send(adminContent);
        } else {
            res.status(404).send('Admin.html file not found');
        }
    } catch (error) {
        res.status(500).send('Error reading admin.html: ' + error.message);
    }
});

// Debug route to check file existence
app.get('/debug-admin', (req, res) => {
    const adminPath = path.join(__dirname, 'public', 'admin.html');
    const publicPath = path.join(__dirname, 'public');
    
    try {
        let adminContent = '';
        let adminSize = 0;
        let fileReadable = false;
        
        if (fs.existsSync(adminPath)) {
            try {
                const stats = fs.statSync(adminPath);
                adminSize = stats.size;
                adminContent = fs.readFileSync(adminPath, 'utf8').substring(0, 100);
                fileReadable = true;
            } catch (readError) {
                console.error('Error reading admin.html:', readError);
            }
        }
        
        res.json({
            adminPath,
            adminExists: fs.existsSync(adminPath),
            adminSize,
            fileReadable,
            adminPreview: adminContent,
            publicPath,
            publicExists: fs.existsSync(publicPath),
            publicContents: fs.existsSync(publicPath) ? fs.readdirSync(publicPath) : 'Directory not found',
            workingDirectory: __dirname,
            nodeVersion: process.version,
            platform: process.platform
        });
    } catch (error) {
        res.status(500).json({
            error: 'Debug failed',
            message: error.message
        });
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

// Dashboard data endpoint (Fixed to ensure Tableau data is included)
app.get('/api/dashboard', 
    authMiddleware.requireAuth, 
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.VIEW_ANALYTICS),
    async (req, res) => {
        try {
            console.log('📊 Dashboard API called, fetching comprehensive data...');
            
            // Get fresh dashboard data including Tableau integration
            const dashboardData = await dataService.getAllDashboardData();
            
            console.log('🔍 Dashboard data check:', {
                hasGoogle: !!dashboardData.google,
                hasFacebook: !!dashboardData.facebook,
                hasRevenueFunnel: !!dashboardData.revenueFunnel,
                hasPlatformComparison: !!dashboardData.platformComparison,
                keys: Object.keys(dashboardData)
            });
            
            // If no Tableau data, try to get fresh data
            if (!dashboardData.google && !dashboardData.facebook) {
                console.log('⚠️ No platform data found, attempting fresh Tableau extraction...');
                
                try {
                    if (tableauIntegration) {
                        const freshTableauData = await tableauIntegration.getFreshData();
                        
                        if (freshTableauData) {
                            // Merge fresh Tableau data into dashboard data
                            Object.assign(dashboardData, {
                                google: freshTableauData.google,
                                facebook: freshTableauData.facebook,
                                platformComparison: freshTableauData.platformComparison,
                                extractionInfo: freshTableauData.extractionInfo,
                                lastUpdated: new Date().toISOString()
                            });
                            
                            console.log('✅ Fresh Tableau data integrated into dashboard');
                        }
                    }
                } catch (tableauError) {
                    console.error('⚠️ Fresh Tableau extraction failed:', tableauError.message);
                }
            }
            
            // Filter dashboard data by team if not an admin
            let responseData = dashboardData;
            if (req.user.role !== 'admin' && req.teamId) {
                responseData = {
                    ...dashboardData,
                    teamId: req.teamId,
                    userId: req.user.id
                };
            }
            
            console.log('📤 Sending dashboard data to client:', {
                google: !!responseData.google,
                facebook: !!responseData.facebook,
                revenueFunnel: !!responseData.revenueFunnel
            });
            
            res.json(responseData);
            
        } catch (error) {
            console.error('❌ Dashboard API error:', error);
            res.status(500).json({
                error: 'Failed to load dashboard data',
                message: error.message
            });
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
            console.log('🔧 Initializing database connections...');
            await dataService.initialize();
            
            // Verify dataService has query method
            if (typeof dataService.query === 'function') {
                console.log('✅ DataService query method available');
            } else {
                console.error('❌ DataService query method not available');
                console.log('DataService methods:', Object.getOwnPropertyNames(dataService));
            }
            
            // Set up database connection for authentication routes
            app.locals.db = dataService;
            
            // Initialize authentication with proper database connection
            initializeAuth(dataService);
            authMiddleware.initialize(dataService);
            
            // Update admin credentials on startup
            await updateAdminCredentials();
            
            console.log('✅ Authentication system initialized');
        } else {
            console.warn('⚠️ Authentication system not initialized - database service not available');
        }
    } catch (error) {
        console.error('❌ Authentication initialization error:', error);
    }
}

// Update admin credentials function
async function updateAdminCredentials() {
    try {
        console.log('🔧 Updating admin credentials...');
        
        // Check if dataService has query method
        if (typeof dataService.query !== 'function') {
            console.error('❌ DataService query method not available, skipping admin credentials update');
            return;
        }
        
        // Check if admin user exists
        const existingUser = await dataService.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            ['ventura@adsyncmedia.com', 'ventura']
        );
        
        const adminHash = '$2b$10$VM.C9r66VlGm5n2I19WdaeP.p4bW6pvFyFOEmrQZIXjw9D52DUDkm';
        
        if (existingUser.rows.length > 0) {
            // Update existing admin user
            await dataService.query(`
                UPDATE users SET 
                    username = 'ventura',
                    email = 'ventura@adsyncmedia.com',
                    password_hash = $1,
                    first_name = 'Ventura',
                    last_name = 'Admin',
                    role = 'admin',
                    is_active = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE email = 'admin@example.com' OR username = 'admin' OR email = 'ventura@adsyncmedia.com'
            `, [adminHash]);
            
            console.log('✅ Admin credentials updated successfully');
        } else {
            // Create new admin user
            await dataService.query(`
                INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active) 
                VALUES ('ventura', 'ventura@adsyncmedia.com', $1, 'Ventura', 'Admin', 'admin', TRUE)
                ON CONFLICT (email) DO UPDATE SET
                    username = EXCLUDED.username,
                    password_hash = EXCLUDED.password_hash,
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    role = EXCLUDED.role,
                    is_active = EXCLUDED.is_active,
                    updated_at = CURRENT_TIMESTAMP
            `, [adminHash]);
            
            console.log('✅ Admin user created successfully');
        }
        
        console.log('🎯 Admin credentials set: ventura@adsyncmedia.com / Jventura1234!');
    } catch (error) {
        console.error('❌ Error updating admin credentials:', error);
        
        // Fallback: Try direct PostgreSQL connection if available
        try {
            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL
            });
            
            console.log('🔄 Attempting direct PostgreSQL connection...');
            
            // Check if admin user exists
            const existingUser = await pool.query(
                'SELECT id FROM users WHERE email = $1 OR username = $2',
                ['ventura@adsyncmedia.com', 'ventura']
            );
            
            const adminHash = '$2b$10$VM.C9r66VlGm5n2I19WdaeP.p4bW6pvFyFOEmrQZIXjw9D52DUDkm';
            
            if (existingUser.rows.length > 0) {
                // Update existing admin user
                await pool.query(`
                    UPDATE users SET 
                        username = 'ventura',
                        email = 'ventura@adsyncmedia.com',
                        password_hash = $1,
                        first_name = 'Ventura',
                        last_name = 'Admin',
                        role = 'admin',
                        is_active = TRUE,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE email = 'admin@example.com' OR username = 'admin' OR email = 'ventura@adsyncmedia.com'
                `, [adminHash]);
                
                console.log('✅ Admin credentials updated via direct connection');
            } else {
                // Create new admin user
                await pool.query(`
                    INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active) 
                    VALUES ('ventura', 'ventura@adsyncmedia.com', $1, 'Ventura', 'Admin', 'admin', TRUE)
                    ON CONFLICT (email) DO UPDATE SET
                        username = EXCLUDED.username,
                        password_hash = EXCLUDED.password_hash,
                        first_name = EXCLUDED.first_name,
                        last_name = EXCLUDED.last_name,
                        role = EXCLUDED.role,
                        is_active = EXCLUDED.is_active,
                        updated_at = CURRENT_TIMESTAMP
                `, [adminHash]);
                
                console.log('✅ Admin user created via direct connection');
            }
            
            await pool.end();
            console.log('🎯 Admin credentials set: ventura@adsyncmedia.com / Jventura1234!');
        } catch (fallbackError) {
            console.error('❌ Direct connection fallback failed:', fallbackError);
        }
    }
}

// Authentication routes
app.use('/api/auth', authRoutes);

// ============================================================================
// ADMIN ROUTES - USER MANAGEMENT
// ============================================================================

// Test endpoint to verify admin credentials
app.get('/api/test-admin', async (req, res) => {
    try {
        console.log('Testing admin credentials...');
        
        // Test database connection
        const result = await dataService.query('SELECT id, username, email, role FROM users WHERE email = $1', ['ventura@adsyncmedia.com']);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.json({
                success: true,
                message: 'Admin user found',
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            res.json({
                success: false,
                message: 'Admin user not found in database'
            });
        }
    } catch (error) {
        console.error('Test admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection error: ' + error.message
        });
    }
});

// Manual admin credentials update endpoint
app.post('/api/setup-admin', async (req, res) => {
    try {
        console.log('🔧 Manual admin credentials setup...');
        await updateAdminCredentials();
        res.json({
            success: true,
            message: 'Admin credentials updated successfully',
            credentials: {
                email: 'ventura@adsyncmedia.com',
                password: 'Jventura1234!'
            }
        });
    } catch (error) {
        console.error('Manual admin setup error:', error);
        res.status(500).json({
            success: false,
            message: 'Admin setup failed: ' + error.message
        });
    }
});

// Test login endpoint
app.post('/api/test-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }
        
        console.log('🧪 Testing login for:', email);
        
        // Test authentication
        const loginResult = await authMiddleware.loginUser(email, password);
        
        res.json({
            success: true,
            message: 'Login test successful',
            user: loginResult.user,
            hasToken: !!loginResult.token
        });
    } catch (error) {
        console.error('Test login error:', error);
        res.status(401).json({
            success: false,
            message: 'Login test failed: ' + error.message
        });
    }
});

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
            // Use file-based authentication if database is not available
            if (isUsingFileBasedAuth()) {
                const data = getFileBasedAuthData();
                const usersWithTeamCount = data.users.map(user => {
                    const teamCount = data.team_members.filter(tm => tm.user_id === user.id).length;
                    return {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        role: user.role,
                        isActive: user.is_active,
                        createdAt: user.created_at,
                        lastLogin: user.last_login,
                        teamCount: teamCount
                    };
                }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                
                res.json({
                    success: true,
                    users: usersWithTeamCount
                });
                return;
            }
            
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
            const { username, email, firstName, lastName, role, isActive } = req.body;
            
            // Validate role if provided
            if (role && !['admin', 'owner', 'member'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role specified'
                });
            }
            
            // Use file-based authentication if database is not available
            if (isUsingFileBasedAuth()) {
                const data = getFileBasedAuthData();
                
                const userIndex = data.users.findIndex(u => u.id === parseInt(userId));
                if (userIndex === -1) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }
                
                // Check for duplicate email/username if they're being changed
                if ((email && email !== data.users[userIndex].email) || (username && username !== data.users[userIndex].username)) {
                    const existingUser = data.users.find(u =>
                        ((u.email === email) || (u.username === username)) && u.id !== parseInt(userId)
                    );
                    if (existingUser) {
                        return res.status(400).json({
                            success: false,
                            message: 'Email or username already exists'
                        });
                    }
                }
                
                const user = data.users[userIndex];
                if (username !== undefined) user.username = username;
                if (email !== undefined) user.email = email;
                if (firstName !== undefined) user.first_name = firstName;
                if (lastName !== undefined) user.last_name = lastName;
                if (role !== undefined) user.role = role;
                if (isActive !== undefined) user.is_active = isActive;
                user.updated_at = new Date().toISOString();
                
                saveFileBasedAuthData(data);
                
                return res.json({
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
            }
            
            // Check for existing email/username if they're being changed
            if (username || email) {
                const checkQuery = `
                    SELECT id FROM users 
                    WHERE (email = $1 OR username = $2) AND id != $3
                `;
                const existingUser = await dataService.query(checkQuery, [email, username, userId]);
                
                if (existingUser.rows.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email or username already exists'
                    });
                }
            }
            
            // Update user
            const result = await dataService.query(`
                UPDATE users 
                SET username = COALESCE($1, username),
                    email = COALESCE($2, email),
                    first_name = COALESCE($3, first_name),
                    last_name = COALESCE($4, last_name),
                    role = COALESCE($5, role), 
                    is_active = COALESCE($6, is_active),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7 
                RETURNING id, username, email, first_name, last_name, role, is_active
            `, [username, email, firstName, lastName, role, isActive, userId]);
            
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
      if (tableauIntegration) {
        console.log('🔍 Fetching dates from Tableau dashboard...');
        const tableauDates = await tableauIntegration.getAvailableDates();
        
        if (tableauDates && tableauDates.length > 0) {
          tableauDates.forEach(date => allDates.add(date));
          console.log(`✅ Found ${tableauDates.length} dates in Tableau dashboard`);
        } else {
          console.log('⚠️ No dates found in Tableau dashboard');
        }
      } else {
        console.log('⚠️ Tableau integration layer not available');
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
        if (tableauIntegration) {
          const tableauData = await tableauIntegration.extractDataForDate(date);
          
          if (tableauData) {
            dayData = tableauData;
            console.log(`✅ Successfully fetched Tableau data for ${date}`);
          } else {
            console.log(`⚠️ No Tableau data found for ${date}`);
          }
        } else {
          console.log(`⚠️ Tableau integration layer not available for ${date}`);
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
        if (tableauIntegration) {
            freshTableauData = await tableauIntegration.getComprehensivePlatformData();
            console.log('✅ Fresh comprehensive Tableau data retrieved via integration layer');
        } else {
            console.log('⚠️ Tableau integration layer not available, using fallback data');
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
      result.availableDates = await tableauIntegration.getAvailableDates();
      console.log(`✅ DEBUG: Found ${result.availableDates.length} available dates`);
    } catch (error) {
      result.errors.push(`Available dates error: ${error.message}`);
    }
    
    // Test extracting data for specific date
    try {
      result.extractedData = await tableauIntegration.extractDataForDate(testDate);
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

// Configure multer for Ninety.io file uploads
const ninetyUpload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadsDir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, 'ninety-' + req.body.dataType + '-' + uniqueSuffix + ext);
        }
    }),
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Upload and process Ninety.io Excel files
app.post('/api/admin/ninety/upload', 
    authMiddleware.requireAuth,
    requireAdmin,
    ninetyUpload.single('excelFile'),
    async (req, res) => {
        try {
            const { dataType } = req.body;
            const file = req.file;
            
            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }
            
            if (!['scorecard', 'rocks', 'todos', 'issues'].includes(dataType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid data type. Must be one of: scorecard, rocks, todos, issues'
                });
            }
            
            console.log(`📊 Processing Ninety.io ${dataType} upload: ${file.originalname}`);
            
            // Process the Excel file
            const XLSX = require('xlsx');
            const workbook = XLSX.readFile(file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            if (jsonData.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Excel file appears to be empty or invalid'
                });
            }
            
            // Process data based on type
            const processedData = processNinetyExcelData(jsonData, dataType);
            
            // Save to appropriate data store
            let savedCount = 0;
            
            if (isUsingFileBasedAuth()) {
                // Save to JSON files
                savedCount = await saveNinetyDataToFiles(processedData, dataType);
            } else {
                // Save to database
                savedCount = await saveNinetyDataToDatabase(processedData, dataType, req.user.id);
            }
            
            // Log the upload
            await logNinetyUpload(file, dataType, jsonData.length, savedCount, req.user.id);
            
            // Clean up uploaded file
            fs.unlinkSync(file.path);
            
            res.json({
                success: true,
                message: `Successfully processed ${savedCount} ${dataType} records`,
                recordsProcessed: jsonData.length,
                recordsSaved: savedCount,
                dataType: dataType
            });
            
        } catch (error) {
            console.error('Ninety.io upload error:', error);
            
            // Clean up uploaded file on error
            if (req.file && req.file.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (cleanupError) {
                    console.error('Error cleaning up file:', cleanupError);
                }
            }
            
            res.status(500).json({
                success: false,
                message: 'Failed to process upload: ' + error.message
            });
        }
    }
);

// Get all Ninety.io data
app.get('/api/admin/ninety/data',
    authMiddleware.requireAuth,
    requireAdmin,
    async (req, res) => {
        try {
            let data = {
                rocks: [],
                todos: [],
                issues: [],
                scorecard: []
            };
            
            if (isUsingFileBasedAuth()) {
                // Load from JSON files
                data = await loadNinetyDataFromFiles();
            } else {
                // Load from database
                data = await loadNinetyDataFromDatabase();
            }
            
            res.json(data);
            
        } catch (error) {
            console.error('Error loading Ninety.io data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to load data: ' + error.message
            });
        }
    }
);

// Delete a specific Ninety.io item
app.delete('/api/admin/ninety/:dataType/:itemId',
    authMiddleware.requireAuth,
    requireAdmin,
    async (req, res) => {
        try {
            const { dataType, itemId } = req.params;
            
            if (!['scorecard', 'rocks', 'todos', 'issues'].includes(dataType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid data type'
                });
            }
            
            let success = false;
            
            if (isUsingFileBasedAuth()) {
                success = await deleteNinetyItemFromFiles(dataType, itemId);
            } else {
                success = await deleteNinetyItemFromDatabase(dataType, itemId);
            }
            
            if (success) {
                res.json({
                    success: true,
                    message: 'Item deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }
            
        } catch (error) {
            console.error('Error deleting Ninety.io item:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete item: ' + error.message
            });
        }
    }
);

// Update a specific Ninety.io item
app.put('/api/admin/ninety/:dataType/:itemId',
    authMiddleware.requireAuth,
    requireAdmin,
    async (req, res) => {
        try {
            const { dataType, itemId } = req.params;
            const updateData = req.body;
            
            if (!['scorecard', 'rocks', 'todos', 'issues'].includes(dataType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid data type'
                });
            }
            
            // Add updated timestamp
            updateData.updated_date = new Date().toISOString();
            
            let success = false;
            
            if (isUsingFileBasedAuth()) {
                success = await updateNinetyItemInFiles(dataType, itemId, updateData);
            } else {
                success = await updateNinetyItemInDatabase(dataType, itemId, updateData);
            }
            
            if (success) {
                res.json({
                    success: true,
                    message: 'Item updated successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }
            
        } catch (error) {
            console.error('Error updating Ninety.io item:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update item: ' + error.message
            });
        }
    }
);

// Create a new Ninety.io item
app.post('/api/admin/ninety/:dataType',
    authMiddleware.requireAuth,
    requireAdmin,
    async (req, res) => {
        try {
            const { dataType } = req.params;
            const itemData = req.body;
            
            if (!['scorecard', 'rocks', 'todos', 'issues'].includes(dataType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid data type'
                });
            }
            
            // Generate new item
            const newItem = {
                id: `${dataType}_${Date.now()}_${Math.round(Math.random() * 1000)}`,
                ...itemData,
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString()
            };
            
            let success = false;
            
            if (isUsingFileBasedAuth()) {
                success = await addNinetyItemToFiles(dataType, newItem);
            } else {
                success = await addNinetyItemToDatabase(dataType, newItem, req.user.id);
            }
            
            if (success) {
                res.json({
                    success: true,
                    message: 'Item created successfully',
                    item: newItem
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to create item'
                });
            }
            
        } catch (error) {
            console.error('Error creating Ninety.io item:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create item: ' + error.message
            });
        }
    }
);

// Update status for Rocks, To-Dos, and Issues from main dashboard (NEW)
app.put('/api/ninety-data/:dataType/:itemId/status',
    authMiddleware.requireAuth,
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.READ),
    async (req, res) => {
        try {
            const { dataType, itemId } = req.params;
            const { status, department } = req.body;
            
            if (!['rocks', 'todos', 'issues'].includes(dataType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid data type. Must be one of: rocks, todos, issues'
                });
            }
            
            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Status is required'
                });
            }
            
            console.log(`🔄 Updating ${dataType} item ${itemId} status to ${status}${department ? ` for department ${department}` : ''}`);
            
            let success = false;
            
            if (isUsingFileBasedAuth()) {
                success = await updateNinetyItemInFiles(dataType, itemId, { status, ...(department && { department }) });
            } else {
                success = await updateNinetyItemInDatabase(dataType, itemId, { status, ...(department && { department }) });
            }
            
            if (success) {
                res.json({
                    success: true,
                    message: `${dataType} status updated successfully`,
                    data: { status, ...(department && { department }) }
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Item not found'
                });
            }
            
        } catch (error) {
            console.error('Error updating status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update status: ' + error.message
            });
        }
    }
);

// Department Management API Endpoints (NEW)
app.get('/api/admin/departments',
    authMiddleware.requireAuth,
    requireAdmin,
    async (req, res) => {
        try {
            let departments = [];
            
            if (isUsingFileBasedAuth()) {
                departments = await loadDepartmentsFromFiles();
            } else {
                departments = await loadDepartmentsFromDatabase();
            }
            
            res.json({
                success: true,
                departments: departments
            });
            
        } catch (error) {
            console.error('Error loading departments:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to load departments: ' + error.message
            });
        }
    }
);

app.post('/api/admin/departments',
    authMiddleware.requireAuth,
    requireAdmin,
    async (req, res) => {
        try {
            const { name, description, manager, status } = req.body;
            
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Department name is required'
                });
            }
            
            const newDepartment = {
                id: `dept_${Date.now()}_${Math.round(Math.random() * 1000)}`,
                name,
                description: description || '',
                manager: manager || '',
                status: status || 'active',
                created_date: new Date().toISOString(),
                updated_date: new Date().toISOString()
            };
            
            let success = false;
            
            if (isUsingFileBasedAuth()) {
                success = await saveDepartmentToFiles(newDepartment);
            } else {
                success = await saveDepartmentToDatabase(newDepartment, req.user.id);
            }
            
            if (success) {
                res.json({
                    success: true,
                    message: 'Department created successfully',
                    department: newDepartment
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to create department'
                });
            }
            
        } catch (error) {
            console.error('Error creating department:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create department: ' + error.message
            });
        }
    }
);

app.put('/api/admin/departments/:deptId',
    authMiddleware.requireAuth,
    requireAdmin,
    async (req, res) => {
        try {
            const { deptId } = req.params;
            const updateData = req.body;
            
            updateData.updated_date = new Date().toISOString();
            
            let success = false;
            
            if (isUsingFileBasedAuth()) {
                success = await updateDepartmentInFiles(deptId, updateData);
            } else {
                success = await updateDepartmentInDatabase(deptId, updateData);
            }
            
            if (success) {
                res.json({
                    success: true,
                    message: 'Department updated successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Department not found'
                });
            }
            
        } catch (error) {
            console.error('Error updating department:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update department: ' + error.message
            });
        }
    }
);

app.delete('/api/admin/departments/:deptId',
    authMiddleware.requireAuth,
    requireAdmin,
    async (req, res) => {
        try {
            const { deptId } = req.params;
            
            let success = false;
            
            if (isUsingFileBasedAuth()) {
                success = await deleteDepartmentFromFiles(deptId);
            } else {
                success = await deleteDepartmentFromDatabase(deptId);
            }
            
            if (success) {
                res.json({
                    success: true,
                    message: 'Department deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Department not found'
                });
            }
            
        } catch (error) {
            console.error('Error deleting department:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete department: ' + error.message
            });
        }
    }
);

// ============================================================================
// NINETY.IO DATA PROCESSING FUNCTIONS
// ============================================================================

function processNinetyExcelData(jsonData, dataType) {
    console.log(`📊 Processing ${jsonData.length} Excel rows for ${dataType}`);
    
    const processedData = [];
    
    jsonData.forEach((row, index) => {
        const id = `${dataType}_${Date.now()}_${index}`;
        const now = new Date().toISOString();
        
        switch (dataType) {
            case 'todos':
                processedData.push({
                    id,
                    title: row.Title || row.title || row.Task || row.task || row.ToDo || row.todo || row.To_Do || row.Description || `Todo ${index + 1}`,
                    description: row.Description || row.description || row.Notes || row.notes || row.Details || row.details || '',
                    owner: row.Owner || row.owner || row.Assignee || row.assignee || row.ResponsiblePerson || row.responsible_person || row['Responsible Person'] || '',
                    status: row.Status || row.status || row.State || row.state || 'Open',
                    priority: row.Priority || row.priority || 'Medium',
                    dueDate: parseDateFromExcel(row.DueDate || row.dueDate || row.Due || row.due || row['Due Date'] || row.Deadline || row.deadline),
                    created_date: now,
                    updated_date: now
                });
                break;
                
            case 'rocks':
                processedData.push({
                    id,
                    title: row.Title || row.title || row.Rock || row.rock || row.Goal || row.goal || row.Objective || row.objective || `Rock ${index + 1}`,
                    description: row.Description || row.description || row.Notes || row.notes || row.Details || row.details || '',
                    owner: row.Owner || row.owner || row.Assignee || row.assignee || row.ResponsiblePerson || row.responsible_person || row['Responsible Person'] || '',
                    status: row.Status || row.status || row.State || row.state || 'Open',
                    progress: parseProgressFromExcel(row.Progress || row.progress || row.Completion || row.completion || row['% Complete'] || row.Percent || 0),
                    dueDate: parseDateFromExcel(row.DueDate || row.dueDate || row.Due || row.due || row['Due Date'] || row.Deadline || row.deadline),
                    created_date: now,
                    updated_date: now
                });
                break;
                
            case 'issues':
                processedData.push({
                    id,
                    title: row.Title || row.title || row.Issue || row.issue || row.Problem || row.problem || row.Description || `Issue ${index + 1}`,
                    description: row.Description || row.description || row.Notes || row.notes || row.Details || row.details || '',
                    owner: row.Owner || row.owner || row.Assignee || row.assignee || row.ResponsiblePerson || row.responsible_person || row['Responsible Person'] || '',
                    status: row.Status || row.status || row.State || row.state || 'Open',
                    priority: row.Priority || row.priority || 'Medium',
                    created_date: parseDateFromExcel(row.CreatedDate || row.created_date || row.Created || row.created || row['Created Date']) || now,
                    updated_date: now,
                    is_resolved: (row.Status || row.status || '').toLowerCase().includes('resolved') || (row.Status || row.status || '').toLowerCase().includes('closed')
                });
                break;
                
            case 'scorecard':
                processedData.push({
                    id,
                    title: row.Title || row.title || row.Metric || row.metric || row.Name || row.name || row.KPI || row.kpi || `Metric ${index + 1}`,
                    description: row.Description || row.description || row.Notes || row.notes || '',
                    type: row.Type || row.type || row.Category || row.category || 'General',
                    value: row.Value || row.value || row.Current || row.current || row.Actual || row.actual || '',
                    target: row.Target || row.target || row.Goal || row.goal || '',
                    owner: row.Owner || row.owner || row.ResponsiblePerson || row.responsible_person || row['Responsible Person'] || '',
                    category: row.Category || row.category || row.Type || row.type || 'General',
                    created_date: now,
                    updated_date: now,
                    is_active: true
                });
                break;
        }
    });
    
    console.log(`✅ Processed ${processedData.length} ${dataType} items`);
    return processedData;
}

function parseDateFromExcel(dateValue) {
    if (!dateValue) return null;
    
    // Handle Excel date serial numbers
    if (typeof dateValue === 'number') {
        const date = new Date((dateValue - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    
    // Handle date strings
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    return null;
}

function parseProgressFromExcel(progressValue) {
    if (typeof progressValue === 'number') {
        return Math.min(100, Math.max(0, Math.round(progressValue)));
    }
    
    const numStr = String(progressValue).replace(/[^\d.-]/g, '');
    const num = parseFloat(numStr);
    
    if (!isNaN(num)) {
        return Math.min(100, Math.max(0, Math.round(num)));
    }
    
    return 0;
}

// File-based data management functions
async function saveNinetyDataToFiles(processedData, dataType) {
    const filePath = path.join(__dirname, 'data', `ninety_${dataType}.json`);
    
    let existingData = [];
    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            existingData = JSON.parse(fileContent);
        } catch (error) {
            console.error(`Error reading existing ${dataType} data:`, error);
        }
    }
    
    // Add new data
    existingData.push(...processedData);
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    
    return processedData.length;
}

async function loadNinetyDataFromFiles() {
    const data = {
        rocks: [],
        todos: [],
        issues: [],
        scorecard: []
    };
    
    for (const dataType of Object.keys(data)) {
        const filePath = path.join(__dirname, 'data', `ninety_${dataType}.json`);
        
        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                data[dataType] = JSON.parse(fileContent);
            } catch (error) {
                console.error(`Error reading ${dataType} data:`, error);
            }
        }
    }
    
    return data;
}

async function deleteNinetyItemFromFiles(dataType, itemId) {
    const filePath = path.join(__dirname, 'data', `ninety_${dataType}.json`);
    
    if (!fs.existsSync(filePath)) {
        return false;
    }
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let data = JSON.parse(fileContent);
        
        const initialLength = data.length;
        data = data.filter(item => item.id !== itemId);
        
        if (data.length < initialLength) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`Error deleting ${dataType} item:`, error);
        return false;
    }
}

async function updateNinetyItemInFiles(dataType, itemId, updateData) {
    const filePath = path.join(__dirname, 'data', `ninety_${dataType}.json`);
    
    if (!fs.existsSync(filePath)) {
        return false;
    }
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let data = JSON.parse(fileContent);
        
        const itemIndex = data.findIndex(item => item.id === itemId);
        
        if (itemIndex !== -1) {
            // Update the item while preserving original fields
            data[itemIndex] = {
                ...data[itemIndex],
                ...updateData,
                id: itemId // Ensure ID doesn't change
            };
            
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`Error updating ${dataType} item:`, error);
        return false;
    }
}

// Department file management functions (NEW)
async function loadDepartmentsFromFiles() {
    const filePath = path.join(__dirname, 'data', 'departments.json');
    
    if (!fs.existsSync(filePath)) {
        return [];
    }
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading departments file:', error);
        return [];
    }
}

async function saveDepartmentToFiles(department) {
    const filePath = path.join(__dirname, 'data', 'departments.json');
    
    let departments = [];
    if (fs.existsSync(filePath)) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            departments = JSON.parse(fileContent);
        } catch (error) {
            console.error('Error reading existing departments:', error);
        }
    }
    
    departments.push(department);
    
    try {
        fs.writeFileSync(filePath, JSON.stringify(departments, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving department:', error);
        return false;
    }
}

async function updateDepartmentInFiles(deptId, updateData) {
    const filePath = path.join(__dirname, 'data', 'departments.json');
    
    if (!fs.existsSync(filePath)) {
        return false;
    }
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let departments = JSON.parse(fileContent);
        
        const deptIndex = departments.findIndex(dept => dept.id === deptId);
        
        if (deptIndex !== -1) {
            departments[deptIndex] = {
                ...departments[deptIndex],
                ...updateData,
                id: deptId
            };
            
            fs.writeFileSync(filePath, JSON.stringify(departments, null, 2));
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error updating department:', error);
        return false;
    }
}

async function deleteDepartmentFromFiles(deptId) {
    const filePath = path.join(__dirname, 'data', 'departments.json');
    
    if (!fs.existsSync(filePath)) {
        return false;
    }
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        let departments = JSON.parse(fileContent);
        
        const initialLength = departments.length;
        departments = departments.filter(dept => dept.id !== deptId);
        
        if (departments.length < initialLength) {
            fs.writeFileSync(filePath, JSON.stringify(departments, null, 2));
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error deleting department:', error);
        return false;
    }
}

async function addNinetyItemToFiles(dataType, newItem) {
    const filePath = path.join(__dirname, 'data', `ninety_${dataType}.json`);
    
    try {
        let data = [];
        
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            data = JSON.parse(fileContent);
        }
        
        data.push(newItem);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error adding ${dataType} item:`, error);
        return false;
    }
}

// Database-based data management functions (if database is available)
async function saveNinetyDataToDatabase(processedData, dataType, userId) {
    const tableName = `ninety_${dataType}`;
    let savedCount = 0;
    
    for (const item of processedData) {
        try {
            const columns = Object.keys(item);
            const placeholders = columns.map((_, index) => `$${index + 1}`);
            const values = columns.map(col => item[col]);
            
            // Add created_by if userId is provided
            if (userId) {
                columns.push('created_by');
                placeholders.push(`$${columns.length}`);
                values.push(userId);
            }
            
            const query = `
                INSERT INTO ${tableName} (${columns.join(', ')})
                VALUES (${placeholders.join(', ')})
            `;
            
            await dataService.query(query, values);
            savedCount++;
        } catch (error) {
            console.error(`Error saving ${dataType} item:`, error);
        }
    }
    
    return savedCount;
}

async function loadNinetyDataFromDatabase() {
    const data = {
        rocks: [],
        todos: [],
        issues: [],
        scorecard: []
    };
    
    for (const dataType of Object.keys(data)) {
        try {
            const result = await dataService.query(`
                SELECT * FROM ninety_${dataType} 
                ORDER BY created_date DESC
            `);
            data[dataType] = result.rows || [];
        } catch (error) {
            console.error(`Error loading ${dataType} from database:`, error);
        }
    }
    
    return data;
}

async function deleteNinetyItemFromDatabase(dataType, itemId) {
    try {
        const result = await dataService.query(`
            DELETE FROM ninety_${dataType} 
            WHERE id = $1
        `, [itemId]);
        
        return result.rowCount > 0;
    } catch (error) {
        console.error(`Error deleting ${dataType} item from database:`, error);
        return false;
    }
}

async function logNinetyUpload(file, dataType, recordsProcessed, recordsSaved, userId) {
    try {
        if (isUsingFileBasedAuth()) {
            // Log to file
            const logData = {
                filename: file.filename,
                originalFilename: file.originalname,
                dataType: dataType,
                fileSize: file.size,
                recordsProcessed: recordsProcessed,
                recordsSaved: recordsSaved,
                uploadDate: new Date().toISOString(),
                processedBy: userId || 'admin',
                success: recordsSaved > 0
            };
            
            const logFile = path.join(__dirname, 'data', 'ninety_upload_history.json');
            let history = [];
            
            if (fs.existsSync(logFile)) {
                try {
                    history = JSON.parse(fs.readFileSync(logFile, 'utf8'));
                } catch (error) {
                    console.error('Error reading upload history:', error);
                }
            }
            
            history.unshift(logData);
            
            // Keep only last 50 uploads
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
        } else {
            // Log to database
            await dataService.query(`
                INSERT INTO ninety_upload_history (
                    filename, original_filename, data_type, file_size, 
                    records_processed, records_saved, processed_by, success
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                file.filename,
                file.originalname,
                dataType,
                file.size,
                recordsProcessed,
                recordsSaved,
                userId || 'admin',
                recordsSaved > 0
            ]);
        }
    } catch (error) {
        console.error('Error logging upload:', error);
    }
}

async function updateNinetyItemInDatabase(dataType, itemId, updateData) {
    try {
        const tableName = `ninety_${dataType}`;
        const columns = Object.keys(updateData).filter(key => key !== 'id');
        const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');
        const values = columns.map(col => updateData[col]);
        
        const query = `
            UPDATE ${tableName} 
            SET ${setClause}
            WHERE id = $${columns.length + 1}
        `;
        
        const result = await dataService.query(query, [...values, itemId]);
        return result.rowCount > 0;
    } catch (error) {
        console.error(`Error updating ${dataType} item in database:`, error);
        return false;
    }
}

async function addNinetyItemToDatabase(dataType, newItem, userId) {
    try {
        const tableName = `ninety_${dataType}`;
        const columns = Object.keys(newItem);
        const placeholders = columns.map((_, index) => `$${index + 1}`);
        const values = columns.map(col => newItem[col]);
        
        // Add created_by if userId is provided
        if (userId) {
            columns.push('created_by');
            placeholders.push(`$${columns.length}`);
            values.push(userId);
        }
        
        const query = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
        `;
        
        await dataService.query(query, values);
        return true;
    } catch (error) {
        console.error(`Error adding ${dataType} item to database:`, error);
        return false;
    }
}

// Test endpoint to manually refresh Tableau data and verify integration
app.get('/api/test-tableau-integration', 
    authMiddleware.requireAuth,
    requireAdmin,
    async (req, res) => {
        try {
            console.log('🧪 Testing Tableau integration...');
            
            // Step 1: Test Tableau Auto Extractor
            let tableauData = null;
            if (tableauIntegration) {
                console.log('📊 Testing Tableau integration layer...');
                tableauData = await tableauIntegration.getComprehensivePlatformData();
                console.log('✅ Comprehensive Tableau data extracted via integration layer');
            } else {
                console.error('❌ Tableau integration layer not available');
            }
            
            // Step 2: Test Data Service
            console.log('🔧 Testing data service...');
            const dashboardData = await dataService.getAllDashboardData();
            console.log('✅ Dashboard data assembled');
            
            // Step 3: Check if Google/Facebook data exists
            const hasGoogleData = !!(dashboardData.google);
            const hasFacebookData = !!(dashboardData.facebook);
            const hasRevenueFunnel = !!(dashboardData.revenueFunnel);
            
            console.log('📊 Data availability check:', {
                google: hasGoogleData,
                facebook: hasFacebookData,
                revenueFunnel: hasRevenueFunnel
            });
            
            // Step 4: Force update global dashboard data
            if (tableauData) {
                // Update the global dashboard data variable
                Object.assign(dashboardData, {
                    google: tableauData.google,
                    facebook: tableauData.facebook,
                    platformComparison: tableauData.platformComparison,
                    extractionInfo: tableauData.extractionInfo
                });
                console.log('🔄 Global dashboard data updated with fresh Tableau data');
            }
            
            // Step 5: Broadcast update to all clients
            io.emit('dashboardUpdate', {
                section: 'all',
                data: dashboardData,
                timestamp: new Date().toISOString(),
                updateType: 'manual_tableau_refresh'
            });
            
            res.json({
                success: true,
                message: 'Tableau integration test completed',
                results: {
                    tableauExtractorAvailable: !!tableauIntegration,
                    tableauDataExtracted: !!tableauData,
                    googleDataAvailable: hasGoogleData,
                    facebookDataAvailable: hasFacebookData,
                    revenueFunnelAvailable: hasRevenueFunnel,
                    broadcastSent: true
                },
                sampleData: {
                    google: dashboardData.google ? 'Available' : 'Missing',
                    facebook: dashboardData.facebook ? 'Available' : 'Missing',
                    lastUpdated: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('❌ Tableau integration test failed:', error);
            res.status(500).json({
                success: false,
                message: 'Tableau integration test failed',
                error: error.message
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

// ============================================================================
// MAIN DASHBOARD NINETY.IO DATA ACCESS ENDPOINTS
// ============================================================================

// Get Ninety.io scorecard data for main dashboard
app.get('/api/ninety-data/scorecard',
    authMiddleware.requireAuth,
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.READ),
    async (req, res) => {
        try {
            console.log('📊 Main dashboard requesting scorecard data...');
            
            // Get scorecard data using the enhanced data service
            const scorecardData = await dataService.getScorecardData();
            
            res.json({
                success: true,
                data: scorecardData,
                source: 'admin_uploads',
                lastUpdated: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error fetching scorecard for main dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch scorecard data',
                error: error.message
            });
        }
    }
);

// Get Ninety.io rocks data for main dashboard (goals)
app.get('/api/ninety-data/rocks',
    authMiddleware.requireAuth,
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.READ),
    async (req, res) => {
        try {
            console.log('🎯 Main dashboard requesting rocks data...');
            
            // Get goals data (transformed from rocks) using the enhanced data service
            const goalsData = await dataService.getGoalsData();
            
            res.json({
                success: true,
                data: goalsData,
                source: 'admin_uploads',
                lastUpdated: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error fetching rocks for main dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch rocks data',
                error: error.message
            });
        }
    }
);

// Get Ninety.io issues data for main dashboard
app.get('/api/ninety-data/issues',
    authMiddleware.requireAuth,
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.READ),
    async (req, res) => {
        try {
            console.log('⚠️ Main dashboard requesting issues data...');
            
            // Get issues data using the enhanced data service
            const issuesData = await dataService.getIssuesData();
            
            res.json({
                success: true,
                data: issuesData,
                source: 'admin_uploads',
                lastUpdated: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error fetching issues for main dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch issues data',
                error: error.message
            });
        }
    }
);

// Get raw Ninety.io rocks data for dashboard display (NEW)
app.get('/api/ninety-data/rocks/raw',
    authMiddleware.requireAuth,
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.READ),
    async (req, res) => {
        try {
            console.log('🎯 Main dashboard requesting raw rocks data...');
            
            // Get raw rocks data using the enhanced data service
            const rocksData = await dataService.getRocksData();
            
            res.json({
                success: true,
                data: rocksData,
                source: 'admin_uploads',
                lastUpdated: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error fetching raw rocks for main dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch raw rocks data',
                error: error.message
            });
        }
    }
);

// Get raw Ninety.io issues data for dashboard display (NEW)
app.get('/api/ninety-data/issues/raw',
    authMiddleware.requireAuth,
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.READ),
    async (req, res) => {
        try {
            console.log('⚠️ Main dashboard requesting raw issues data...');
            
            // Get raw issues data using the enhanced data service
            const issuesData = await dataService.getRawIssuesData();
            
            res.json({
                success: true,
                data: issuesData,
                source: 'admin_uploads',
                lastUpdated: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error fetching raw issues for main dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch raw issues data',
                error: error.message
            });
        }
    }
);

// Get Ninety.io todos data for main dashboard
app.get('/api/ninety-data/todos',
    authMiddleware.requireAuth,
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.READ),
    async (req, res) => {
        try {
            console.log('✅ Main dashboard requesting todos data...');
            
            // Get raw todos data from admin uploads
            const uploadedTodos = await dataService.getAdminUploadedData('todos');
            
            if (uploadedTodos && uploadedTodos.length > 0) {
                res.json({
                    success: true,
                    data: uploadedTodos,
                    count: uploadedTodos.length,
                    source: 'admin_uploads',
                    lastUpdated: new Date().toISOString()
                });
            } else {
                res.json({
                    success: true,
                    data: [],
                    count: 0,
                    source: 'no_data',
                    message: 'No todos data uploaded yet'
                });
            }
            
        } catch (error) {
            console.error('Error fetching todos for main dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch todos data',
                error: error.message
            });
        }
    }
);

// Force refresh endpoint for main dashboard data synchronization
app.post('/api/sync-admin-data',
    authMiddleware.requireAuth,
    authMiddleware.requirePermission(authMiddleware.PERMISSIONS.WRITE),
    async (req, res) => {
        try {
            console.log('🔄 Synchronizing admin data with main dashboard...');
            
            // Get fresh dashboard data which now includes admin uploads
            const freshData = await dataService.getAllDashboardData();
            
            // Broadcast updated data to all connected clients
            io.emit('dashboardUpdate', {
                section: 'all',
                data: freshData,
                timestamp: new Date().toISOString(),
                updateType: 'admin_sync'
            });
            
            res.json({
                success: true,
                message: 'Admin data synchronized with main dashboard',
                hasScorecard: !!freshData.scorecard,
                hasGoals: !!freshData.goals,
                hasIssues: !!freshData.issues,
                lastUpdated: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error synchronizing admin data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to sync admin data',
                error: error.message
            });
        }
    }
);

initializeApp(); 