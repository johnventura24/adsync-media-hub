const axios = require('axios');
const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');
const csv = require('csv-parser');
const fs = require('fs');
// Import tableau integration layer instead of direct extractor
const tableauIntegration = require('./tableau-integration');
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

  // Fetch funnel data from various sources (ENHANCED to use tableau integration layer)
  async getFunnelData() {
    console.log('📊 Fetching funnel data via Tableau Integration Layer...');
    
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
    
    // Try Tableau Integration Layer (PROPER WAY - includes Google/Facebook processing)
    try {
      console.log('🔗 Using Tableau Integration Layer for comprehensive data...');
      const comprehensiveTableauData = await tableauIntegration.getComprehensivePlatformData();
      
      if (comprehensiveTableauData && comprehensiveTableauData.google && comprehensiveTableauData.facebook) {
        console.log('✅ Comprehensive Tableau data fetched via integration layer');
        console.log('📊 Data includes Google and Facebook platform data');
        return comprehensiveTableauData;
      }
      
      // If comprehensive data not available, try just funnel data
      const funnelData = await tableauIntegration.getFunnelData();
      if (funnelData) {
        console.log('✅ Funnel data fetched via Tableau integration layer');
        return funnelData;
      }
      
    } catch (error) {
      console.log('⚠️ Tableau Integration Layer fetch failed, trying other sources:', error.message);
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

  // Fetch goals data (ENHANCED to read from admin uploads)
  async getGoalsData() {
    console.log('🎯 Fetching goals data...');
    
    // First, try to get data from admin uploads (NINETY.IO ROCKS DATA)
      try {
      const uploadedRocks = await this.getAdminUploadedData('rocks');
      if (uploadedRocks && uploadedRocks.length > 0) {
        console.log('✅ Goals data fetched from admin uploaded rocks:', uploadedRocks.length, 'items');
        return this.transformRocksToGoalsData(uploadedRocks);
      }
      } catch (error) {
      console.log('⚠️ Admin uploaded rocks data not available:', error.message);
    }
    
    // Second, try API if configured
    if (this.config.apis.goalsData) {
      try {
        const response = await axios.get(this.config.apis.goalsData, { timeout: 10000 });
        console.log('✅ Goals data fetched from API');
        return response.data;
      } catch (error) {
        console.log('⚠️ Goals API fetch failed:', error.message);
      }
    }

    // Fallback to sample data
    console.log('📋 Using fallback sample data for goals');
    return {
      quarterlyTarget: 250000,
      currentProgress: 175000,
      percentageComplete: 70,
      daysRemaining: 45,
      dailyAverage: 3888,
      trend: 'up'
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

  // Fetch issues data (ENHANCED to read from admin uploads)
  async getIssuesData() {
    console.log('⚠️ Fetching issues data...');
    
    // First, try to get data from admin uploads (NINETY.IO ISSUES DATA)
    try {
      const uploadedIssues = await this.getAdminUploadedData('issues');
      if (uploadedIssues && uploadedIssues.length > 0) {
        console.log('✅ Issues data fetched from admin uploads:', uploadedIssues.length, 'items');
        return this.transformIssuesData(uploadedIssues);
      }
    } catch (error) {
      console.log('⚠️ Admin uploaded issues data not available:', error.message);
    }
    
    // Second, try API if configured
    if (this.config.apis.issuesData) {
      try {
        const response = await axios.get(this.config.apis.issuesData, { timeout: 10000 });
        console.log('✅ Issues data fetched from API');
        return response.data;
      } catch (error) {
        console.log('⚠️ Issues API fetch failed:', error.message);
      }
    }

    // Fallback to sample data
    console.log('📋 Using fallback sample data for issues');
    return {
      totalIssues: 12,
      resolvedIssues: 8,
      pendingIssues: 4,
      criticalIssues: 1,
      resolutionRate: 67
    };
  }

  // Fetch scorecard data (ENHANCED to read from admin uploads)
  async getScorecardData() {
    console.log('📈 Fetching scorecard data...');
    
    // First, try to get data from admin uploads (NINETY.IO DATA)
    try {
      const uploadedScorecard = await this.getAdminUploadedData('scorecard');
      if (uploadedScorecard && uploadedScorecard.length > 0) {
        console.log('✅ Scorecard data fetched from admin uploads:', uploadedScorecard.length, 'items');
        return this.transformScorecardData(uploadedScorecard);
      }
    } catch (error) {
      console.log('⚠️ Admin uploaded scorecard data not available:', error.message);
    }
    
    // Second, try API if configured
    if (this.config.apis.scorecardData) {
      try {
        const response = await axios.get(this.config.apis.scorecardData, { timeout: 10000 });
        console.log('✅ Scorecard data fetched from API');
        return response.data;
      } catch (error) {
        console.log('⚠️ Scorecard API fetch failed:', error.message);
      }
    }

    // Fallback to sample data
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
      const [goals, funnelData, vto, issues, scorecard, leadershipTeam] = await Promise.all([
        this.getGoalsData(),
        this.getFunnelData(),
        this.getVTOData(),
        this.getIssuesData(),
        this.getScorecardData(),
        this.getLeadershipTeamData()
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
        revenueFunnel = {
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
        leadershipTeam: leadershipTeam,
        
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

  // ============================================================================
  // NINETY.IO INTEGRATION FOR LEADERSHIP TEAM
  // ============================================================================

  // Get leadership team data (Manual system - no Ninety.io API)
  async getLeadershipTeamData() {
    console.log('👥 Fetching leadership team data (Manual System)...');
    
    // Try local database storage first (primary source for manual system)
    try {
      const dbData = await this.fetchLeadershipFromDatabase();
      if (dbData && dbData.leaders && dbData.leaders.length > 0) {
        console.log('✅ Leadership team data fetched from database');
        return {
          leaders: dbData.leaders,
          lastUpdated: dbData.lastUpdated || new Date().toISOString(),
          source: 'database'
        };
      }
    } catch (error) {
      console.log('⚠️ Database fetch error:', error.message);
    }

    // Try environment variables as backup
    if (process.env.LEADERSHIP_TEAM_DATA) {
      try {
        const envData = JSON.parse(process.env.LEADERSHIP_TEAM_DATA);
        console.log('✅ Leadership team data fetched from environment variables');
        return {
          leaders: envData.leaders || envData,
          lastUpdated: new Date().toISOString(),
          source: 'environment'
        };
      } catch (error) {
        console.log('⚠️ Environment variable parsing error:', error.message);
      }
    }

    // Return sample data as fallback
    console.log('📝 Using sample leadership team data (Upload your data to replace this)');
    return {
      leaders: this.getSampleLeadershipData(),
      lastUpdated: new Date().toISOString(),
      source: 'sample'
    };
  }

  // Fetch leadership data from Ninety.io API
  async fetchFromNinetyIO() {
    const ninetyConfig = {
      baseUrl: process.env.NINETY_API_URL || 'https://api.ninety.io/v1',
      apiKey: process.env.NINETY_API_KEY,
      accountId: process.env.NINETY_ACCOUNT_ID
    };

    if (!ninetyConfig.apiKey || !ninetyConfig.accountId) {
      throw new Error('Ninety.io API credentials not configured');
    }

    const response = await axios.get(`${ninetyConfig.baseUrl}/accounts/${ninetyConfig.accountId}/people`, {
      headers: {
        'Authorization': `Bearer ${ninetyConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      return this.transformNinetyIOData(response.data);
    }
    
    throw new Error(`Ninety.io API error: ${response.status}`);
  }

  // Transform Ninety.io data format to our format
  transformNinetyIOData(ninetyData) {
    if (!ninetyData || !ninetyData.people) {
      return { leaders: [] };
    }

    const leaders = ninetyData.people
      .filter(person => person.role && person.role.toLowerCase().includes('leader') || person.isLeader)
      .map(person => ({
        id: person.id || Date.now().toString(),
        name: person.name || `${person.firstName} ${person.lastName}`,
        role: person.role || person.title,
        department: this.mapNinetyDepartment(person.department),
        email: person.email,
        phone: person.phone,
        goals: person.goals || person.objectives,
        metrics: person.metrics || person.kpis,
        status: person.status || 'active',
        ninetyId: person.id
      }));

    return { leaders };
  }

  // Map Ninety.io department names to our department system
  mapNinetyDepartment(ninetyDepartment) {
    if (!ninetyDepartment) return 'executive';
    
    const deptMap = {
      'Executive': 'executive',
      'Marketing': 'marketing',
      'Sales': 'sales',
      'Operations': 'operations',
      'Finance': 'finance',
      'HR': 'hr',
      'Human Resources': 'hr',
      'Technology': 'technology',
      'IT': 'technology',
      'Creative': 'creative',
      'Design': 'creative'
    };
    
    return deptMap[ninetyDepartment] || 'executive';
  }

  // Fetch leadership data from local database
  async fetchLeadershipFromDatabase() {
    // Try different database connections
    if (this.connections.postgres) {
      try {
        const result = await this.connections.postgres.query(
          'SELECT * FROM leadership_team ORDER BY created_at DESC'
        );
        return { leaders: result.rows };
      } catch (error) {
        console.log('⚠️ PostgreSQL leadership fetch error:', error.message);
      }
    }

    if (this.connections.mysql) {
      try {
        const [rows] = await this.connections.mysql.execute(
          'SELECT * FROM leadership_team ORDER BY created_at DESC'
        );
        return { leaders: rows };
      } catch (error) {
        console.log('⚠️ MySQL leadership fetch error:', error.message);
      }
    }

    if (this.connections.mongodb) {
      try {
        const db = this.connections.mongodb.db(this.config.mongodb.database);
        const leaders = await db.collection('leadership_team').find({}).toArray();
        return { leaders };
      } catch (error) {
        console.log('⚠️ MongoDB leadership fetch error:', error.message);
      }
    }

    return null;
  }

  // Save leadership team member to database
  async saveLeadershipToDatabase(leaderData) {
    const leader = {
      ...leaderData,
      id: leaderData.id || Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Try different database connections
    if (this.connections.postgres) {
      try {
        const query = `
          INSERT INTO leadership_team (id, name, role, department, email, phone, goals, metrics, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          department = EXCLUDED.department,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          goals = EXCLUDED.goals,
          metrics = EXCLUDED.metrics,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
          RETURNING *
        `;
        
        const result = await this.connections.postgres.query(query, [
          leader.id, leader.name, leader.role, leader.department, leader.email,
          leader.phone, leader.goals, leader.metrics, leader.status,
          leader.created_at, leader.updated_at
        ]);
        
        return result.rows[0];
      } catch (error) {
        console.log('⚠️ PostgreSQL leadership save error:', error.message);
      }
    }

    if (this.connections.mysql) {
      try {
        const query = `
          INSERT INTO leadership_team (id, name, role, department, email, phone, goals, metrics, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          role = VALUES(role),
          department = VALUES(department),
          email = VALUES(email),
          phone = VALUES(phone),
          goals = VALUES(goals),
          metrics = VALUES(metrics),
          status = VALUES(status),
          updated_at = VALUES(updated_at)
        `;
        
        await this.connections.mysql.execute(query, [
          leader.id, leader.name, leader.role, leader.department, leader.email,
          leader.phone, leader.goals, leader.metrics, leader.status,
          leader.created_at, leader.updated_at
        ]);
        
        return leader;
      } catch (error) {
        console.log('⚠️ MySQL leadership save error:', error.message);
      }
    }

    if (this.connections.mongodb) {
      try {
        const db = this.connections.mongodb.db(this.config.mongodb.database);
        const result = await db.collection('leadership_team').replaceOne(
          { id: leader.id },
          leader,
          { upsert: true }
        );
        
        return leader;
      } catch (error) {
        console.log('⚠️ MongoDB leadership save error:', error.message);
      }
    }

    throw new Error('No database connection available for saving leadership data');
  }

  // Delete leadership team member from database
  async deleteLeadershipFromDatabase(leaderId) {
    if (this.connections.postgres) {
      try {
        const result = await this.connections.postgres.query(
          'DELETE FROM leadership_team WHERE id = $1 RETURNING *',
          [leaderId]
        );
        return result.rows[0];
      } catch (error) {
        console.log('⚠️ PostgreSQL leadership delete error:', error.message);
      }
    }

    if (this.connections.mysql) {
      try {
        await this.connections.mysql.execute(
          'DELETE FROM leadership_team WHERE id = ?',
          [leaderId]
        );
        return { id: leaderId };
      } catch (error) {
        console.log('⚠️ MySQL leadership delete error:', error.message);
      }
    }

    if (this.connections.mongodb) {
      try {
        const db = this.connections.mongodb.db(this.config.mongodb.database);
        const result = await db.collection('leadership_team').deleteOne({ id: leaderId });
        return { id: leaderId, deleted: result.deletedCount > 0 };
      } catch (error) {
        console.log('⚠️ MongoDB leadership delete error:', error.message);
      }
    }

    throw new Error('No database connection available for deleting leadership data');
  }

  // Get sample leadership data for fallback
  getSampleLeadershipData() {
    return [
      {
        id: '1',
        name: 'John Smith',
        role: 'Chief Executive Officer',
        department: 'executive',
        email: 'john.smith@company.com',
        phone: '+1-555-0101',
        goals: 'Drive company growth by 25% this quarter and expand into new markets',
        metrics: 'Revenue growth, market expansion, team satisfaction',
        status: 'active'
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        role: 'Chief Marketing Officer',
        department: 'marketing',
        email: 'sarah.johnson@company.com',
        phone: '+1-555-0102',
        goals: 'Increase brand awareness by 40% and improve lead generation',
        metrics: 'Brand awareness, lead quality, conversion rates',
        status: 'active'
      },
      {
        id: '3',
        name: 'Michael Chen',
        role: 'Chief Technology Officer',
        department: 'technology',
        email: 'michael.chen@company.com',
        phone: '+1-555-0103',
        goals: 'Modernize tech stack and improve system reliability to 99.9%',
        metrics: 'System uptime, deployment frequency, security score',
        status: 'active'
      },
      {
        id: '4',
        name: 'Emily Davis',
        role: 'Chief Financial Officer',
        department: 'finance',
        email: 'emily.davis@company.com',
        phone: '+1-555-0104',
        goals: 'Optimize cash flow and reduce operational costs by 15%',
        metrics: 'Cash flow, cost reduction, profit margins',
        status: 'active'
      },
      {
        id: '5',
        name: 'David Wilson',
        role: 'VP of Sales',
        department: 'sales',
        email: 'david.wilson@company.com',
        phone: '+1-555-0105',
        goals: 'Exceed sales targets by 20% and improve customer retention',
        metrics: 'Sales revenue, customer retention, deal closure rate',
        status: 'active'
      }
    ];
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

  // Generic query method for database operations
  async query(queryString, values = []) {
    console.log('🔍 Executing database query:', queryString.substring(0, 100) + '...');
    
    // Try PostgreSQL first
    if (this.connections.postgres) {
      try {
        const result = await this.connections.postgres.query(queryString, values);
        console.log('✅ PostgreSQL query successful');
        return result;
      } catch (error) {
        console.error('❌ PostgreSQL query failed:', error.message);
        throw error;
      }
    }

    // Try MySQL if PostgreSQL is not available
    if (this.connections.mysql) {
      try {
        const [rows] = await this.connections.mysql.execute(queryString, values);
        console.log('✅ MySQL query successful');
        return { rows };
      } catch (error) {
        console.error('❌ MySQL query failed:', error.message);
        throw error;
      }
    }

    // If no database connections available
    throw new Error('No database connections available. Please check your database configuration.');
  }

  // HELPER: Get data uploaded through admin interface
  async getAdminUploadedData(dataType) {
    console.log(`📂 Loading admin uploaded ${dataType} data...`);
    
    try {
             // First, try to read from database if available
       if (this.connections.postgres || this.connections.mysql || this.connections.mongodb) {
         try {
           const tableName = `ninety_${dataType}`;
           let result = null;
           
           if (this.connections.postgres) {
             result = await this.connections.postgres.query(`SELECT * FROM ${tableName} ORDER BY created_date DESC`);
           } else if (this.connections.mysql) {
             const [rows] = await this.connections.mysql.execute(`SELECT * FROM ${tableName} ORDER BY created_date DESC`);
             result = { rows: rows };
           }
           
           if (result && result.rows && result.rows.length > 0) {
             console.log(`✅ Found ${result.rows.length} ${dataType} records in database`);
             return result.rows;
           }
         } catch (dbError) {
           console.log(`⚠️ Database query failed for ${dataType}:`, dbError.message);
         }
       }
      
      // Fallback to JSON file
      const fs = require('fs').promises;
      const path = require('path');
      const filePath = path.join(__dirname, 'data', `ninety_${dataType}.json`);
      
      try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(fileContent);
        
        if (data && data.length > 0) {
          console.log(`✅ Found ${data.length} ${dataType} records in file`);
          return data;
        }
      } catch (fileError) {
        console.log(`⚠️ File read failed for ${dataType}:`, fileError.message);
      }
      
      console.log(`📋 No admin uploaded ${dataType} data found`);
      return null;
      
    } catch (error) {
      console.error(`❌ Error loading admin uploaded ${dataType} data:`, error);
      return null;
    }
  }

  // Transform uploaded scorecard data for dashboard display
  transformScorecardData(uploadedData) {
    if (!uploadedData || uploadedData.length === 0) {
      return {
        customerSatisfaction: 0,
        teamEfficiency: 0,
        goalCompletion: 0,
        qualityScore: 0
      };
    }
    
    // Get the most recent scorecard data
    const latestScorecard = uploadedData[0];
    
    // Transform based on your uploaded scorecard structure
    return {
      customerSatisfaction: latestScorecard.customer_satisfaction || latestScorecard['Customer Satisfaction'] || 0,
      teamEfficiency: latestScorecard.team_efficiency || latestScorecard['Team Efficiency'] || 0,
      goalCompletion: latestScorecard.goal_completion || latestScorecard['Goal Completion'] || 0,
      qualityScore: latestScorecard.quality_score || latestScorecard['Quality Score'] || 0,
      lastUpdated: latestScorecard.updated_date || latestScorecard.created_date || new Date().toISOString(),
      recordCount: uploadedData.length
    };
  }

  // Transform uploaded rocks data for goals display
  transformRocksToGoalsData(uploadedData) {
    if (!uploadedData || uploadedData.length === 0) {
      return {
        quarterlyTarget: 250000,
        currentProgress: 175000,
        percentageComplete: 70,
        daysRemaining: 45,
        dailyAverage: 3888,
        trend: 'up'
      };
    }

    const latestRocks = uploadedData[0];

    return {
      quarterlyTarget: latestRocks.quarterly_target || latestRocks['Quarterly Target'] || 250000,
      currentProgress: latestRocks.current_progress || latestRocks['Current Progress'] || 175000,
      percentageComplete: latestRocks.percentage_complete || latestRocks['Percentage Complete'] || 70,
      daysRemaining: latestRocks.days_remaining || latestRocks['Days Remaining'] || 45,
      dailyAverage: latestRocks.daily_average || latestRocks['Daily Average'] || 3888,
      trend: latestRocks.trend || 'up'
    };
  }

  // Transform uploaded issues data for issues display
  transformIssuesData(uploadedData) {
    if (!uploadedData || uploadedData.length === 0) {
      return {
        totalIssues: 12,
        resolvedIssues: 8,
        pendingIssues: 4,
        criticalIssues: 1,
        resolutionRate: 67
      };
    }

    const latestIssues = uploadedData[0];

    return {
      totalIssues: latestIssues.total_issues || latestIssues['Total Issues'] || 12,
      resolvedIssues: latestIssues.resolved_issues || latestIssues['Resolved Issues'] || 8,
      pendingIssues: latestIssues.pending_issues || latestIssues['Pending Issues'] || 4,
      criticalIssues: latestIssues.critical_issues || latestIssues['Critical Issues'] || 1,
      resolutionRate: latestIssues.resolution_rate || latestIssues['Resolution Rate'] || 67
    };
  }
}

// Export singleton instance
const dataService = new DataService();
module.exports = dataService; 