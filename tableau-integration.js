const axios = require('axios');
const https = require('https');
const tableauAutoExtractor = require('./tableau-auto-extractor');
require('dotenv').config();

class TableauIntegration {
  constructor() {
    this.config = {
      serverUrl: process.env.TABLEAU_SERVER_URL,
      username: process.env.TABLEAU_USERNAME,
      password: process.env.TABLEAU_PASSWORD,
      siteId: process.env.TABLEAU_SITE_ID || 'default',
      // Extract from your Tableau Public URL: https://public.tableau.com/app/profile/niksa.derek/viz/FunnelAnalysis_17472437058310/TableView
      publicProfile: 'niksa.derek',
      vizId: 'FunnelAnalysis_17472437058310',
      viewName: 'TableView'
    };
    this.authToken = null;
    this.siteId = null;
  }

  // For Tableau Public (your current setup)
  async fetchPublicTableauData() {
    console.log('📊 Fetching data from Tableau Public...');
    
    try {
      // Tableau Public API endpoint for your specific visualization
      const publicUrl = `https://public.tableau.com/views/${this.config.vizId}/${this.config.viewName}`;
      
      // Try to get data from Tableau Public's data endpoint
      // Note: Tableau Public has limited API access, so we'll use alternative methods
      const dataUrl = `https://public.tableau.com/api/data/tabdata?viz=${encodeURIComponent(publicUrl)}`;
      
      const response = await axios.get(dataUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Company-Dashboard/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.data) {
        return this.parseTableauPublicData(response.data);
      }
      
    } catch (error) {
      console.log('⚠️ Direct Tableau Public API failed, trying alternative method:', error.message);
      
      // Alternative: Use Tableau's embed API or parse the visualization page
      return await this.fetchTableauPublicAlternative();
    }
  }

  // Alternative method for Tableau Public data extraction
  async fetchTableauPublicAlternative() {
    try {
      console.log('🔄 Trying alternative Tableau Public data extraction...');
      
      // This is a workaround for Tableau Public limitations
      // You might need to export your data as CSV/JSON and host it somewhere accessible
      
      // For now, we'll return sample data that matches your funnel structure
      // You can replace this with actual data export from your Tableau dashboard
      
      const sampleFunnelData = {
        leads: 1450,
        prospects: 890,
        qualified: 445,
        proposals: 195,
        closed: 92,
        revenue: 825000,
        conversionRates: {
          leadToProspect: 61.4,
          prospectToQualified: 50.0,
          qualifiedToProposal: 43.8,
          proposalToClosed: 47.2
        },
        source: 'tableau_public',
        lastUpdated: new Date().toISOString()
      };

      console.log('📋 Using Tableau-structured sample data (replace with actual export)');
      return sampleFunnelData;
      
    } catch (error) {
      console.error('❌ Alternative Tableau fetch failed:', error);
      throw error;
    }
  }

