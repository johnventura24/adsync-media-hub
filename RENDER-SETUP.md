# 🚀 Render Deployment Guide with Data Integration

This guide shows you how to deploy your dashboard to Render with automatic data updates from your Tableau dashboard.

## 🎯 Render Environment Setup Options

### Option 1: Environment Variables (Recommended for Small Data)

**Perfect for:** Dashboard metrics, small datasets (< 4KB per variable)

#### Step 1: Export Your Tableau Data
1. Go to your Tableau dashboard: https://public.tableau.com/app/profile/niksa.derek/viz/FunnelAnalysis_17472437058310/TableView
2. Export data as JSON format
3. Compress the JSON (remove spaces)

#### Step 2: Set Render Environment Variables
In your Render dashboard, go to **Environment** tab and add:

```env
# DAILY Google and Facebook Data (COMPLETELY SEPARATE)
DAILY_FUNNEL_DATA={"date":"2024-06-06","google":{"daily":{"date":"2024-06-06","impressions":472278,"clicks":15959,"leads":15959,"revenue":10967,"adSpend":9168,"grossProfit":1799,"ctr":3.38,"cpc":0.57,"roas":1.20,"conversionRate":11.0}},"facebook":{"daily":{"date":"2024-06-06","impressions":1229,"clicks":510,"leads":510,"revenue":156,"adSpend":273,"grossProfit":-118,"ctr":75.0,"cpc":0.54,"roas":0.57,"conversionRate":10.0}}}

# Daily Goals (Separate for each platform)
DAILY_GOALS_DATA={"date":"2024-06-06","google":{"dailyTarget":12000,"dailyCurrent":10967,"achieved":91.4,"status":"good"},"facebook":{"dailyTarget":500,"dailyCurrent":156,"achieved":31.2,"status":"poor"}}

# Platform Comparison (NO COMBINING)
PLATFORM_COMPARISON={"date":"2024-06-06","winningPlatform":"google","googleDailyProfit":1799,"facebookDailyProfit":-118,"profitDifference":1917,"recommendation":"Shift 75% budget to Google, reduce Facebook by 50%"}

# Daily Tracking Settings
ENABLE_DAILY_HISTORY=true
MAX_DAILY_RECORDS=30
TRACK_DAILY_DATA=true

# Refresh Settings - DAILY UPDATES (8 AM each day)
DATA_REFRESH_INTERVAL=0 8 * * *
ENABLE_AUTO_REFRESH=true
ENABLE_TABLEAU_AUTO_EXTRACT=true
```

### Option 2: Static Data Files (For Larger Datasets)

#### Step 1: Create Data Files
Create these files in your project:

