const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
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
app.use(express.static(path.join(__dirname, 'public')));

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
    { title: "Company Policies", url: "#", category: "HR" },
    { title: "Product Documentation", url: "#", category: "Product" },
    { title: "Sales Playbook", url: "#", category: "Sales" },
    { title: "Technical Guidelines", url: "#", category: "Engineering" }
  ],
  lastUpdated: new Date().toISOString()
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
  console.log(`Company Dashboard server running on port ${PORT}`);
  console.log(`Access your dashboard at: http://localhost:${PORT}`);
}); 