const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const dataService = require('./data-service');
const tableauAutoExtractor = require('./tableau-auto-extractor');
const dailyDataTracker = require('./daily-data-tracker');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Initialize data service and fetch initial data
async function initializeApp() {
  console.log('🚀 Initializing Adsync Media Hub with data repository connections...');
  
  try {
    // Initialize data service connections
    await dataService.initialize();
    
    // Fetch initial dashboard data from repositories
    dashboardData = await dataService.getAllDashboardData();
    console.log('✅ Initial dashboard data loaded from repositories');
    
    // Start the server after data is loaded
    server.listen(PORT, () => {
      console.log(`🚀 Adsync Media Hub server running on port ${PORT}`);
      console.log(`📊 Dashboard available at: http://localhost:${PORT}`);
      console.log(`⚙️ Admin interface at: http://localhost:${PORT}/admin`);
      console.log(`🔄 Data refresh interval: ${process.env.DATA_REFRESH_INTERVAL || '*/15 * * * *'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    console.log('🔄 Falling back to sample data...');
    
    // Use fallback sample data if repository connection fails
    dashboardData = {
      goals: {
        quarterly: { target: 1000000, current: 750000, percentage: 75 },
        monthly: { target: 333333, current: 280000, percentage: 84 }
      },
      revenueFunnel: {
        leads: 1250, prospects: 875, qualified: 425, proposals: 180, closed: 85, revenue: 750000
      },
      vto: { available: 240, used: 165, pending: 25, remaining: 75 },
      issues: { critical: 3, high: 12, medium: 28, low: 45, total: 88 },
      scorecard: { customerSatisfaction: 92, teamEfficiency: 88, goalCompletion: 75, qualityScore: 94 },
      knowledgeBase: [
        { title: "Employee Handbook", url: "#", category: "HR" },
        { title: "Company Policies", url: "#", category: "HR" },
        { title: "Marketing Guidelines", url: "#", category: "Marketing" },
        { title: "Sales Playbook", url: "#", category: "Sales" },
        { title: "Client Onboarding Process", url: "#", category: "Sales" },
        { title: "Creative Brief Templates", url: "#", category: "Creative" },
        { title: "Brand Guidelines", url: "#", category: "Creative" },
        { title: "Technical Documentation", url: "#", category: "Tech" },
        { title: "Project Management Tools", url: "#", category: "Operations" },
        { title: "Emergency Contacts", url: "#", category: "Operations" }
      ],
      quickAccess: {
        'creative-team': { title: 'Creative Team', data: [], icon: 'fas fa-palette' },
        'tech-team': { title: 'Tech Team', data: [], icon: 'fas fa-laptop-code' },
        'sales-success': { title: 'Sales & Success', data: [], icon: 'fas fa-handshake' },
        'accounting-team': { title: 'Accounting Team', data: [], icon: 'fas fa-calculator' },
        'media-team': { title: 'Media Team', data: [], icon: 'fas fa-video' },
        'jrs-knowledge-hub': { title: 'Jrs-Knowledge Hub', data: [], icon: 'fas fa-graduation-cap' }
      },
      planner: {
        'monthly-schedule': { title: 'Monthly Schedule', data: [], icon: 'fas fa-calendar-week' },
        'team-updates': { title: 'Team Updates', data: [], icon: 'fas fa-bullhorn' },
        'meetings': { title: 'Meetings', data: [], icon: 'fas fa-users' },
        'wiki': { title: 'Wiki', data: [], icon: 'fas fa-book-open' },
        'projects': { title: 'Projects', data: [], icon: 'fas fa-project-diagram' }
      },
      team: {
        'team-directory': { title: 'Team Directory', data: [], icon: 'fas fa-address-book' },
        'values-culture': { title: 'Values & Culture', data: [], icon: 'fas fa-heart' },
        'faq': { title: 'FAQ', data: [], icon: 'fas fa-question-circle' }
      },
      policies: {
        'office-manual': { title: 'Office Manual', data: [], icon: 'fas fa-building' },
        'vacation-policy': { title: 'Vacation Policy', data: [], icon: 'fas fa-umbrella-beach' },
        'benefits-policies': { title: 'Benefits Policies', data: [], icon: 'fas fa-hand-holding-heart' }
      },
      documentation: {
        'sops': { title: 'SOPs', data: [], icon: 'fas fa-clipboard-list' },
        'docs': { title: 'Docs', data: [], icon: 'fas fa-folder-open' },
        'ideal-client-profiles': { title: 'Ideal Client Profiles', data: [], icon: 'fas fa-user-tie' },
        'product-menu': { title: 'Product Menu (Template)', data: [], icon: 'fas fa-list-alt' }
      },
      lastUpdated: new Date().toISOString()
    };
    
    // Start server with fallback data
    server.listen(PORT, () => {
      console.log(`🚀 Adsync Media Hub server running on port ${PORT} (fallback mode)`);
      console.log(`📊 Dashboard available at: http://localhost:${PORT}`);
    });
  }
}

// Routes
app.get('/', (req, res) => {
  // First try public directory, then root directory
  const publicIndexPath = path.join(__dirname, 'public', 'index.html');
  const rootIndexPath = path.join(__dirname, 'index.html');
  
  console.log('Checking for index.html at:', publicIndexPath);
  console.log('Checking for index.html at:', rootIndexPath);
  
  if (fs.existsSync(publicIndexPath)) {
    console.log('Serving index.html from public directory');
    res.sendFile(publicIndexPath);
  } else if (fs.existsSync(rootIndexPath)) {
    console.log('Serving index.html from root directory');
    res.sendFile(rootIndexPath);
  } else {
    console.error('index.html not found in either location');
    res.status(404).send(`
      <h1>Dashboard Loading Error</h1>
      <p>Could not find index.html at either location:</p>
      <ul>
        <li>${publicIndexPath}</li>
        <li>${rootIndexPath}</li>
      </ul>
      <p>Current directory: ${__dirname}</p>
      <p>Files in current directory: ${fs.readdirSync(__dirname).join(', ')}</p>
      ${fs.existsSync(path.join(__dirname, 'public')) ? 
        `<p>Files in public directory: ${fs.readdirSync(path.join(__dirname, 'public')).join(', ')}</p>` : 
        '<p>Public directory does not exist</p>'
      }
    `);
  }
});

// Admin interface route
app.get('/admin', (req, res) => {
  console.log('Admin route accessed');
  const publicAdminPath = path.join(__dirname, 'public', 'admin.html');
  const rootAdminPath = path.join(__dirname, 'admin.html');
  
  console.log('Checking for admin.html at:', publicAdminPath);
  console.log('Public admin exists:', fs.existsSync(publicAdminPath));
  
  if (fs.existsSync(publicAdminPath)) {
    console.log('Serving admin.html from public directory');
    res.sendFile(publicAdminPath);
  } else if (fs.existsSync(rootAdminPath)) {
    console.log('Serving admin.html from root directory');
    res.sendFile(rootAdminPath);
  } else {
    console.error('Admin interface not found in either location');
    res.status(404).send(`
      <h1>Admin Interface Not Found</h1>
      <p>Could not find admin.html at either location:</p>
      <ul>
        <li>${publicAdminPath}</li>
        <li>${rootAdminPath}</li>
      </ul>
    `);
  }
});

app.get('/api/dashboard', (req, res) => {
  res.json(dashboardData);
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
app.get('/api/section/:sectionType/:sectionKey', (req, res) => {
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
        const freshTableauData = await tableauAutoExtractor.getFreshData();
        console.log('✅ Fresh Tableau data retrieved');
        
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
            await dailyDataTracker.saveDailyData(googleData.daily, facebookData.daily);
            console.log('💾 Daily tracking data saved');
        }
        
        // Get complete dashboard data
        const dashboardData = await dataService.getAllDashboardData();
        console.log('📊 Complete dashboard data assembled');
        
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

// Start server
server.listen(PORT, () => {
    console.log('🚀 Adsync Media Hub Dashboard Server Started');
    console.log('============================================');
    console.log(`📊 Server running on port ${PORT}`);
    console.log(`🌐 Dashboard URL: http://localhost:${PORT}`);
    console.log('⏰ Daily refresh scheduled for 8:00 AM');
    console.log('🔄 6-hour refresh cycle active');
    console.log('============================================');
    
    // Perform initial data refresh on startup
    setTimeout(async () => {
        console.log('🔄 Performing initial data refresh...');
        await performDailyDataRefresh();
    }, 5000); // Wait 5 seconds after startup
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

initializeApp(); 