**`data/funnel.json`**:
```json
{
  "leads": 1250,
  "prospects": 875,
  "qualified": 425,
  "proposals": 180,
  "closed": 85,
  "revenue": 750000,
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

**`data/goals.json`**:
```json
{
  "quarterly": {
    "target": 1000000,
    "current": 750000,
    "percentage": 75
  },
  "monthly": {
    "target": 333333,
    "current": 280000,
    "percentage": 84
  }
}
```

#### Step 2: Update Data Service
I'll create a file-based data loader: 

### 📊 Platform-Specific Data Structure

Your data is now organized with **separate Google and Facebook metrics**:

#### Google Ads Performance:
- **Impressions**: 472,278 (higher volume)
- **Clicks**: 15,959 
- **Revenue**: $10,967
- **Ad Spend**: $9,168
- **Gross Profit**: $1,799 ✅ (positive ROI)
- **CTR**: 3.38%
- **CPC**: $0.57

#### Facebook Ads Performance:
- **Impressions**: 1,229 (lower volume)
- **Clicks**: 510
- **Revenue**: $156
- **Ad Spend**: $273
- **Gross Profit**: -$118 ❌ (negative ROI)
- **CTR**: 75.0% (much higher engagement)
- **CPC**: $0.54

#### Combined Totals:
- **Total Impressions**: 473,507
- **Total Clicks**: 16,469
- **Total Revenue**: $11,123
- **Total Ad Spend**: $9,441
- **Total Gross Profit**: $1,681

### 🔄 Automatic Updates

The system will now:
1. **Extract data automatically** from your Tableau dashboard every 30 minutes
2. **Keep Google and Facebook separate** - no more combining them
3. **Track platform-specific performance** - see which platform performs better
4. **Update your dashboard** with fresh data automatically

### 📈 What You'll See

Your dashboard will now show:
- **Google funnel** with its high-volume, profitable performance
- **Facebook funnel** with its high-engagement but unprofitable performance  
- **Combined totals** for overall business metrics
- **Platform comparison** to help optimize ad spend

This gives you much better insight into where to focus your advertising budget! 🎯

### 📊 Daily Platform Data Structure (NO COMBINING)

Your dashboard now tracks **daily performance for each platform separately**:

#### 📈 Google Ads Daily Performance:
- **Daily Impressions**: 472,278
- **Daily Clicks**: 15,959 
- **Daily Revenue**: $10,967
- **Daily Ad Spend**: $9,168
- **Daily Gross Profit**: $1,799 ✅ (PROFITABLE)
- **Daily CTR**: 3.38%
- **Daily CPC**: $0.57
- **Daily ROAS**: 1.20 (20% return)
- **Daily Conversion Rate**: 11.0%

#### 📊 Facebook Ads Daily Performance:
- **Daily Impressions**: 1,229
- **Daily Clicks**: 510
- **Daily Revenue**: $156
- **Daily Ad Spend**: $273
- **Daily Gross Profit**: -$118 ❌ (LOSING MONEY)
- **Daily CTR**: 75.0% (High engagement)
- **Daily CPC**: $0.54
- **Daily ROAS**: 0.57 (43% loss)
- **Daily Conversion Rate**: 10.0%

#### 🔍 Daily Platform Comparison:
- **Winning Platform**: Google (by $1,917 profit difference)
- **Google Daily Advantage**: $1,799 profit vs Facebook's -$118 loss
- **Daily Recommendation**: "Shift 75% budget to Google, reduce Facebook by 50%"

### 🔄 Automatic Daily Updates

The system will now:

1. **Extract data daily** at 8 AM from your Tableau dashboard
2. **Keep Google and Facebook completely separate** - NO combining ever
3. **Track daily performance trends** for each platform individually
4. **Store 30 days of history** to see trends
5. **Generate daily recommendations** based on actual performance
6. **Compare platforms daily** to optimize budget allocation

### 📈 What You'll See in Your Dashboard

#### Daily Performance Cards:
- **Google Daily Card**: Shows today's Google performance only
- **Facebook Daily Card**: Shows today's Facebook performance only
- **Platform Comparison**: Side-by-side daily comparison (no combining)

#### Historical Trends (Last 7-30 days):
- **Google Trend Chart**: Google's daily revenue, profit, ROAS trends
- **Facebook Trend Chart**: Facebook's daily revenue, profit, ROAS trends
- **Comparison Chart**: Which platform wins each day

#### Daily Recommendations:
- **Budget Allocation**: Based on yesterday's performance
- **Platform Focus**: Which platform to prioritize today
- **Campaign Optimization**: Specific suggestions for each platform

### 🎯 Daily Insights You'll Get

**Every morning you'll see:**
1. **Yesterday's Google performance** (separate metrics)
2. **Yesterday's Facebook performance** (separate metrics)  
3. **Which platform won yesterday** (by profit)
4. **Today's budget recommendation** (based on performance)
5. **7-day trend for each platform** (separate charts)
6. **30-day comparison** (which platform is more consistent)

**No more combined/averaged data** - you'll see exactly how each platform performs daily so you can make informed decisions about where to spend your advertising budget!

This gives you **crystal clear daily insights** into which platform deserves more of your budget based on actual daily performance! 🚀