const axios = require('axios');
const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');
const csv = require('csv-parser');
const fs = require('fs');
const tableauAutoExtractor = require('./tableau-auto-extractor');
require('dotenv').config();

class DataService {
  constructor() {
    this.connections = {};
    this.config = {
      // Database configurations from environment variables
      postgres: {
        host: process.env.PG_HOST || 'localhost',
        port: process.env.PG_PORT || 5432,
        database: process.env.PG_DATABASE,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
      },
      mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        database: process.env.MYSQL_DATABASE,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
      },
      mongodb: {
        url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
        database: process.env.MONGODB_DATABASE,
      },
      // API configurations
      tableau: {
        baseUrl: process.env.TABLEAU_SERVER_URL,
        username: process.env.TABLEAU_USERNAME,
        password: process.env.TABLEAU_PASSWORD,
        siteId: process.env.TABLEAU_SITE_ID,
      },
      // Generic API endpoints
      apis: {
        funnelData: process.env.FUNNEL_API_URL,
        goalsData: process.env.GOALS_API_URL,
        vtoData: process.env.VTO_API_URL,
        issuesData: process.env.ISSUES_API_URL,
        scorecardData: process.env.SCORECARD_API_URL,
      }
    };
  }

  // Initialize connections based on available configuration
  async initialize() {
    console.log('🔌 Initializing data service connections...');
    
    // Initialize PostgreSQL connection if configured
    if (this.config.postgres.user && this.config.postgres.database) {
      try {
        this.connections.postgres = new Pool(this.config.postgres);
        await this.connections.postgres.query('SELECT NOW()');
        console.log('✅ PostgreSQL connection established');
      } catch (error) {
        console.log('❌ PostgreSQL connection failed:', error.message);
      }
    }

    // Initialize MySQL connection if configured
    if (this.config.mysql.user && this.config.mysql.database) {
      try {
        this.connections.mysql = await mysql.createConnection(this.config.mysql);
        await this.connections.mysql.execute('SELECT 1');
        console.log('✅ MySQL connection established');
      } catch (error) {
        console.log('❌ MySQL connection failed:', error.message);
      }
    }

    // Initialize MongoDB connection if configured
    if (this.config.mongodb.database) {
      try {
        this.connections.mongodb = new MongoClient(this.config.mongodb.url);
        await this.connections.mongodb.connect();
        console.log('✅ MongoDB connection established');
      } catch (error) {
        console.log('❌ MongoDB connection failed:', error.message);
      }
    }

    console.log('🚀 Data service initialization complete');
  }

  // Fetch funnel data from various sources
  async getFunnelData() {
    console.log('📊 Fetching funnel data...');
    
    // Try Environment Variables first (perfect for Render)
    if (process.env.FUNNEL_DATA) {
      try {
        const envData = JSON.parse(process.env.FUNNEL_DATA);
        console.log('✅ Funnel data fetched from environment variables');
        return envData;
      } catch (error) {
        console.log('⚠️ Error parsing FUNNEL_DATA environment variable:', error.message);
      }
    }
    
    // Try Tableau Auto Extractor second (your specific dashboard)
    try {
      const tableauData = await tableauAutoExtractor.getFreshData();
      if (tableauData) {
        console.log('✅ Comprehensive funnel data fetched from Tableau Auto Extractor');
        return tableauData;
      }
    } catch (error) {
      console.log('⚠️ Tableau Auto Extractor fetch failed, trying other sources:', error.message);
    }
    
    // Try API third
    if (this.config.apis.funnelData) {
      try {
        const response = await axios.get(this.config.apis.funnelData, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Company-Dashboard/1.0'
          }
        });
        console.log('✅ Funnel data fetched from API');
        return this.transformFunnelData(response.data);
      } catch (error) {
        console.log('⚠️ API fetch failed, trying database:', error.message);
      }
    }

    // Try PostgreSQL
    if (this.connections.postgres) {
      try {
        const result = await this.connections.postgres.query(`
          SELECT 
            leads, prospects, qualified, proposals, closed, revenue,
            updated_at
          FROM funnel_metrics 
          ORDER BY updated_at DESC 
          LIMIT 1
        `);
        
        if (result.rows.length > 0) {
          console.log('✅ Funnel data fetched from PostgreSQL');
          return result.rows[0];
        }
      } catch (error) {
        console.log('⚠️ PostgreSQL query failed:', error.message);
      }
    }

    // Try MySQL
    if (this.connections.mysql) {
      try {
        const [rows] = await this.connections.mysql.execute(`
          SELECT 
            leads, prospects, qualified, proposals, closed, revenue,
            updated_at
          FROM funnel_metrics 
          ORDER BY updated_at DESC 
          LIMIT 1
        `);
        
        if (rows.length > 0) {
          console.log('✅ Funnel data fetched from MySQL');
          return rows[0];
        }
      } catch (error) {
        console.log('⚠️ MySQL query failed:', error.message);
      }
    }

    // Try MongoDB
    if (this.connections.mongodb) {
      try {
        const db = this.connections.mongodb.db(this.config.mongodb.database);
        const collection = db.collection('funnel_metrics');
        const result = await collection.findOne({}, { sort: { updated_at: -1 } });
        
        if (result) {
          console.log('✅ Funnel data fetched from MongoDB');
          return result;
        }
      } catch (error) {
        console.log('⚠️ MongoDB query failed:', error.message);
      }
    }

    // Fallback to sample data
    console.log('📋 Using fallback sample data for funnel');
    return {
      leads: 1250,
      prospects: 875,
      qualified: 425,
      proposals: 180,
      closed: 85,
      revenue: 750000
    };
  }

  // Fetch goals data
  async getGoalsData() {
    console.log('🎯 Fetching goals data...');
    
    // Try Environment Variables first (perfect for Render)
    if (process.env.GOALS_DATA) {
      try {
        const envData = JSON.parse(process.env.GOALS_DATA);
        console.log('✅ Goals data fetched from environment variables');
        return envData;
      } catch (error) {
        console.log('⚠️ Error parsing GOALS_DATA environment variable:', error.message);
      }
    }
    
    if (this.config.apis.goalsData) {
      try {
        const response = await axios.get(this.config.apis.goalsData, { timeout: 10000 });
        console.log('✅ Goals data fetched from API');
        return this.transformGoalsData(response.data);
      } catch (error) {
        console.log('⚠️ Goals API fetch failed:', error.message);
      }
    }

    // Database fallback logic similar to funnel data
    // Try PostgreSQL, MySQL, MongoDB in order

    // Fallback
    console.log('📋 Using fallback sample data for goals');
    return {
      quarterly: { target: 1000000, current: 750000, percentage: 75 },
      monthly: { target: 333333, current: 280000, percentage: 84 }
    };
  }

  // Fetch VTO data
  async getVTOData() {
    console.log('📅 Fetching VTO data...');
    
    if (this.config.apis.vtoData) {
      try {
        const response = await axios.get(this.config.apis.vtoData, { timeout: 10000 });
        console.log('✅ VTO data fetched from API');
        return response.data;
      } catch (error) {
        console.log('⚠️ VTO API fetch failed:', error.message);
      }
    }

    // Fallback
    console.log('📋 Using fallback sample data for VTO');
    return {
      available: 240,
      used: 165,
      pending: 25,
      remaining: 75
    };
  }

  // Fetch issues data
  async getIssuesData() {
    console.log('🔧 Fetching issues data...');
    
    if (this.config.apis.issuesData) {
      try {
        const response = await axios.get(this.config.apis.issuesData, { timeout: 10000 });
        console.log('✅ Issues data fetched from API');
        return response.data;
      } catch (error) {
        console.log('⚠️ Issues API fetch failed:', error.message);
      }
    }

    // Fallback
    console.log('📋 Using fallback sample data for issues');
    return {
      critical: 3,
      high: 12,
      medium: 28,
      low: 45,
      total: 88
    };
  }

  // Fetch scorecard data
  async getScorecardData() {
    console.log('📈 Fetching scorecard data...');
    
    if (this.config.apis.scorecardData) {
      try {
        const response = await axios.get(this.config.apis.scorecardData, { timeout: 10000 });
        console.log('✅ Scorecard data fetched from API');
        return response.data;
      } catch (error) {
        console.log('⚠️ Scorecard API fetch failed:', error.message);
      }
    }

    // Fallback
    console.log('📋 Using fallback sample data for scorecard');
    return {
      customerSatisfaction: 92,
      teamEfficiency: 88,
      goalCompletion: 75,
      qualityScore: 94
    };
  }

  // Fetch all dashboard data
  async getAllDashboardData() {
    console.log('🔄 Fetching all dashboard data from repositories...');
    
    try {
      const [goals, funnelData, vto, issues, scorecard] = await Promise.all([
        this.getGoalsData(),
        this.getFunnelData(),
        this.getVTOData(),
        this.getIssuesData(),
        this.getScorecardData()
      ]);

      // Handle comprehensive data structure from tableau-auto-extractor
      let revenueFunnel, google, facebook, platformComparison, extractionInfo;
      
      if (funnelData.google && funnelData.facebook) {
        // Comprehensive data structure from tableau-auto-extractor
        const googleDaily = funnelData.google.daily || funnelData.google;
        const facebookDaily = funnelData.facebook.daily || funnelData.facebook;
        
        // Store separated platform data for dashboard
        google = {
          daily: googleDaily,
          labels: funnelData.google.labels || {}
        };
        
        facebook = {
          daily: facebookDaily,
          labels: funnelData.facebook.labels || {}
        };
        
        // Store platform comparison data
        platformComparison = funnelData.platformComparison || {};
        
        // Store extraction info with proper last updated date
        extractionInfo = funnelData.extractionInfo || {
          method: 'comprehensive_data_extraction',
          lastUpdated: funnelData.lastUpdated || new Date().toISOString(),
          extractionDate: funnelData.extractionDate || new Date().toISOString().split('T')[0],
          source: 'tableau_auto_extractor'
        };
        
        // Create combined metrics for the main funnel display (using revenueFunnel from comprehensive data)
        revenueFunnel = funnelData.revenueFunnel || {
          leads: (googleDaily.leads || 0) + (facebookDaily.leads || 0),
          prospects: (googleDaily.prospects || 0) + (facebookDaily.prospects || 0),
          qualified: (googleDaily.qualified || 0) + (facebookDaily.qualified || 0),
          proposals: (googleDaily.proposals || 0) + (facebookDaily.proposals || 0),
          closed: (googleDaily.closed || 0) + (facebookDaily.closed || 0),
          revenue: (googleDaily.revenue || 0) + (facebookDaily.revenue || 0),
          
          // Include labels and conversion rates if available
          labels: funnelData.revenueFunnel?.labels || {},
          conversionRates: funnelData.revenueFunnel?.conversionRates || {}
        };
        
      } else {
        // Old combined format - ensure all numbers are valid
        revenueFunnel = {
          leads: funnelData.leads || 0,
          prospects: funnelData.prospects || 0,
          qualified: funnelData.qualified || 0,
          proposals: funnelData.proposals || 0,
          closed: funnelData.closed || 0,
          revenue: funnelData.revenue || 0,
          impressions: funnelData.impressions || 0,
          clicks: funnelData.clicks || 0,
          adSpend: funnelData.adSpend || 0,
          grossProfit: funnelData.grossProfit || 0
        };
        
        // Set default extraction info for old format
        extractionInfo = {
          method: 'basic_data_extraction',
          lastUpdated: new Date().toISOString(),
          extractionDate: new Date().toISOString().split('T')[0],
          source: 'fallback_data'
        };
      }

      // FIX NaN ISSUE: Ensure all data has valid numbers (prevent NaN)
      const safeguardNumbers = (obj) => {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            result[key] = safeguardNumbers(value);
          } else {
            // Convert values to numbers safely, defaulting to 0 if invalid
            if (typeof value === 'number' && !isNaN(value)) {
              result[key] = value;
            } else if (typeof value === 'string' && value.trim() !== '' && !isNaN(parseFloat(value))) {
              result[key] = parseFloat(value);
            } else if (typeof value === 'string' || typeof value === 'number') {
              // If it's a string that can't be parsed or NaN number, default to 0
              result[key] = 0;
            } else {
              // Keep non-numeric values as they are (like strings, booleans)
              result[key] = value;
            }
          }
        }
        return result;
      };

      const dashboardData = {
        goals: safeguardNumbers(goals),
        revenueFunnel: safeguardNumbers(revenueFunnel),
        vto: safeguardNumbers(vto),
        issues: safeguardNumbers(issues),
        scorecard: safeguardNumbers(scorecard),
        
        // Include separated platform data if available
        ...(google && { google: safeguardNumbers(google) }),
        ...(facebook && { facebook: safeguardNumbers(facebook) }),
        ...(platformComparison && { platformComparison: safeguardNumbers(platformComparison) }),
        
        // Include data labels if available from comprehensive data
        ...(funnelData.dataLabels && { dataLabels: funnelData.dataLabels }),
        
        // Include extraction info with proper timestamps
        extractionInfo: extractionInfo,
        
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
        
        // Use extraction date as lastUpdated for proper timestamp display
        lastUpdated: extractionInfo.lastUpdated || new Date().toISOString()
      };

      console.log('✅ All dashboard data fetched successfully');
      console.log('📊 Data structure:', funnelData.google ? 'Comprehensive Google/Facebook data' : 'Basic combined format');
      console.log('📅 Data extraction date:', extractionInfo.extractionDate);
      console.log('🕐 Last updated:', extractionInfo.lastUpdated);
      console.log('📊 Revenue funnel totals - Leads:', revenueFunnel.leads, 'Revenue: $' + revenueFunnel.revenue);
      if (google && facebook) {
        console.log('🔍 Google Ads - Revenue: $' + google.daily.revenue + ', Impressions:', google.daily.impressions);
        console.log('📘 Facebook Ads - Revenue: $' + facebook.daily.revenue + ', Impressions:', facebook.daily.impressions);
      }
      return dashboardData;
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      throw error;
    }
  }

  // Transform funnel data from external API format
  transformFunnelData(data) {
    // Handle different data formats that might come from APIs
    if (data.funnel) return data.funnel;
    if (data.pipeline) return data.pipeline;
    if (Array.isArray(data) && data.length > 0) {
      // Handle array format
      const latest = data[0];
      return {
        leads: latest.leads || 0,
        prospects: latest.prospects || 0,
        qualified: latest.qualified || 0,
        proposals: latest.proposals || 0,
        closed: latest.closed || 0,
        revenue: latest.revenue || 0
      };
    }
    return data;
  }

  // Transform goals data from external API format
  transformGoalsData(data) {
    if (data.goals) return data.goals;
    if (data.targets) return data.targets;
    return data;
  }

  // Close all connections
  async closeConnections() {
    console.log('🔌 Closing data service connections...');
    
    if (this.connections.postgres) {
      await this.connections.postgres.end();
    }
    
    if (this.connections.mysql) {
      await this.connections.mysql.end();
    }
    
    if (this.connections.mongodb) {
      await this.connections.mongodb.close();
    }
    
    console.log('✅ All connections closed');
  }
}

// Export singleton instance
const dataService = new DataService();
module.exports = dataService; 