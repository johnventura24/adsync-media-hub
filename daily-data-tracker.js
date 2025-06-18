const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class DailyDataTracker {
  constructor() {
    this.historyFile = path.join(__dirname, 'data', 'daily-history.json');
    this.maxRecords = parseInt(process.env.MAX_DAILY_RECORDS) || 30;
    this.enableHistory = process.env.ENABLE_DAILY_HISTORY === 'true';
    this.ensureDataDirectory();
  }

  // Ensure data directory exists
  async ensureDataDirectory() {
    const dataDir = path.join(__dirname, 'data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
      console.log('📁 Created data directory for daily tracking');
    }
  }

  // Save daily data (Google and Facebook SEPARATE)
  async saveDailyData(googleData, facebookData) {
    if (!this.enableHistory) {
      console.log('📊 Daily history tracking is disabled');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const dailyRecord = {
      date: today,
      timestamp: new Date().toISOString(),
      google: {
        daily: {
          date: today,
          impressions: googleData.impressions || 0,
          clicks: googleData.clicks || 0,
          leads: googleData.leads || 0,
          revenue: googleData.revenue || 0,
          adSpend: googleData.adSpend || 0,
          grossProfit: googleData.grossProfit || 0,
          ctr: googleData.ctr || 0,
          cpc: googleData.cpc || 0,
          roas: googleData.roas || 0,
          conversionRate: googleData.conversionRate || 0
        },
        performance: {
          profitability: googleData.grossProfit > 0 ? 'profitable' : 'unprofitable',
          efficiency: googleData.roas > 1 ? 'efficient' : 'inefficient',
          volume: googleData.impressions > 100000 ? 'high' : 'low'
        }
      },
      facebook: {
        daily: {
          date: today,
          impressions: facebookData.impressions || 0,
          clicks: facebookData.clicks || 0,
          leads: facebookData.leads || 0,
          revenue: facebookData.revenue || 0,
          adSpend: facebookData.adSpend || 0,
          grossProfit: facebookData.grossProfit || 0,
          ctr: facebookData.ctr || 0,
          cpc: facebookData.cpc || 0,
          roas: facebookData.roas || 0,
          conversionRate: facebookData.conversionRate || 0
        },
        performance: {
          profitability: facebookData.grossProfit > 0 ? 'profitable' : 'unprofitable',
          efficiency: facebookData.roas > 1 ? 'efficient' : 'inefficient',
          volume: facebookData.impressions > 100000 ? 'high' : 'low'
        }
      },
      // NO COMBINED DATA - Keep platforms completely separate
      comparison: {
        winningPlatform: googleData.grossProfit > facebookData.grossProfit ? 'google' : 'facebook',
        googleAdvantage: googleData.grossProfit - facebookData.grossProfit,
        recommendation: this.generateDailyRecommendation(googleData, facebookData)
      }
    };

    try {
      // Load existing history
      let history = [];
      try {
        const historyData = await fs.readFile(this.historyFile, 'utf8');
        history = JSON.parse(historyData);
      } catch {
        // File doesn't exist yet, start with empty array
        history = [];
      }

      // Remove existing record for today if it exists
      history = history.filter(record => record.date !== today);

      // Add new record
      history.unshift(dailyRecord);

      // Keep only the specified number of records
      if (history.length > this.maxRecords) {
        history = history.slice(0, this.maxRecords);
      }

      // Save updated history
      await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
      console.log(`✅ Daily data saved for ${today} (Google and Facebook separate)`);
      
      return dailyRecord;
    } catch (error) {
      console.error('❌ Error saving daily data:', error);
      throw error;
    }
  }

  // Generate daily recommendation based on performance
  generateDailyRecommendation(googleData, facebookData) {
    const googleROAS = googleData.roas || 0;
    const facebookROAS = facebookData.roas || 0;
    
    if (googleROAS > 1 && facebookROAS < 1) {
      return 'Shift 75% of budget to Google Ads - much better ROI';
    } else if (facebookROAS > 1 && googleROAS < 1) {
      return 'Shift 75% of budget to Facebook Ads - much better ROI';
    } else if (googleROAS > facebookROAS) {
      return `Google performing ${((googleROAS / facebookROAS - 1) * 100).toFixed(0)}% better - increase Google budget`;
    } else if (facebookROAS > googleROAS) {
      return `Facebook performing ${((facebookROAS / googleROAS - 1) * 100).toFixed(0)}% better - increase Facebook budget`;
    } else {
      return 'Both platforms performing similarly - maintain current budget split';
    }
  }

  // Get daily history (separate Google and Facebook)
  async getDailyHistory(days = 7) {
    if (!this.enableHistory) {
      return { google: [], facebook: [], message: 'Daily history tracking is disabled' };
    }

    try {
      const historyData = await fs.readFile(this.historyFile, 'utf8');
      const history = JSON.parse(historyData);
      
      // Get the specified number of days
      const recentHistory = history.slice(0, days);
      
      return {
        google: recentHistory.map(day => ({
          date: day.date,
          ...day.google.daily,
          performance: day.google.performance
        })),
        facebook: recentHistory.map(day => ({
          date: day.date,
          ...day.facebook.daily,
          performance: day.facebook.performance
        })),
        comparison: recentHistory.map(day => ({
          date: day.date,
          ...day.comparison
        })),
        totalDays: recentHistory.length
      };
    } catch (error) {
      console.log('📊 No daily history found, starting fresh tracking');
      return { google: [], facebook: [], comparison: [], totalDays: 0 };
    }
  }

  // Get today's data
  async getTodaysData() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const historyData = await fs.readFile(this.historyFile, 'utf8');
      const history = JSON.parse(historyData);
      
      const todaysRecord = history.find(record => record.date === today);
      
      if (todaysRecord) {
        return {
          date: today,
          google: todaysRecord.google,
          facebook: todaysRecord.facebook,
          comparison: todaysRecord.comparison,
          found: true
        };
      } else {
        return {
          date: today,
          google: null,
          facebook: null,
          comparison: null,
          found: false,
          message: 'No data recorded for today yet'
        };
      }
    } catch (error) {
      return {
        date: today,
        google: null,
        facebook: null,
        comparison: null,
        found: false,
        message: 'Daily tracking file not found'
      };
    }
  }

  // Get platform performance trends (NO COMBINING)
  async getPlatformTrends(days = 7) {
    const history = await this.getDailyHistory(days);
    
    if (history.totalDays === 0) {
      return {
        google: { trend: 'no_data', message: 'No historical data' },
        facebook: { trend: 'no_data', message: 'No historical data' }
      };
    }

    // Analyze Google trends
    const googleRevenues = history.google.map(day => day.revenue);
    const googleTrend = this.calculateTrend(googleRevenues);
    
    // Analyze Facebook trends
    const facebookRevenues = history.facebook.map(day => day.revenue);
    const facebookTrend = this.calculateTrend(facebookRevenues);

    return {
      google: {
        trend: googleTrend.direction,
        percentage: googleTrend.percentage,
        avgDailyRevenue: googleTrend.average,
        bestDay: history.google.reduce((best, day) => 
          day.revenue > best.revenue ? day : best
        ),
        recommendation: googleTrend.direction === 'up' ? 'Increase budget' : 'Optimize campaigns'
      },
      facebook: {
        trend: facebookTrend.direction,
        percentage: facebookTrend.percentage,
        avgDailyRevenue: facebookTrend.average,
        bestDay: history.facebook.reduce((best, day) => 
          day.revenue > best.revenue ? day : best
        ),
        recommendation: facebookTrend.direction === 'up' ? 'Increase budget' : 'Optimize campaigns'
      },
      comparison: {
        betterPerformer: googleTrend.average > facebookTrend.average ? 'google' : 'facebook',
        performanceDifference: Math.abs(googleTrend.average - facebookTrend.average)
      }
    };
  }

  // Calculate trend direction and percentage
  calculateTrend(values) {
    if (values.length < 2) {
      return { direction: 'neutral', percentage: 0, average: values[0] || 0 };
    }

    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const percentageChange = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    return {
      direction: percentageChange > 5 ? 'up' : percentageChange < -5 ? 'down' : 'neutral',
      percentage: Math.abs(percentageChange),
      average: average
    };
  }
}

// Export singleton instance
const dailyDataTracker = new DailyDataTracker();
module.exports = dailyDataTracker; 