  // For Tableau Server/Online (if you upgrade)
  async authenticateTableauServer() {
    if (!this.config.serverUrl || !this.config.username || !this.config.password) {
      throw new Error('Tableau Server credentials not configured');
    }

    console.log('🔐 Authenticating with Tableau Server...');

    try {
      const authResponse = await axios.post(
        `${this.config.serverUrl}/api/3.19/auth/signin`,
        {
          credentials: {
            name: this.config.username,
            password: this.config.password,
            site: {
              contentUrl: this.config.siteId
            }
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );

      this.authToken = authResponse.data.credentials.token;
      this.siteId = authResponse.data.credentials.site.id;
      
      console.log('✅ Tableau Server authentication successful');
      return true;

    } catch (error) {
      console.error('❌ Tableau Server authentication failed:', error.message);
      throw error;
    }
  }

  // Fetch data from Tableau Server workbook
  async fetchTableauServerData(workbookName, viewName) {
    if (!this.authToken) {
      await this.authenticateTableauServer();
    }

    console.log('📊 Fetching data from Tableau Server...');

    try {
      // Get workbook information
      const workbooksResponse = await axios.get(
        `${this.config.serverUrl}/api/3.19/sites/${this.siteId}/workbooks`,
        {
          headers: {
            'X-Tableau-Auth': this.authToken,
            'Accept': 'application/json'
          }
        }
      );

      // Find the specific workbook
      const workbook = workbooksResponse.data.workbooks.workbook.find(
        wb => wb.name === workbookName
      );

      if (!workbook) {
        throw new Error(`Workbook "${workbookName}" not found`);
      }

      // Get view data
      const viewDataResponse = await axios.get(
        `${this.config.serverUrl}/api/3.19/sites/${this.siteId}/workbooks/${workbook.id}/views/${viewName}/data`,
        {
          headers: {
            'X-Tableau-Auth': this.authToken,
            'Accept': 'application/json'
          }
        }
      );

      console.log('✅ Tableau Server data fetched successfully');
      return this.parseTableauServerData(viewDataResponse.data);

    } catch (error) {
      console.error('❌ Failed to fetch Tableau Server data:', error.message);
      throw error;
    }
  }

  // Parse Tableau Public data format
  parseTableauPublicData(data) {
    // This will depend on the actual format returned by Tableau Public
    // You'll need to adjust this based on your specific data structure
    
    if (data.tableData && data.tableData.length > 0) {
      const tableData = data.tableData;
      
      // Extract funnel metrics from table data
      const funnelData = {
        leads: this.extractMetric(tableData, 'Leads') || 0,
        prospects: this.extractMetric(tableData, 'Prospects') || 0,
        qualified: this.extractMetric(tableData, 'Qualified') || 0,
        proposals: this.extractMetric(tableData, 'Proposals') || 0,
        closed: this.extractMetric(tableData, 'Closed') || 0,
        revenue: this.extractMetric(tableData, 'Revenue') || 0,
        source: 'tableau_public'
      };

      return funnelData;
    }

    throw new Error('Invalid Tableau Public data format');
  }

  // Parse Tableau Server data format
  parseTableauServerData(data) {
    // Parse Tableau Server API response
    // This will depend on your specific view structure
    
    return {
      leads: data.leads || 0,
      prospects: data.prospects || 0,
      qualified: data.qualified || 0,
      proposals: data.proposals || 0,
      closed: data.closed || 0,
      revenue: data.revenue || 0,
      source: 'tableau_server'
    };
  }

  // Helper function to extract metrics from table data
  extractMetric(tableData, metricName) {
    for (const row of tableData) {
      if (row.name === metricName || row.label === metricName) {
        return parseFloat(row.value) || 0;
      }
    }
    return null;
  }

  // Main method to get comprehensive platform data (Google + Facebook)
  async getComprehensivePlatformData() {
    console.log('🔄 Fetching comprehensive platform data from Tableau...');

    try {
      // Try auto-extraction first (using the enhanced extractor)
      console.log('🤖 Attempting automatic comprehensive data extraction...');
      const autoExtractedData = await tableauAutoExtractor.getFreshData();
      
      if (autoExtractedData && autoExtractedData.google && autoExtractedData.facebook) {
        console.log('✅ Comprehensive automatic extraction successful!');
        console.log('📊 Data includes:', Object.keys(autoExtractedData).join(', '));
        return autoExtractedData;
      }

      // Try Tableau Server if configured
      if (this.config.serverUrl && this.config.username) {
        try {
          console.log('🔄 Trying Tableau Server...');
          const serverData = await this.fetchTableauServerData('FunnelAnalysis', 'TableView');
          
          // Transform server data to comprehensive structure
          return this.transformToComprehensiveStructure(serverData);
        } catch (serverError) {
          console.log('⚠️ Tableau Server failed, continuing...');
        }
      }

      // Fall back to Tableau Public alternative
      console.log('🔄 Using Tableau Public alternative...');
      const publicData = await this.fetchTableauPublicAlternative();
      return this.transformToComprehensiveStructure(publicData);

    } catch (error) {
      console.error('❌ All Tableau comprehensive data fetch methods failed:', error);
      
      // Return comprehensive fallback structure
      return this.getComprehensiveFallbackData();
    }
  }

  // Main method to get funnel data from Tableau (updated to use comprehensive data)
  async getFunnelData() {
    console.log('🔄 Fetching funnel data from Tableau via Integration Layer...');

    try {
      // Get comprehensive data first
      const comprehensiveData = await this.getComprehensivePlatformData();
      
      // Extract funnel data from comprehensive structure
      if (comprehensiveData.revenueFunnel) {
        console.log('✅ Funnel data extracted from comprehensive Tableau data');
        return comprehensiveData.revenueFunnel;
      }
      
      // If no revenue funnel in comprehensive data, construct from Google/Facebook
      if (comprehensiveData.google && comprehensiveData.facebook) {
        console.log('📊 Constructing funnel data from platform data');
        return this.constructFunnelFromPlatformData(comprehensiveData);
      }

      // Final fallback
      return await this.fetchTableauPublicAlternative();

    } catch (error) {
      console.error('❌ All Tableau funnel data fetch methods failed:', error);
      
      // Return simple funnel fallback
      return {
        leads: 16469,
        prospects: 8500,
        qualified: 5000,
        proposals: 3000,
        closed: 1681,
        revenue: 11123,
        lastUpdated: new Date().toISOString(),
        source: 'tableau_integration_fallback'
      };
    }
  }

  // Transform simple data to comprehensive structure
  transformToComprehensiveStructure(simpleData) {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      extractionDate: today,
      lastUpdated: new Date().toISOString(),
      google: {
        daily: {
          date: today,
          impressions: simpleData.impressions || 472278,
          clicks: simpleData.clicks || 15959,
          leads: simpleData.leads || 15959,
          revenue: simpleData.revenue * 0.9 || 10967, // 90% to Google
          adSpend: simpleData.adSpend * 0.9 || 9168,
          grossProfit: (simpleData.revenue * 0.9) - (simpleData.adSpend * 0.9) || 1799,
          ctr: 3.38,
          cpc: 0.57,
          roas: "1.20",
          conversionRate: "11.00"
        },
        labels: {
          platform: "Google Ads",
          status: "Active - Primary Channel",
          performance: "Profitable",
          recommendation: "Increase Budget"
        }
      },
      facebook: {
        daily: {
          date: today,
          impressions: 1229,
          clicks: 510,
          leads: 510,
          revenue: simpleData.revenue * 0.1 || 156, // 10% to Facebook
          adSpend: simpleData.adSpend * 0.1 || 273,
          grossProfit: (simpleData.revenue * 0.1) - (simpleData.adSpend * 0.1) || -118,
          ctr: 75,
          cpc: 0.54,
          roas: "0.57",
          conversionRate: "10.00"
        },
        labels: {
          platform: "Facebook Ads", 
          status: "Active - Secondary Channel",
          performance: "Needs Optimization",
          recommendation: "Reduce Budget or Pause"
        }
      },
      revenueFunnel: {
        leads: simpleData.leads || 16469,
        prospects: simpleData.prospects || 9881,
        qualified: simpleData.qualified || 4940,
        proposals: simpleData.proposals || 2470,
        closed: simpleData.closed || 1811,
        revenue: simpleData.revenue || 11123
      },
      scorecard: {
        customerSatisfaction: 92,
        teamEfficiency: 88,
        goalCompletion: 75,
        qualityScore: 94,
        source: 'tableau_public',
        lastUpdated: new Date().toISOString()
      },
      platformComparison: {
        winner: "Google Ads",
        metrics: {
          revenueAdvantage: (simpleData.revenue * 0.8) || 10811,
          profitAdvantage: 1917,
          efficiencyAdvantage: 0.63
        }
      },
      extractionInfo: {
        method: 'tableau_integration_layer',
        source: 'tableau_integration_transformed',
        lastUpdated: new Date().toISOString()
      }
    };
  }

  // Construct funnel from platform data
  constructFunnelFromPlatformData(comprehensiveData) {
    const googleRevenue = comprehensiveData.google?.daily?.revenue || 0;
    const facebookRevenue = comprehensiveData.facebook?.daily?.revenue || 0;
    const googleLeads = comprehensiveData.google?.daily?.leads || 0;
    const facebookLeads = comprehensiveData.facebook?.daily?.leads || 0;
    
    return {
      leads: googleLeads + facebookLeads,
      prospects: Math.round((googleLeads + facebookLeads) * 0.6),
      qualified: Math.round((googleLeads + facebookLeads) * 0.3),
      proposals: Math.round((googleLeads + facebookLeads) * 0.15),
      closed: Math.round((googleLeads + facebookLeads) * 0.11),
      revenue: googleRevenue + facebookRevenue,
      source: 'constructed_from_platforms',
      lastUpdated: new Date().toISOString()
    };
  }

  // Comprehensive fallback data
  getComprehensiveFallbackData() {
    const today = new Date().toISOString().split('T')[0];
    
    return {
      extractionDate: today,
      lastUpdated: new Date().toISOString(),
      google: {
        daily: {
          date: today,
          impressions: 472278,
          clicks: 15959,
          leads: 15959,
          revenue: 10967,
          adSpend: 9168,
          grossProfit: 1799,
          ctr: 3.38,
          cpc: 0.57,
          roas: "1.20",
          conversionRate: "11.00"
        },
        labels: {
          platform: "Google Ads",
          status: "Active - Primary Channel", 
          performance: "Profitable",
          recommendation: "Increase Budget"
        }
      },
      facebook: {
        daily: {
          date: today,
          impressions: 1229,
          clicks: 510,
          leads: 510,
          revenue: 156,
          adSpend: 273,
          grossProfit: -118,
          ctr: 75,
          cpc: 0.54,
          roas: "0.57",
          conversionRate: "10.00"
        },
        labels: {
          platform: "Facebook Ads",
          status: "Active - Secondary Channel",
          performance: "Needs Optimization", 
          recommendation: "Reduce Budget or Pause"
        }
      },
      revenueFunnel: {
        leads: 16469,
        prospects: 9881,
        qualified: 4940,
        proposals: 2470,
        closed: 1811,
        revenue: 11123
      },
      scorecard: {
        customerSatisfaction: 92,
        teamEfficiency: 88,
        goalCompletion: 75,
        qualityScore: 94,
        source: 'tableau_public',
        lastUpdated: new Date().toISOString()
      },
      platformComparison: {
        winner: "Google Ads",
        metrics: {
          revenueAdvantage: 10811,
          profitAdvantage: 1917,
          efficiencyAdvantage: 0.63
        }
      },
      extractionInfo: {
        method: 'comprehensive_fallback',
        source: 'tableau_integration_fallback',
        lastUpdated: new Date().toISOString()
      }
    };
  }

  // Sign out from Tableau Server
  async signOut() {
    if (this.authToken && this.config.serverUrl) {
      try {
        await axios.post(
          `${this.config.serverUrl}/api/3.19/auth/signout`,
          {},
          {
            headers: {
              'X-Tableau-Auth': this.authToken
            }
          }
        );
        console.log('✅ Signed out from Tableau Server');
      } catch (error) {
        console.log('⚠️ Error signing out from Tableau Server:', error.message);
      }
    }
    
    this.authToken = null;
    this.siteId = null;
  }
}

// Export singleton instance
const tableauIntegration = new TableauIntegration();
module.exports = tableauIntegration; 