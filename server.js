const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
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

// Sample data structure for dashboard metrics
let dashboardData = {
  goals: {
    quarterly: {
      target: 1000000,
      current: 750000,
      percentage: 75
    },
    monthly: {
      target: 333333,
      current: 280000,
      percentage: 84
    }
  },
  revenueFunnel: {
    leads: 1250,
    prospects: 875,
    qualified: 425,
    proposals: 180,
    closed: 85,
    revenue: 750000
  },
  vto: {
    available: 240,
    used: 165,
    pending: 25,
    remaining: 75
  },
  issues: {
    critical: 3,
    high: 12,
    medium: 28,
    low: 45,
    total: 88
  },
  scorecard: {
    customerSatisfaction: 92,
    teamEfficiency: 88,
    goalCompletion: 75,
    qualityScore: 94
  },
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
  lastUpdated: new Date().toISOString()
};

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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send current dashboard data to newly connected client
  socket.emit('dashboardData', dashboardData);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Schedule automatic updates (simulate real-time data changes)
cron.schedule('*/30 * * * * *', () => {
  // Simulate small changes in metrics every 30 seconds
  const randomChange = () => Math.floor(Math.random() * 10) - 5;
  
  dashboardData.revenueFunnel.leads += randomChange();
  dashboardData.revenueFunnel.prospects += Math.floor(randomChange() / 2);
  dashboardData.goals.quarterly.current += Math.floor(Math.random() * 1000);
  dashboardData.goals.quarterly.percentage = Math.round((dashboardData.goals.quarterly.current / dashboardData.goals.quarterly.target) * 100);
  
  dashboardData.lastUpdated = new Date().toISOString();
  
  // Broadcast updates to all connected clients
  io.emit('dashboardUpdate', { section: 'all', data: dashboardData });
});

server.listen(PORT, () => {
  console.log(`Adsync Media Hub server running on port ${PORT}`);
  console.log(`Access your dashboard at: http://localhost:${PORT}`);
}); 