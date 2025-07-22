// Initialize Socket.io connection
const socket = io();

// Authentication variables
let currentUser = null;
let currentTeam = null;
let authToken = null;
let isAuthenticated = false;

// API Helper Functions with Team Filtering
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentTeamId = user.currentTeamId || localStorage.getItem('currentTeamId');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    
    // Add team ID to query parameters for data filtering
    if (currentTeamId && !endpoint.includes('teamId') && !endpoint.includes('/auth/')) {
        const separator = endpoint.includes('?') ? '&' : '?';
        endpoint += `${separator}teamId=${currentTeamId}`;
    }
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    const response = await fetch(endpoint, mergedOptions);
    
    if (response.status === 401) {
        // Token expired or invalid, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('currentTeamId');
        showLoginForm();
        return;
    }
    
    return response;
}

// Update data loading functions to use team-based filtering
async function loadDashboardData(dateOrType = 'today') {
    console.log('🔄 Loading dashboard data for:', dateOrType);
    
    try {
        let response, data;
        
        if (dateOrType === 'today') {
            // Load current dashboard data with Tableau integration
            console.log('🌐 Fetching current dashboard data...');
            response = await fetch('/api/dashboard');
            
            if (!response.ok) {
                throw new Error(`Dashboard API responded with status: ${response.status}`);
            }
            
            data = await response.json();
            console.log('📊 Dashboard data received:', {
                hasGoogle: !!data.google,
                hasFacebook: !!data.facebook,
                hasRevenueFunnel: !!data.revenueFunnel,
                dataKeys: Object.keys(data)
            });
            
            // Update dashboard with comprehensive data
            updateDashboard(data);
            
        } else {
            // Load specific date data
            const effectiveDate = getEffectiveDataDate(dateOrType);
            console.log(`📅 Fetching data for specific date: ${effectiveDate}`);
            
            response = await fetch(`/api/daily-data/${effectiveDate}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                console.log('✅ Date-specific data loaded successfully');
                updateDashboardWithSingleDateData(result.data);
                
                if (effectiveDate !== dateOrType) {
                    const selectedDisplay = formatDateForDisplay(dateOrType);
                    const effectiveDisplay = formatDateForDisplay(effectiveDate);
                    document.getElementById('lastUpdated').textContent = 
                        `${selectedDisplay} - Showing data from ${effectiveDisplay} (most recent update)`;
                }
            } else {
                console.error('❌ No data available for date:', effectiveDate);
                showNoDataMessage(`No data available for ${formatDateForDisplay(effectiveDate)}`);
            }
        }
        
        // Update last updated timestamp
        updateLastUpdated(new Date().toISOString());
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showErrorMessage('Failed to load dashboard data. Please try refreshing the page.');
    }
}

let funnelChart;
let currentView = 'today'; // Track current view: 'today', 'summary', or specific date
let availableDates = []; // Store available dates for calendar
let currentCalendarDate = new Date(); // Current month/year being displayed
let selectedDates = []; // Selected date(s)
let selectionMode = 'single'; // 'single', 'range', or 'summary'
let calendarOpen = false;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeAuthentication();
});

// Authentication initialization
async function initializeAuthentication() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        
        if (data.authenticated) {
            currentUser = data.user;
            authToken = localStorage.getItem('authToken');
            isAuthenticated = true;
            showDashboard();
        } else {
            showAuthenticationForm();
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        showAuthenticationForm();
    }
}

// Show authentication form
function showAuthenticationForm() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('dashboard-container').style.display = 'none';
    
    // Set up form event listeners
    setupAuthenticationHandlers();
}

// Show dashboard
function showDashboard() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'flex';
    
    // Initialize dashboard functionality
    initializeDashboard();
}

// Initialize dashboard
function initializeDashboard() {
    initializeSidebarNavigation();
    initializeNinetyTabs();
    loadDashboardSnapshot();
    initializeRefreshButtons();
    loadUserProfile();
    loadUserTeams();
    setupUserMenuHandlers();
    // Show dashboard section by default
    switchToSection('dashboard');
}

// Load Dashboard Snapshot with sample data
function loadDashboardSnapshot() {
    // Quick Stats
    updateQuickStats({
        revenue: 125000,
        revenueChange: '+12.5%',
        profit: 45000,
        profitChange: '+8.3%',
        roas: 3.45,
        roasChange: '+15.2%',
        conversions: 1234,
        conversionsChange: '+22.1%'
    });
    
    // Ninety.io Summary
    updateNinetyData({
        rocks: {
            count: 8,
            progress: 67,
            onTrack: 5,
            atRisk: 3
        },
        todos: {
            count: 24,
            progress: 42,
            dueToday: 5,
            overdue: 2
        },
        issues: {
            count: 12,
            critical: 1,
            high: 3,
            medium: 5,
            low: 3
        },
        meetings: {
            count: 6,
            today: 2,
            week: 6,
            next: 'Daily Standup - 2:00 PM'
        }
    });
    
    // Recent Activity
    updateRecentActivity([
        {
            icon: 'fas fa-chart-line',
            text: 'Google Ads revenue increased by 15%',
            time: '2 hours ago'
        },
        {
            icon: 'fas fa-check-circle',
            text: 'Q1 Marketing Rock completed',
            time: '4 hours ago'
        },
        {
            icon: 'fas fa-exclamation-triangle',
            text: 'New critical issue reported',
            time: '6 hours ago'
        },
        {
            icon: 'fas fa-users',
            text: 'Weekly team meeting scheduled',
            time: '8 hours ago'
        },
        {
            icon: 'fas fa-upload',
            text: 'Platform data refreshed',
            time: '1 day ago'
        }
    ]);
}

// Update Quick Stats
function updateQuickStats(stats) {
    document.getElementById('totalRevenue').textContent = formatCurrency(stats.revenue);
    document.getElementById('revenueChange').textContent = stats.revenueChange;
    document.getElementById('totalProfit').textContent = formatCurrency(stats.profit);
    document.getElementById('profitChange').textContent = stats.profitChange;
    document.getElementById('avgROAS').textContent = stats.roas.toFixed(2);
    document.getElementById('roasChange').textContent = stats.roasChange;
    document.getElementById('totalConversions').textContent = formatNumber(stats.conversions);
    document.getElementById('conversionsChange').textContent = stats.conversionsChange;
}

// Update Ninety.io Data Summary
function updateNinetyData(data) {
    // Rocks
    document.getElementById('rocksCount').textContent = data.rocks.count;
    document.getElementById('rocksProgress').style.width = data.rocks.progress + '%';
    document.getElementById('rocksProgressText').textContent = data.rocks.progress + '% Complete';
    document.getElementById('rocksOnTrack').textContent = data.rocks.onTrack;
    document.getElementById('rocksAtRisk').textContent = data.rocks.atRisk;
    
    // To-Dos
    document.getElementById('todosCount').textContent = data.todos.count;
    document.getElementById('todosProgress').style.width = data.todos.progress + '%';
    document.getElementById('todosProgressText').textContent = data.todos.progress + '% Complete';
    document.getElementById('todosDueToday').textContent = data.todos.dueToday;
    document.getElementById('todosOverdue').textContent = data.todos.overdue;
    
    // Issues
    document.getElementById('issuesCount').textContent = data.issues.count;
    document.getElementById('issuesCritical').textContent = data.issues.critical;
    document.getElementById('issuesHigh').textContent = data.issues.high;
    document.getElementById('issuesMedium').textContent = data.issues.medium;
    document.getElementById('issuesLow').textContent = data.issues.low;
    
    // Meetings
    document.getElementById('meetingsCount').textContent = data.meetings.count;
    document.getElementById('meetingsToday').textContent = data.meetings.today;
    document.getElementById('meetingsWeek').textContent = data.meetings.week;
    document.getElementById('nextMeetingTime').textContent = data.meetings.next;
}

// Update Recent Activity
function updateRecentActivity(activities) {
    const activityFeed = document.getElementById('activityFeed');
    activityFeed.innerHTML = '';
    
    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `;
        activityFeed.appendChild(activityItem);
    });
}

// Add refresh functionality
document.addEventListener('DOMContentLoaded', function() {
    const refreshBtn = document.getElementById('refreshDashboardBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadDashboardSnapshot();
            
            // Visual feedback
            const icon = this.querySelector('i');
            icon.classList.add('fa-spin');
            setTimeout(() => {
                icon.classList.remove('fa-spin');
            }, 1000);
        });
    }
});

// Sidebar Navigation Handler
function initializeSidebarNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Update header title
            const headerTitle = document.querySelector('.header-title');
            const sectionName = this.querySelector('span').textContent;
            headerTitle.textContent = sectionName;
            
            // Handle section switching logic here
            const section = this.dataset.section;
            switchToSection(section);
        });
    });
}

// Section Switching Logic
function switchToSection(sectionName) {
    // Hide all sections first
    const sections = document.querySelectorAll('.dashboard-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Show relevant sections based on navigation
    switch(sectionName) {
        case 'dashboard':
            // Show only dashboard overview
            document.getElementById('dashboard-overview').style.display = 'block';
            break;
        case 'meetings':
            // Show only meetings section
            document.getElementById('meetings-section').style.display = 'block';
            break;
        case 'scorecard':
            // Show only scorecard section
            document.getElementById('scorecard-section').style.display = 'block';
            // Load actual scorecard data
            loadNinetyScorecard();
            break;
        case 'rocks':
            // Show only rocks section
            document.getElementById('rocks-section').style.display = 'block';
            // Load actual rocks data
            loadNinetyRocks();
            break;
        case 'todos':
            // Show only todos section
            document.getElementById('todos-section').style.display = 'block';
            // Load actual todos data
            loadNinetyTodos();
            break;
        case 'issues':
            // Show only issues section
            document.getElementById('issues-section').style.display = 'block';
            // Load actual issues data
            loadNinetyIssues();
            break;
        case 'google-ads':
            // Show only Google Ads section
            document.getElementById('google-ads-section').style.display = 'block';
            break;
        case 'facebook-ads':
            // Show only Facebook Ads section
            document.getElementById('facebook-ads-section').style.display = 'block';
            break;
        case 'analytics':
            // Show scorecard section for analytics
            document.getElementById('scorecard-section').style.display = 'block';
            break;
        case 'vision':
            // Show only vision section
            document.getElementById('vision-section').style.display = 'block';
            break;
        case 'org-chart':
            // Show only org chart section
            document.getElementById('org-chart-section').style.display = 'block';
            break;
        case 'knowledge':
            // Show only knowledge section
            document.getElementById('knowledge-section').style.display = 'block';
            break;
        default:
            // Default to dashboard view
            document.getElementById('dashboard-overview').style.display = 'block';
    }
}

// Initialize refresh buttons for all ninety data sections
function initializeRefreshButtons() {
    console.log('🔄 Initializing refresh buttons for Ninety.io sections...');
    
    // Add refresh button functionality for each section
    const refreshButtons = {
        'refreshTodos': loadNinetyTodos,
        'refreshRocks': loadNinetyRocks, 
        'refreshIssues': loadNinetyIssues,
        'refreshScorecard': loadNinetyScorecard
    };
    
    Object.keys(refreshButtons).forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                console.log(`🔄 Manual refresh triggered for ${buttonId}`);
                refreshButtons[buttonId]().finally(() => {
                    console.log(`✅ Manual refresh completed for ${buttonId}`);
                });
            });
            console.log(`✅ Refresh button initialized: ${buttonId}`);
        } else {
            console.log(`⚠️ Refresh button not found: ${buttonId}`);
        }
    });
    
    console.log('✅ All refresh buttons initialized');
}

// Helper function to show specific sections (deprecated in favor of direct switching)
function showSections(sectionIds) {
    // This function is now deprecated - use switchToSection instead
    console.warn('showSections is deprecated, use switchToSection instead');
}

// Initialize Ninety.io Tabs
function initializeNinetyTabs() {
    const tabs = document.querySelectorAll('.ninety-tab');
    const tabContents = document.querySelectorAll('.ninety-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.dataset.tab;
            
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            this.classList.add('active');
            document.getElementById(targetTab + 'Tab').classList.add('active');
        });
    });
}

// Switch to specific Ninety tab
function switchNinetyTab(tabName) {
    const tabs = document.querySelectorAll('.ninety-tab');
    const tabContents = document.querySelectorAll('.ninety-tab-content');
    
    // Map section names to tab names
    const tabMap = {
        'rocks': 'rocks',
        'todos': 'todos',
        'issues': 'issues'
    };
    
    const targetTab = tabMap[tabName] || tabName;
    
    // Remove active class from all tabs
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Add active class to target tab
    const targetTabElement = document.querySelector(`[data-tab="${targetTab}"]`);
    const targetContentElement = document.getElementById(targetTab + 'Tab');
    
    if (targetTabElement && targetContentElement) {
        targetTabElement.classList.add('active');
        targetContentElement.classList.add('active');
    }
}

// FIX NaN ISSUE: Format number as currency with NaN protection
function formatCurrency(num) {
    // Ensure we have a valid number, default to 0 if NaN/undefined/null
    const safeNum = (typeof num === 'number' && !isNaN(num)) ? num : 
                   (typeof num === 'string' && !isNaN(parseFloat(num))) ? parseFloat(num) : 0;
    
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(safeNum);
}

// FIX NaN ISSUE: Format number with commas with NaN protection
function formatNumber(num) {
    // Ensure we have a valid number, default to 0 if NaN/undefined/null
    const safeNum = (typeof num === 'number' && !isNaN(num)) ? num : 
                   (typeof num === 'string' && !isNaN(parseFloat(num))) ? parseFloat(num) : 0;
    
    return new Intl.NumberFormat('en-US').format(safeNum);
}

// Format percentage
function formatPercentage(num) {
    const safeNum = (typeof num === 'number' && !isNaN(num)) ? num : 
                   (typeof num === 'string' && !isNaN(parseFloat(num))) ? parseFloat(num) : 0;
    return safeNum.toFixed(2) + '%';
}

// Update last updated timestamp
function updateLastUpdated(timestamp) {
    const date = new Date(timestamp);
    const formatted = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('lastUpdated').textContent = formatted;
}

// NEW: Update Google Ads platform data (ENHANCED with debugging)
function updateGoogleAdsData(googleData) {
    console.log('🟢 Updating Google Ads data:', googleData);
    console.log('🟢 Google data structure:', {
        hasDaily: !!googleData.daily,
        hasLabels: !!googleData.labels,
        dailyKeys: googleData.daily ? Object.keys(googleData.daily) : 'none',
        impressions: googleData.daily?.impressions,
        revenue: googleData.daily?.revenue
    });
    
    const daily = googleData.daily || googleData;
    const labels = googleData.labels || {};
    
    // Debug: Check if elements exist
    const testElement = document.getElementById('googleImpressions');
    console.log('🟢 HTML element check - googleImpressions exists:', !!testElement);
    
    // Try both sets of IDs to ensure compatibility
    const impressionsElements = [
        document.getElementById('googleImpressions'),
        document.getElementById('googleAdsImpressions')
    ].filter(el => el !== null);
    
    const clicksElements = [
        document.getElementById('googleClicks'),
        document.getElementById('googleAdsClicks')
    ].filter(el => el !== null);
    
    const ctrElements = [
        document.getElementById('googleCTR'),
        document.getElementById('googleAdsCTR')
    ].filter(el => el !== null);
    
    const revenueElements = [
        document.getElementById('googleRevenue'),
        document.getElementById('googleAdsRevenue')
    ].filter(el => el !== null);
    
    const adSpendElements = [
        document.getElementById('googleAdSpend'),
        document.getElementById('googleAdsSpend')
    ].filter(el => el !== null);
    
    const profitElements = [
        document.getElementById('googleProfit'),
        document.getElementById('googleAdsProfit')
    ].filter(el => el !== null);
    
    console.log('🟢 Found elements:', {
        impressions: impressionsElements.length,
        clicks: clicksElements.length,
        ctr: ctrElements.length,
        revenue: revenueElements.length,
        adSpend: adSpendElements.length,
        profit: profitElements.length
    });
    
    // Update all found elements
    impressionsElements.forEach(el => {
        const formattedValue = formatNumber(daily.impressions || 0);
        console.log(`🟢 Setting impressions: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    clicksElements.forEach(el => {
        const formattedValue = formatNumber(daily.clicks || 0);
        console.log(`🟢 Setting clicks: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    ctrElements.forEach(el => {
        const formattedValue = formatPercentage(daily.ctr || 0);
        console.log(`🟢 Setting CTR: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    revenueElements.forEach(el => {
        const formattedValue = formatCurrency(daily.revenue || 0);
        console.log(`🟢 Setting revenue: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    adSpendElements.forEach(el => {
        const formattedValue = formatCurrency(daily.adSpend || 0);
        console.log(`🟢 Setting ad spend: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    profitElements.forEach(el => {
        const formattedValue = formatCurrency(daily.grossProfit || 0);
        console.log(`🟢 Setting profit: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    // Update performance metrics
    const roasElements = [
        document.getElementById('googleROAS'),
        document.getElementById('googleAdsROAS')
    ].filter(el => el !== null);
    
    const cpcElements = [
        document.getElementById('googleCPC'),
        document.getElementById('googleAdsCPC')
    ].filter(el => el !== null);
    
    const convRateElements = [
        document.getElementById('googleConvRate'),
        document.getElementById('googleAdsConvRate')
    ].filter(el => el !== null);
    
    roasElements.forEach(el => {
        const value = daily.roas || '0.00';
        console.log(`🟢 Setting ROAS: ${value}`);
        el.textContent = value;
    });
    
    cpcElements.forEach(el => {
        const formattedValue = formatCurrency(daily.cpc || 0);
        console.log(`🟢 Setting CPC: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    convRateElements.forEach(el => {
        const formattedValue = formatPercentage(daily.conversionRate || 0);
        console.log(`🟢 Setting conversion rate: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    // Update status and recommendation
    const statusElements = [
        document.getElementById('googleStatus'),
        document.getElementById('googleAdsStatus'),
        document.getElementById('googleAdsPerformance')
    ].filter(el => el !== null);
    
    const recommendationElements = [
        document.getElementById('googleRecommendation'),
        document.getElementById('googleAdsRecommendation')
    ].filter(el => el !== null);
    
    statusElements.forEach(el => {
        const value = labels.performance || labels.status || 'Active';
        console.log(`🟢 Setting status: ${value}`);
        el.textContent = value;
    });
    
    recommendationElements.forEach(el => {
        const value = labels.recommendation || 'Optimize campaigns';
        console.log(`🟢 Setting recommendation: ${value}`);
        el.textContent = value;
    });
    
    console.log('✅ Google Ads data updated successfully');
}

// NEW: Update Facebook Ads platform data (ENHANCED with debugging)
function updateFacebookAdsData(facebookData) {
    console.log('🔵 Updating Facebook Ads data:', facebookData);
    console.log('🔵 Facebook data structure:', {
        hasDaily: !!facebookData.daily,
        hasLabels: !!facebookData.labels,
        dailyKeys: facebookData.daily ? Object.keys(facebookData.daily) : 'none',
        impressions: facebookData.daily?.impressions,
        revenue: facebookData.daily?.revenue
    });
    
    const daily = facebookData.daily || facebookData;
    const labels = facebookData.labels || {};
    
    // Debug: Check if elements exist
    const testElement = document.getElementById('facebookImpressions');
    console.log('🔵 HTML element check - facebookImpressions exists:', !!testElement);
    
    // Try both sets of IDs to ensure compatibility
    const impressionsElements = [
        document.getElementById('facebookImpressions'),
        document.getElementById('facebookAdsImpressions')
    ].filter(el => el !== null);
    
    const clicksElements = [
        document.getElementById('facebookClicks'),
        document.getElementById('facebookAdsClicks')
    ].filter(el => el !== null);
    
    const ctrElements = [
        document.getElementById('facebookCTR'),
        document.getElementById('facebookAdsCTR')
    ].filter(el => el !== null);
    
    const revenueElements = [
        document.getElementById('facebookRevenue'),
        document.getElementById('facebookAdsRevenue')
    ].filter(el => el !== null);
    
    const adSpendElements = [
        document.getElementById('facebookAdSpend'),
        document.getElementById('facebookAdsSpend')
    ].filter(el => el !== null);
    
    const profitElements = [
        document.getElementById('facebookProfit'),
        document.getElementById('facebookAdsProfit')
    ].filter(el => el !== null);
    
    console.log('🔵 Found elements:', {
        impressions: impressionsElements.length,
        clicks: clicksElements.length,
        ctr: ctrElements.length,
        revenue: revenueElements.length,
        adSpend: adSpendElements.length,
        profit: profitElements.length
    });
    
    // Update all found elements
    impressionsElements.forEach(el => {
        const formattedValue = formatNumber(daily.impressions || 0);
        console.log(`🔵 Setting impressions: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    clicksElements.forEach(el => {
        const formattedValue = formatNumber(daily.clicks || 0);
        console.log(`🔵 Setting clicks: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    ctrElements.forEach(el => {
        const formattedValue = formatPercentage(daily.ctr || 0);
        console.log(`🔵 Setting CTR: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    revenueElements.forEach(el => {
        const formattedValue = formatCurrency(daily.revenue || 0);
        console.log(`🔵 Setting revenue: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    adSpendElements.forEach(el => {
        const formattedValue = formatCurrency(daily.adSpend || 0);
        console.log(`🔵 Setting ad spend: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    profitElements.forEach(el => {
        const formattedValue = formatCurrency(daily.grossProfit || 0);
        console.log(`🔵 Setting profit: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    // Update performance metrics
    const roasElements = [
        document.getElementById('facebookROAS'),
        document.getElementById('facebookAdsROAS')
    ].filter(el => el !== null);
    
    const cpcElements = [
        document.getElementById('facebookCPC'),
        document.getElementById('facebookAdsCPC')
    ].filter(el => el !== null);
    
    const convRateElements = [
        document.getElementById('facebookConvRate'),
        document.getElementById('facebookAdsConvRate')
    ].filter(el => el !== null);
    
    roasElements.forEach(el => {
        const value = daily.roas || '0.00';
        console.log(`🔵 Setting ROAS: ${value}`);
        el.textContent = value;
    });
    
    cpcElements.forEach(el => {
        const formattedValue = formatCurrency(daily.cpc || 0);
        console.log(`🔵 Setting CPC: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    convRateElements.forEach(el => {
        const formattedValue = formatPercentage(daily.conversionRate || 0);
        console.log(`🔵 Setting conversion rate: ${formattedValue}`);
        el.textContent = formattedValue;
    });
    
    // Update status and recommendation
    const statusElements = [
        document.getElementById('facebookStatus'),
        document.getElementById('facebookAdsStatus'),
        document.getElementById('facebookAdsPerformance')
    ].filter(el => el !== null);
    
    const recommendationElements = [
        document.getElementById('facebookRecommendation'),
        document.getElementById('facebookAdsRecommendation')
    ].filter(el => el !== null);
    
    statusElements.forEach(el => {
        const value = labels.performance || labels.status || 'Active';
        console.log(`🔵 Setting status: ${value}`);
        el.textContent = value;
    });
    
    recommendationElements.forEach(el => {
        const value = labels.recommendation || 'Optimize campaigns';
        console.log(`🔵 Setting recommendation: ${value}`);
        el.textContent = value;
    });
    
    console.log('✅ Facebook Ads data updated successfully');
}

// NEW: Update platform comparison
function updatePlatformComparison(comparisonData) {
    if (!comparisonData) return;
    
    // Winner display
    document.getElementById('winningPlatform').textContent = comparisonData.winner || 'Google Ads';
    
    // Advantages
    if (comparisonData.metrics) {
        document.getElementById('revenueAdvantage').textContent = formatCurrency(comparisonData.metrics.revenueAdvantage);
        document.getElementById('profitAdvantage').textContent = formatCurrency(comparisonData.metrics.profitAdvantage);
        document.getElementById('efficiencyAdvantage').textContent = comparisonData.metrics.efficiencyAdvantage || '0.00';
    }
    
    // Recommendations
    const recommendationsList = document.getElementById('recommendationsList');
    if (comparisonData.recommendations && Array.isArray(comparisonData.recommendations)) {
        recommendationsList.innerHTML = '';
        comparisonData.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            recommendationsList.appendChild(li);
        });
    }
}

// NEW: Update conversion rates
function updateConversionRates(funnelData) {
    if (funnelData.conversionRates) {
        document.getElementById('leadToProspect').textContent = formatPercentage(funnelData.conversionRates.leadToProspect);
        document.getElementById('prospectToQualified').textContent = formatPercentage(funnelData.conversionRates.prospectToQualified);
        document.getElementById('qualifiedToProposal').textContent = formatPercentage(funnelData.conversionRates.qualifiedToProposal);
        document.getElementById('proposalToClosed').textContent = formatPercentage(funnelData.conversionRates.proposalToClosed);
    }
}

// NEW: Update extraction info
function updateExtractionInfo(extractionInfo) {
    if (extractionInfo && extractionInfo.nextUpdate) {
        const nextUpdate = new Date(extractionInfo.nextUpdate);
        const formatted = nextUpdate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('extractionTime').textContent = `Next update: ${formatted}`;
    }
}

// Update goals section
function updateGoals(goals) {
    // Quarterly goal
    document.getElementById('quarterlyCurrent').textContent = formatCurrency(goals.quarterly.current);
    document.getElementById('quarterlyTarget').textContent = formatNumber(goals.quarterly.target);
    document.getElementById('quarterlyPercentage').textContent = goals.quarterly.percentage + '%';
    document.getElementById('quarterlyProgress').style.width = goals.quarterly.percentage + '%';
    
    // Monthly goal
    document.getElementById('monthlyCurrent').textContent = formatCurrency(goals.monthly.current);
    document.getElementById('monthlyTarget').textContent = formatNumber(goals.monthly.target);
    document.getElementById('monthlyPercentage').textContent = goals.monthly.percentage + '%';
    document.getElementById('monthlyProgress').style.width = goals.monthly.percentage + '%';
}

// Initialize funnel chart
function initializeFunnelChart(data) {
    const ctx = document.getElementById('funnelChart').getContext('2d');
    
    if (funnelChart) {
        funnelChart.destroy();
    }
    
    funnelChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Leads', 'Prospects', 'Qualified', 'Proposals', 'Closed'],
            datasets: [{
                label: 'Funnel Stage',
                data: [data.leads, data.prospects, data.qualified, data.proposals, data.closed],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(52, 152, 219, 0.8)',
                    'rgba(46, 204, 113, 0.8)',
                    'rgba(231, 76, 60, 0.8)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(118, 75, 162, 1)',
                    'rgba(52, 152, 219, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(231, 76, 60, 1)'
                ],
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Update revenue funnel
function updateRevenueFunnel(funnel) {
    document.getElementById('leads').textContent = formatNumber(funnel.leads);
    document.getElementById('prospects').textContent = formatNumber(funnel.prospects);
    document.getElementById('qualified').textContent = formatNumber(funnel.qualified);
    document.getElementById('proposals').textContent = formatNumber(funnel.proposals);
    document.getElementById('closed').textContent = formatNumber(funnel.closed);
    document.getElementById('revenue').textContent = formatCurrency(funnel.revenue);
    
    // Update conversion rates if available
    updateConversionRates(funnel);
    
    // Update chart
    if (funnelChart) {
        funnelChart.data.datasets[0].data = [
            funnel.leads, funnel.prospects, funnel.qualified, 
            funnel.proposals, funnel.closed
        ];
        funnelChart.update('none');
    }
}

// Update VTO tracking
function updateVTO(vto) {
    document.getElementById('vtoAvailable').textContent = vto.available;
    document.getElementById('vtoUsed').textContent = vto.used;
    document.getElementById('vtoPending').textContent = vto.pending;
    document.getElementById('vtoRemaining').textContent = vto.remaining;
}

// Update issues
function updateIssues(issues) {
    document.getElementById('totalIssues').textContent = issues.total;
    document.getElementById('criticalIssues').textContent = issues.critical;
    document.getElementById('highIssues').textContent = issues.high;
    document.getElementById('mediumIssues').textContent = issues.medium;
    document.getElementById('lowIssues').textContent = issues.low;
}

// Update scorecard (Enhanced to show admin uploaded data)
function updateScorecard(scorecard) {
    if (!scorecard) {
        console.warn('⚠️ No scorecard data provided');
        return;
    }
    
    console.log('📊 Updating scorecard with uploaded data:', scorecard);
    
    // Update scorecard metrics
    const customerSatElement = document.getElementById('customerSatisfaction');
    const teamEffElement = document.getElementById('teamEfficiency');
    const goalCompElement = document.getElementById('goalCompletion');
    const qualityScoreElement = document.getElementById('qualityScore');
    
    if (customerSatElement) {
        customerSatElement.textContent = scorecard.customerSatisfaction || 0;
    }
    
    if (teamEffElement) {
        teamEffElement.textContent = scorecard.teamEfficiency || 0;
    }
    
    if (goalCompElement) {
        goalCompElement.textContent = scorecard.goalCompletion || 0;
    }
    
    if (qualityScoreElement) {
        qualityScoreElement.textContent = scorecard.qualityScore || 0;
    }
    
    // Update circle colors based on score
    updateScoreCircle('customerSatisfactionCircle', scorecard.customerSatisfaction);
    updateScoreCircle('teamEfficiencyCircle', scorecard.teamEfficiency);  
    updateScoreCircle('goalCompletionCircle', scorecard.goalCompletion);
    updateScoreCircle('qualityScoreCircle', scorecard.qualityScore);
    
    // Show record count if available
    if (scorecard.recordCount) {
        const recordInfo = document.getElementById('scorecardRecordInfo');
        if (recordInfo) {
            recordInfo.textContent = `Based on ${scorecard.recordCount} uploaded records`;
            recordInfo.style.display = 'block';
        }
    }
    
    console.log('✅ Scorecard updated with admin uploaded data');
}

// Update score circle color based on value
function updateScoreCircle(elementId, score) {
    const element = document.getElementById(elementId);
    let color;
    
    if (score >= 90) {
        color = 'conic-gradient(#27ae60 0deg, #2ecc71 ' + (score * 3.6) + 'deg, #ecf0f1 ' + (score * 3.6) + 'deg)';
    } else if (score >= 75) {
        color = 'conic-gradient(#f39c12 0deg, #f1c40f ' + (score * 3.6) + 'deg, #ecf0f1 ' + (score * 3.6) + 'deg)';
    } else {
        color = 'conic-gradient(#e74c3c 0deg, #c0392b ' + (score * 3.6) + 'deg, #ecf0f1 ' + (score * 3.6) + 'deg)';
    }
    
    element.style.background = color;
}

// Update knowledge base
function updateKnowledgeBase(knowledgeBase) {
    const container = document.getElementById('knowledgeLinks');
    container.innerHTML = '';
    
    knowledgeBase.forEach(item => {
        const link = document.createElement('a');
        link.href = item.url;
        link.className = 'knowledge-link';
        link.target = '_blank';
        
        link.innerHTML = `
            <i class="fas fa-link"></i>
            <span class="title">${item.title}</span>
            <span class="category">${item.category}</span>
        `;
        
        container.appendChild(link);
    });
}

// ENHANCED: Update entire dashboard with comprehensive data
function updateDashboard(data) {
    console.log('🔄 Updating dashboard with comprehensive data...');
    console.log('📊 Data structure:', {
        google: !!data.google ? 'Available' : 'Missing',
        facebook: !!data.facebook ? 'Available' : 'Missing',
        revenueFunnel: !!data.revenueFunnel ? 'Available' : 'Missing',
        platformComparison: !!data.platformComparison ? 'Available' : 'Missing'
    });
    
    try {
        // Update platform-specific data first (MOST IMPORTANT)
        if (data.google) {
            console.log('🟢 Processing Google Ads data...');
            updateGoogleAdsData(data.google);
        } else {
            console.warn('⚠️ No Google Ads data available');
        }
        
        if (data.facebook) {
            console.log('🔵 Processing Facebook Ads data...');
            updateFacebookAdsData(data.facebook);
        } else {
            console.warn('⚠️ No Facebook Ads data available');
        }
        
        // Update platform comparison
        if (data.platformComparison) {
            console.log('⚖️ Processing platform comparison...');
            updatePlatformComparison(data.platformComparison);
        } else {
            console.warn('⚠️ No platform comparison data available');
        }
        
        // Update extraction info
        if (data.extractionInfo) {
            console.log('ℹ️ Processing extraction info...');
            updateExtractionInfo(data.extractionInfo);
        }
        
        // Update existing dashboard sections
        if (data.goals) updateGoals(data.goals);
        if (data.revenueFunnel) updateRevenueFunnel(data.revenueFunnel);
        if (data.vto) updateVTO(data.vto);
        if (data.issues) updateIssues(data.issues);
        if (data.scorecard) updateScorecard(data.scorecard);
        if (data.knowledgeBase) updateKnowledgeBase(data.knowledgeBase);
        if (data.leadershipTeam) updateLeadershipTeam(data.leadershipTeam);
        if (data.lastUpdated) updateLastUpdated(data.lastUpdated);
        
        console.log('✅ Dashboard update complete');
        
        // Force a visual update
        forceVisualUpdate();
        
    } catch (error) {
        console.error('❌ Error updating dashboard:', error);
        showErrorMessage('Error updating dashboard display');
    }
}

// Add function to force visual update
function forceVisualUpdate() {
    // Trigger a repaint to ensure all elements are updated
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
    
    // Also update any loading indicators
    const loadingIndicators = document.querySelectorAll('.loading, .spinner');
    loadingIndicators.forEach(indicator => {
        indicator.style.display = 'none';
    });
}

// Socket event listeners
socket.on('connect', () => {
    console.log('🔌 Connected to dashboard server');
});

socket.on('dashboardData', (data) => {
    console.log('🔄 Received comprehensive dashboard data');
    console.log('📊 Revenue funnel data:', data.revenueFunnel);
    console.log('🎯 Goals data:', data.goals);
    console.log('🔍 Google data:', data.google ? 'Available' : 'Not available');
    console.log('📘 Facebook data:', data.facebook ? 'Available' : 'Not available');
    console.log('⚖️ Platform comparison:', data.platformComparison ? 'Available' : 'Not available');
    
    updateDashboard(data);
    
    // Initialize funnel chart after data is loaded
    setTimeout(() => {
        initializeFunnelChart(data.revenueFunnel);
    }, 100);
});

socket.on('dashboardUpdate', (update) => {
    console.log('🔄 Received dashboard update:', update);
    
    if (update.section === 'all') {
        updateDashboard(update.data);
    } else {
        // Handle specific section updates
        switch (update.section) {
            case 'goals':
                updateGoals(update.data);
                break;
            case 'revenueFunnel':
                updateRevenueFunnel(update.data);
                break;
            case 'google':
                updateGoogleAdsData(update.data);
                break;
            case 'facebook':
                updateFacebookAdsData(update.data);
                break;
            case 'platformComparison':
                updatePlatformComparison(update.data);
                break;
            case 'vto':
                updateVTO(update.data);
                break;
            case 'issues':
                updateIssues(update.data);
                break;
            case 'scorecard':
                updateScorecard(update.data);
                break;
            case 'knowledgeBase':
                updateKnowledgeBase(update.data);
                break;
            case 'leadershipTeam':
                updateLeadershipTeam(update.data);
                break;
        }
        updateLastUpdated(new Date().toISOString());
    }
});

socket.on('disconnect', () => {
    console.log('🔌 Disconnected from dashboard server');
});

// Add some visual feedback for live updates
function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1000;
        font-size: 0.9rem;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    notification.textContent = 'Dashboard Updated with Fresh Data';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Show notification when data updates
socket.on('dashboardData', () => {
    setTimeout(showUpdateNotification, 500);
});

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Dashboard initialized - waiting for data...');
    
    // Initialize calendar selector
    setTimeout(initializeCalendar, 1000); // Wait a bit for the page to load
    
    // Add loading indicators
    const loadingElements = document.querySelectorAll('#googleImpressions, #facebookImpressions, #leads, #revenue');
    loadingElements.forEach(el => {
        if (el.textContent === '0') {
            el.textContent = 'Loading...';
        }
    });
});

// NEW: Calendar functionality for date selection
function initializeCalendar() {
    console.log('🗓️ Initializing calendar...');
    
    // Load available dates from the server
    loadAvailableDates();
    
    // Set up calendar event listeners
    setupCalendarEventListeners();
    
    // Initialize calendar display
    renderCalendar();
}

// Load available dates from the API
async function loadAvailableDates() {
    try {
        const response = await fetch('/api/available-dates');
        const result = await response.json();
        
        if (result.success && result.dates) {
            availableDates = result.dates;
            console.log('✅ Loaded', result.dates.length, 'available dates');
            renderCalendar(); // Re-render calendar with available dates
        } else {
            console.log('⚠️ No available dates found');
        }
    } catch (error) {
        console.error('❌ Error loading available dates:', error);
    }
}

// Set up all calendar event listeners
function setupCalendarEventListeners() {
    // Calendar toggle button
    const calendarToggle = document.getElementById('calendarToggle');
    const calendarDropdown = document.getElementById('calendarDropdown');
    
    if (calendarToggle && calendarDropdown) {
        calendarToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleCalendar();
        });
        
        // Close calendar when clicking outside
        document.addEventListener('click', function(e) {
            if (!calendarDropdown.contains(e.target) && !calendarToggle.contains(e.target)) {
                closeCalendar();
            }
        });
        
        // Prevent calendar from closing when clicking inside
        calendarDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    // Mode toggle buttons
    document.getElementById('singleDateMode')?.addEventListener('click', () => setSelectionMode('single'));
    document.getElementById('dateRangeMode')?.addEventListener('click', () => setSelectionMode('range'));
    document.getElementById('summaryMode')?.addEventListener('click', () => setSelectionMode('summary'));
    
    // Navigation buttons
    document.getElementById('prevMonth')?.addEventListener('click', () => navigateMonth(-1));
    document.getElementById('nextMonth')?.addEventListener('click', () => navigateMonth(1));
    
    // Action buttons
    document.getElementById('todayBtn')?.addEventListener('click', selectToday);
    document.getElementById('applySelection')?.addEventListener('click', applySelection);
}

// Calendar utility functions
function toggleCalendar() {
    const calendarDropdown = document.getElementById('calendarDropdown');
    const calendarToggle = document.getElementById('calendarToggle');
    
    if (calendarOpen) {
        closeCalendar();
    } else {
        openCalendar();
    }
}

function openCalendar() {
    const calendarDropdown = document.getElementById('calendarDropdown');
    const calendarToggle = document.getElementById('calendarToggle');
    
    calendarDropdown.style.display = 'block';
    calendarToggle.classList.add('active');
    calendarOpen = true;
    renderCalendar();
}

function closeCalendar() {
    const calendarDropdown = document.getElementById('calendarDropdown');
    const calendarToggle = document.getElementById('calendarToggle');
    
    calendarDropdown.style.display = 'none';
    calendarToggle.classList.remove('active');
    calendarOpen = false;
}

function setSelectionMode(mode) {
    selectionMode = mode;
    selectedDates = [];
    
    // Update mode toggle buttons
    document.querySelectorAll('.mode-toggle').forEach(btn => btn.classList.remove('active'));
    document.getElementById(mode === 'single' ? 'singleDateMode' : 
                          mode === 'range' ? 'dateRangeMode' : 'summaryMode')?.classList.add('active');
    
    if (mode === 'summary') {
        updateSelectedInfo('All days summary view');
        document.getElementById('applySelection').disabled = false;
    } else {
        updateSelectedInfo('Select a date to view data');
        document.getElementById('applySelection').disabled = true;
    }
    
    renderCalendar();
}

function navigateMonth(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    renderCalendar();
}

function selectToday() {
    const today = new Date();
    const todayStr = formatDateForAPI(today);
    
    if (selectionMode === 'single') {
        selectedDates = [todayStr];
        updateSelectedInfo(`Selected: ${formatDateForDisplay(todayStr)}`);
        document.getElementById('applySelection').disabled = false;
    }
    
    // Navigate to current month if not already there
    currentCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
    renderCalendar();
}

function renderCalendar() {
    const calendarDays = document.getElementById('calendarDays');
    const currentMonth = document.getElementById('currentMonth');
    
    if (!calendarDays || !currentMonth) return;
    
    // Update month/year display
    currentMonth.textContent = currentCalendarDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });
    
    // Clear existing days
    calendarDays.innerHTML = '';
    
    // Get first day of month and number of days
    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
    const lastDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
    const today = new Date();
    
    console.log('📅 Rendering calendar for:', currentCalendarDate.toLocaleDateString());
    console.log('📅 Today is:', today.toLocaleDateString());
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day other-month';
        calendarDays.appendChild(dayElement);
    }
    
    // Add days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        const currentDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
        const dateStr = formatDateForAPI(currentDate);
        
        // Debug logging for date conversion
        if (day === 18) { // Debug the specific date mentioned
            console.log(`🔍 Day ${day} debug:`, {
                currentDate: currentDate,
                dateStr: dateStr,
                formatted: formatDateForDisplay(dateStr),
                currentDateLocal: currentDate.toLocaleDateString(),
                currentDateISO: currentDate.toISOString()
            });
        }
        
        // Add classes based on date status
        if (isSameDay(currentDate, today)) {
            dayElement.classList.add('today');
        }
        
        if (availableDates.includes(dateStr)) {
            dayElement.classList.add('has-data');
        }
        
        if (selectedDates.includes(dateStr)) {
            dayElement.classList.add('selected');
        }
        
        if (selectionMode === 'range' && selectedDates.length === 2) {
            const startDate = new Date(selectedDates[0].split('-')[0], selectedDates[0].split('-')[1] - 1, selectedDates[0].split('-')[2]);
            const endDate = new Date(selectedDates[1].split('-')[0], selectedDates[1].split('-')[1] - 1, selectedDates[1].split('-')[2]);
            
            if (currentDate > startDate && currentDate < endDate) {
                dayElement.classList.add('in-range');
            }
            if (isSameDay(currentDate, startDate)) {
                dayElement.classList.add('range-start');
            }
            if (isSameDay(currentDate, endDate)) {
                dayElement.classList.add('range-end');
            }
        }
        
        // Add click handler
        dayElement.addEventListener('click', () => {
            console.log(`📅 Clicked date ${day}: ${dateStr} (formatted: ${formatDateForDisplay(dateStr)})`);
            handleDateClick(dateStr);
        });
        
        calendarDays.appendChild(dayElement);
    }
}

function handleDateClick(dateStr) {
    if (selectionMode === 'summary') return;
    
    if (selectionMode === 'single') {
        selectedDates = [dateStr];
        updateSelectedInfo(`Selected: ${formatDateForDisplay(dateStr)}`);
        document.getElementById('applySelection').disabled = false;
    } else if (selectionMode === 'range') {
        if (selectedDates.length === 0) {
            selectedDates = [dateStr];
            updateSelectedInfo(`Start: ${formatDateForDisplay(dateStr)}`);
        } else if (selectedDates.length === 1) {
            const startDate = new Date(selectedDates[0]);
            const endDate = new Date(dateStr);
            
            if (endDate < startDate) {
                selectedDates = [dateStr, selectedDates[0]];
            } else {
                selectedDates = [selectedDates[0], dateStr];
            }
            
            updateSelectedInfo(`Range: ${formatDateForDisplay(selectedDates[0])} - ${formatDateForDisplay(selectedDates[1])}`);
            document.getElementById('applySelection').disabled = false;
        } else {
            selectedDates = [dateStr];
            updateSelectedInfo(`Start: ${formatDateForDisplay(dateStr)}`);
            document.getElementById('applySelection').disabled = true;
        }
    }
    
    renderCalendar();
}

function updateSelectedInfo(text) {
    const selectedInfo = document.getElementById('selectedDateInfo');
    if (selectedInfo) {
        selectedInfo.textContent = text;
    }
}

function applySelection() {
    if (selectionMode === 'summary') {
        showSummaryView();
    } else if (selectionMode === 'single' && selectedDates.length === 1) {
        showSpecificDateView(selectedDates[0]);
    } else if (selectionMode === 'range' && selectedDates.length === 2) {
        showDateRangeView(selectedDates[0], selectedDates[1]);
    }
    
    closeCalendar();
}

// Date utility functions
function formatDateForAPI(date) {
    // Use local date components to avoid timezone shifts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateString) {
    // Parse date string correctly to avoid timezone issues
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayStr = formatDateForAPI(today);
    const yesterdayStr = formatDateForAPI(yesterday);
    
    if (dateString === todayStr) {
        return 'Today';
    } else if (dateString === yesterdayStr) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// NEW: Get the most recent Friday's date (for weekly updates)
function getMostRecentFridayDate() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
    
    let daysToSubtract;
    if (dayOfWeek === 5) { // Today is Friday
        daysToSubtract = 0;
    } else if (dayOfWeek === 6) { // Today is Saturday
        daysToSubtract = 1;
    } else { // Sunday (0) through Thursday (4)
        daysToSubtract = dayOfWeek === 0 ? 2 : dayOfWeek + 2; // If Sunday, go back 2 days, otherwise go back to previous Friday
    }
    
    const mostRecentFriday = new Date(today);
    mostRecentFriday.setDate(today.getDate() - daysToSubtract);
    return mostRecentFriday;
}

// NEW: Check if we should show most recent Friday data instead of selected date
function getEffectiveDataDate(selectedDate) {
    const [year, month, day] = selectedDate.split('-');
    const selected = new Date(year, month - 1, day); // Parse correctly to avoid timezone issues
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    console.log(`🗓️ Checking effective date for: ${selectedDate}, today is ${today.toLocaleDateString()}, day of week: ${dayOfWeek}`);
    
    // If today is Monday-Thursday, and selected date is this week, show most recent Friday
    if (dayOfWeek >= 1 && dayOfWeek <= 4) { // Monday to Thursday
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek + 1); // Monday of current week
        
        console.log(`📅 Current week starts: ${startOfWeek.toLocaleDateString()}`);
        console.log(`📅 Selected date: ${selected.toLocaleDateString()}`);
        
        if (selected >= startOfWeek && selected <= today) {
            const mostRecentFriday = getMostRecentFridayDate();
            const fridayDateStr = formatDateForAPI(mostRecentFriday);
            console.log(`✅ Using Friday data: ${fridayDateStr} instead of ${selectedDate}`);
            return fridayDateStr;
        }
    }
    
    console.log(`📅 Using original date: ${selectedDate}`);
    return selectedDate;
}

// Show today's view (default view)
function showTodayView() {
    currentView = 'today';
    
    // Hide summary section
    document.getElementById('summarySection').style.display = 'none';
    
    // Show all other sections
    showNormalSections();
    
    // Load today's data
    loadDashboardData('today');
}

// Show summary view with all historical data
function showSummaryView() {
    currentView = 'summary';
    
    // Show summary section
    document.getElementById('summarySection').style.display = 'block';
    
    // Hide other detailed sections (optional - you can keep them visible)
    hideDetailedSections();
    
    // Load summary data
    loadSummaryData();
}

// Show specific date view
function showSpecificDateView(date) {
    currentView = date;
    
    // Hide summary section
    document.getElementById('summarySection').style.display = 'none';
    
    // Show all other sections
    showNormalSections();
    
    // Load data for specific date
    loadDashboardData(date);
}

// Hide detailed sections when showing summary
function hideDetailedSections() {
    const sectionsToHide = [
        '.revenue-funnel',
        '.platform-comparison',
        '.goals-section',
        '.vto-section',
        '.issues-section',
        '.scorecard-section',
        '.knowledge-section',
        '.leadership-section',
        '.additional-sections'
    ];
    
    sectionsToHide.forEach(selector => {
        const section = document.querySelector(selector);
        if (section) {
            section.style.display = 'none';
        }
    });
}

// Show normal sections
function showNormalSections() {
    const sectionsToShow = [
        '.revenue-funnel',
        '.platform-comparison',
        '.goals-section',
        '.vto-section',
        '.issues-section',
        '.scorecard-section',
        '.knowledge-section',
        '.leadership-section',
        '.additional-sections'
    ];
    
    sectionsToShow.forEach(selector => {
        const section = document.querySelector(selector);
        if (section) {
            section.style.display = 'block';
        }
    });
}

// Load dashboard data for specific date or 'today'
async function loadDashboardData(date) {
    try {
        let url, response, data;
        
        if (date === 'today') {
            // Load current dashboard data
            url = '/api/dashboard';
            response = await fetch(url);
            data = await response.json();
            updateDashboard(data);
        } else {
            // Apply weekly Friday logic - get effective date
            const effectiveDate = getEffectiveDataDate(date);
            
            // Load specific date data
            url = `/api/daily-data/${effectiveDate}`;
            response = await fetch(url);
            const result = await response.json();
            
            if (result.success && result.data) {
                updateDashboardWithSingleDateData(result.data);
                
                // Show message if we're displaying Friday data for a weekday
                if (effectiveDate !== date) {
                    const selectedDisplay = formatDateForDisplay(date);
                    const effectiveDisplay = formatDateForDisplay(effectiveDate);
                    document.getElementById('lastUpdated').textContent = 
                        `${selectedDisplay} - Showing data from ${effectiveDisplay} (most recent update)`;
                } else {
                    console.log(`✅ Loaded data for ${date}`);
                }
            } else {
                console.error('❌ No data available for date:', effectiveDate);
                showNoDataMessage();
            }
        }
        
        // Update last updated timestamp
        updateLastUpdated(new Date().toISOString());
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showNoDataMessage();
    }
}

// NEW: Update dashboard with single date data
function updateDashboardWithSingleDateData(dateData) {
    // Update Google Ads data
    if (dateData.google) {
        updateGoogleAdsData(dateData.google);
    }
    
    // Update Facebook Ads data
    if (dateData.facebook) {
        updateFacebookAdsData(dateData.facebook);
    }
    
    // Update platform comparison
    if (dateData.comparison) {
        updatePlatformComparison(dateData.comparison);
    }
    
    // Update last updated to show the selected date
    document.getElementById('lastUpdated').textContent = `Data for ${formatDateForDisplay(dateData.date)}`;
}

// Load summary data for all days
async function loadSummaryData() {
    try {
        const response = await fetch('/api/summary-data');
        const summaryData = await response.json();
        
        updateSummaryDisplay(summaryData);
        
        // Update last updated timestamp
        updateLastUpdated(new Date().toISOString());
        
    } catch (error) {
        console.error('❌ Error loading summary data:', error);
    }
}

// Update summary display with aggregated data
function updateSummaryDisplay(summaryData) {
    // Update summary period
    document.getElementById('summaryPeriod').textContent = `Last ${summaryData.totalDays} days`;
    
    // Update total performance
    document.getElementById('totalRevenue').textContent = formatCurrency(summaryData.totals.revenue);
    document.getElementById('totalProfit').textContent = formatCurrency(summaryData.totals.profit);
    document.getElementById('totalAdSpend').textContent = formatCurrency(summaryData.totals.adSpend);
    document.getElementById('averageROAS').textContent = summaryData.totals.averageROAS.toFixed(2);
    
    // Update Google summary
    document.getElementById('googleTotalImpressions').textContent = formatNumber(summaryData.google.totalImpressions);
    document.getElementById('googleTotalRevenue').textContent = formatCurrency(summaryData.google.totalRevenue);
    document.getElementById('googleTotalProfit').textContent = formatCurrency(summaryData.google.totalProfit);
    document.getElementById('googleAvgROAS').textContent = summaryData.google.averageROAS.toFixed(2);
    
    // Update Facebook summary
    document.getElementById('facebookTotalImpressions').textContent = formatNumber(summaryData.facebook.totalImpressions);
    document.getElementById('facebookTotalRevenue').textContent = formatCurrency(summaryData.facebook.totalRevenue);
    document.getElementById('facebookTotalProfit').textContent = formatCurrency(summaryData.facebook.totalProfit);
    document.getElementById('facebookAvgROAS').textContent = summaryData.facebook.averageROAS.toFixed(2);
    
    // Update daily history table
    updateHistoryTable(summaryData.dailyHistory);
    
    // Update performance trends
    updatePerformanceTrends(summaryData.trends);
}

// Update the daily history table
function updateHistoryTable(dailyHistory) {
    const tableBody = document.getElementById('historyTableBody');
    tableBody.innerHTML = '';
    
    if (!dailyHistory || dailyHistory.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="10" class="loading-row">No historical data available</td>';
        tableBody.appendChild(row);
        return;
    }
    
    dailyHistory.forEach(day => {
        const row = document.createElement('tr');
        const winnerClass = day.comparison.winningPlatform === 'google' ? 'winner-google' : 'winner-facebook';
        const winnerText = day.comparison.winningPlatform === 'google' ? 'Google' : 'Facebook';
        
        row.innerHTML = `
            <td>${formatDateForDisplay(day.date)}</td>
            <td>${formatNumber(day.google.impressions)}</td>
            <td>${formatCurrency(day.google.revenue)}</td>
            <td>${formatCurrency(day.google.grossProfit)}</td>
            <td>${day.google.roas.toFixed(2)}</td>
            <td>${formatNumber(day.facebook.impressions)}</td>
            <td>${formatCurrency(day.facebook.revenue)}</td>
            <td>${formatCurrency(day.facebook.grossProfit)}</td>
            <td>${day.facebook.roas.toFixed(2)}</td>
            <td class="winner-cell ${winnerClass}">${winnerText}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Update performance trends
function updatePerformanceTrends(trends) {
    // Revenue trend
    const revenueTrend = trends.revenue;
    updateTrendIndicator('revenueTrend', revenueTrend);
    
    // ROAS trend
    const roasTrend = trends.roas;
    updateTrendIndicator('roasTrend', roasTrend);
    
    // Profit trend
    const profitTrend = trends.profit;
    updateTrendIndicator('profitTrend', profitTrend);
}

// Update a single trend indicator
function updateTrendIndicator(elementId, trendData) {
    const element = document.getElementById(elementId);
    const icon = element.querySelector('i');
    const span = element.querySelector('span');
    
    const percentage = trendData.percentage;
    const isPositive = percentage > 0;
    const isNegative = percentage < 0;
    
    // Update icon
    if (isPositive) {
        icon.className = 'fas fa-arrow-up';
        element.className = 'trend-indicator positive';
    } else if (isNegative) {
        icon.className = 'fas fa-arrow-down';
        element.className = 'trend-indicator negative';
    } else {
        icon.className = 'fas fa-minus';
        element.className = 'trend-indicator neutral';
    }
    
    // Update text
    const sign = isPositive ? '+' : '';
    span.textContent = `${sign}${percentage.toFixed(1)}%`;
}

// NEW: Show date range view
function showDateRangeView(startDate, endDate) {
    currentView = `range:${startDate}:${endDate}`;
    
    // Hide summary section
    document.getElementById('summarySection').style.display = 'none';
    
    // Show all other sections
    showNormalSections();
    
    // Load data for date range
    loadDateRangeData(startDate, endDate);
}

// NEW: Load date range data
async function loadDateRangeData(startDate, endDate) {
    try {
        console.log(`🔍 Loading date range data: ${startDate} to ${endDate}`);
        const response = await fetch(`/api/date-range/${startDate}/${endDate}`);
        const result = await response.json();
        
        console.log('📊 Date range API response:', result);
        
        if (result.success && result.data) {
            // Check if we have actual data
            if (result.data.google && result.data.google.length > 0) {
                updateDashboardWithRangeData(result.data);
                console.log(`✅ Loaded date range data: ${startDate} to ${endDate} (${result.daysInRange} days)`);
            } else {
                console.warn('⚠️ No data found in date range');
                showNoDataMessage();
                document.getElementById('lastUpdated').textContent = 
                    `No data available for range: ${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`;
            }
        } else {
            console.error('❌ Failed to load date range data:', result.error || 'Unknown error');
            showNoDataMessage();
            document.getElementById('lastUpdated').textContent = 
                `Failed to load data for range: ${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`;
        }
    } catch (error) {
        console.error('❌ Error loading date range data:', error);
        showNoDataMessage();
        document.getElementById('lastUpdated').textContent = 
            `Error loading range: ${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`;
    }
}

// NEW: Update dashboard with date range data
function updateDashboardWithRangeData(rangeData) {
    console.log('📊 Processing range data:', rangeData);
    
    // Check if we have the expected data structure
    if (!rangeData || (!rangeData.google && !rangeData.totals)) {
        console.error('❌ Invalid range data structure');
        showNoDataMessage();
        return;
    }
    
    // Initialize data containers
    let googleTotals = {
        impressions: 0,
        clicks: 0,
        revenue: 0,
        adSpend: 0,
        profit: 0
    };
    
    let facebookTotals = {
        impressions: 0,
        clicks: 0,
        revenue: 0,
        adSpend: 0,
        profit: 0
    };
    
    let googleDaysCount = 0;
    let facebookDaysCount = 0;
    
    // Process Google data
    if (rangeData.google && Array.isArray(rangeData.google)) {
        rangeData.google.forEach(day => {
            if (day && typeof day === 'object') {
                googleTotals.impressions += day.impressions || 0;
                googleTotals.clicks += day.clicks || 0;
                googleTotals.revenue += day.revenue || 0;
                googleTotals.adSpend += day.adSpend || 0;
                googleTotals.profit += day.grossProfit || 0;
                googleDaysCount++;
            }
        });
    }
    
    // Process Facebook data
    if (rangeData.facebook && Array.isArray(rangeData.facebook)) {
        rangeData.facebook.forEach(day => {
            if (day && typeof day === 'object') {
                facebookTotals.impressions += day.impressions || 0;
                facebookTotals.clicks += day.clicks || 0;
                facebookTotals.revenue += day.revenue || 0;
                facebookTotals.adSpend += day.adSpend || 0;
                facebookTotals.profit += day.grossProfit || 0;
                facebookDaysCount++;
            }
        });
    }
    
    console.log(`📈 Google totals (${googleDaysCount} days):`, googleTotals);
    console.log(`📘 Facebook totals (${facebookDaysCount} days):`, facebookTotals);
    
    // Create aggregated Google data structure
    const aggregatedGoogle = {
        daily: {
            impressions: googleTotals.impressions,
            clicks: googleTotals.clicks,
            ctr: googleTotals.impressions > 0 ? (googleTotals.clicks / googleTotals.impressions * 100) : 0,
            revenue: googleTotals.revenue,
            adSpend: googleTotals.adSpend,
            grossProfit: googleTotals.profit,
            roas: googleTotals.adSpend > 0 ? (googleTotals.revenue / googleTotals.adSpend) : 0,
            cpc: googleTotals.clicks > 0 ? (googleTotals.adSpend / googleTotals.clicks) : 0,
            conversionRate: 0 // Would need conversion data
        },
        labels: {
            status: `${googleDaysCount} days aggregated`,
            recommendation: googleTotals.adSpend > 0 && (googleTotals.revenue / googleTotals.adSpend) > 3 ? 'Performing Well' : 'Needs Optimization'
        }
    };
    
    // Create aggregated Facebook data structure
    const aggregatedFacebook = {
        daily: {
            impressions: facebookTotals.impressions,
            clicks: facebookTotals.clicks,
            ctr: facebookTotals.impressions > 0 ? (facebookTotals.clicks / facebookTotals.impressions * 100) : 0,
            revenue: facebookTotals.revenue,
            adSpend: facebookTotals.adSpend,
            grossProfit: facebookTotals.profit,
            roas: facebookTotals.adSpend > 0 ? (facebookTotals.revenue / facebookTotals.adSpend) : 0,
            cpc: facebookTotals.clicks > 0 ? (facebookTotals.adSpend / facebookTotals.clicks) : 0,
            conversionRate: 0 // Would need conversion data
        },
        labels: {
            status: `${facebookDaysCount} days aggregated`,
            recommendation: facebookTotals.adSpend > 0 && (facebookTotals.revenue / facebookTotals.adSpend) > 3 ? 'Performing Well' : 'Needs Optimization'
        }
    };
    
    // Update both platform cards
    updateGoogleAdsData(aggregatedGoogle);
    updateFacebookAdsData(aggregatedFacebook);
    
    // Create comparison data
    const totalGoogleRevenue = googleTotals.revenue;
    const totalFacebookRevenue = facebookTotals.revenue;
    const winner = totalGoogleRevenue > totalFacebookRevenue ? 'Google Ads' : 'Facebook Ads';
    const totalDays = googleDaysCount + facebookDaysCount;
    
    const comparisonData = {
        winner: winner,
        metrics: {
            revenueAdvantage: Math.abs(totalGoogleRevenue - totalFacebookRevenue),
            profitAdvantage: Math.abs(googleTotals.profit - facebookTotals.profit),
            efficiencyAdvantage: Math.abs(
                (googleTotals.adSpend > 0 ? googleTotals.revenue / googleTotals.adSpend : 0) -
                (facebookTotals.adSpend > 0 ? facebookTotals.revenue / facebookTotals.adSpend : 0)
            ).toFixed(2)
        },
        recommendations: [
            `${winner} is performing better over this ${totalDays} day period`,
            `Total combined revenue: ${formatCurrency(totalGoogleRevenue + totalFacebookRevenue)}`,
            `Total combined profit: ${formatCurrency(googleTotals.profit + facebookTotals.profit)}`,
            `Google average daily revenue: ${formatCurrency(googleDaysCount > 0 ? googleTotals.revenue / googleDaysCount : 0)}`,
            `Facebook average daily revenue: ${formatCurrency(facebookDaysCount > 0 ? facebookTotals.revenue / facebookDaysCount : 0)}`
        ]
    };
    
    updatePlatformComparison(comparisonData);
    
    // Update last updated timestamp to show date range
    const startDate = formatDateForDisplay(rangeData.startDate);
    const endDate = formatDateForDisplay(rangeData.endDate);
    document.getElementById('lastUpdated').textContent = `Data Range: ${startDate} - ${endDate} (${totalDays} days)`;
}

function showNoDataMessage() {
    // Show message in platform cards - Google
    document.getElementById('googleImpressions').textContent = 'No data';
    document.getElementById('googleClicks').textContent = 'No data';
    document.getElementById('googleCTR').textContent = 'No data';
    document.getElementById('googleRevenue').textContent = 'No data';
    document.getElementById('googleAdSpend').textContent = 'No data';
    document.getElementById('googleProfit').textContent = 'No data';
    document.getElementById('googleROAS').textContent = 'No data';
    document.getElementById('googleCPC').textContent = 'No data';
    document.getElementById('googleConvRate').textContent = 'No data';
    document.getElementById('googleStatus').textContent = 'No data available';
    document.getElementById('googleRecommendation').textContent = 'Select another date';
    
    // Show message in platform cards - Facebook
    document.getElementById('facebookImpressions').textContent = 'No data';
    document.getElementById('facebookClicks').textContent = 'No data';
    document.getElementById('facebookCTR').textContent = 'No data';
    document.getElementById('facebookRevenue').textContent = 'No data';
    document.getElementById('facebookAdSpend').textContent = 'No data';
    document.getElementById('facebookProfit').textContent = 'No data';
    document.getElementById('facebookROAS').textContent = 'No data';
    document.getElementById('facebookCPC').textContent = 'No data';
    document.getElementById('facebookConvRate').textContent = 'No data';
    document.getElementById('facebookStatus').textContent = 'No data available';
    document.getElementById('facebookRecommendation').textContent = 'Select another date';
    
    // Update comparison section
    document.getElementById('winningPlatform').textContent = 'No data';
    document.getElementById('revenueAdvantage').textContent = 'No data';
    document.getElementById('profitAdvantage').textContent = 'No data';
    document.getElementById('efficiencyAdvantage').textContent = 'No data';
    
    // Clear recommendations
    const recommendationsList = document.getElementById('recommendationsList');
    if (recommendationsList) {
        recommendationsList.innerHTML = '<li>No data available for selected date</li>';
    }
    
    document.getElementById('lastUpdated').textContent = 'No data available for selected date';
}

function showNoSummaryDataMessage() {
    document.getElementById('totalRevenue').textContent = 'No data';
    document.getElementById('totalProfit').textContent = 'No data';
    document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="10" class="loading-row">No summary data available</td></tr>';
}

// ============================================================================
// LEADERSHIP TEAM MANAGEMENT FUNCTIONS
// ============================================================================

let leadershipData = [];
let currentEditingLeader = null;

// Initialize leadership team functionality
function initializeLeadershipTeam() {
    console.log('🎯 Initializing Leadership Team management...');
    
    // Setup event listeners
    setupLeadershipEventListeners();
    
    // Load initial leadership data
    loadLeadershipData();
    
    console.log('✅ Leadership Team management initialized');
}

// Setup event listeners for leadership team
function setupLeadershipEventListeners() {
    const addLeaderBtn = document.getElementById('addLeaderBtn');
    const refreshLeadershipBtn = document.getElementById('refreshLeadershipBtn');
    const leadershipForm = document.getElementById('leadershipForm');
    
    if (addLeaderBtn) {
        addLeaderBtn.addEventListener('click', () => {
            openLeadershipModal();
        });
    }
    
    if (refreshLeadershipBtn) {
        refreshLeadershipBtn.addEventListener('click', () => {
            loadLeadershipData();
        });
    }
    
    if (leadershipForm) {
        leadershipForm.addEventListener('submit', handleLeadershipFormSubmit);
    }
    
    // Close modal when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.id === 'leadershipModal') {
            closeLeadershipModal();
        }
    });
}

// Load leadership data from server
async function loadLeadershipData() {
    try {
        console.log('📥 Loading leadership team data...');
        const response = await fetch('/api/leadership-team');
        
        if (!response.ok) {
            throw new Error('Failed to load leadership data');
        }
        
        const data = await response.json();
        leadershipData = data.leaders || [];
        
        updateLeadershipDisplay(leadershipData);
        console.log('✅ Leadership team data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading leadership data:', error);
        showLeadershipError('Failed to load leadership team data');
    }
}

// Update leadership team display
function updateLeadershipDisplay(leaders) {
    const leadershipGrid = document.getElementById('leadershipGrid');
    
    if (!leadershipGrid) {
        console.error('Leadership grid element not found');
        return;
    }
    
    if (!leaders || leaders.length === 0) {
        leadershipGrid.innerHTML = `
            <div class="no-leaders">
                <i class="fas fa-users-slash"></i>
                <h3>No Leadership Team Members</h3>
                <p>Add team members to start managing your leadership team.</p>
            </div>
        `;
        return;
    }
    
    leadershipGrid.innerHTML = leaders.map(leader => createLeaderCard(leader)).join('');
    
    // Add event listeners to action buttons
    addLeaderActionListeners();
}

// Create a leader card HTML
function createLeaderCard(leader) {
    const statusClass = leader.status || 'active';
    const departmentClass = leader.department || 'executive';
    
    return `
        <div class="leader-card ${departmentClass}" data-leader-id="${leader.id}">
            <div class="leader-actions">
                <button class="action-icon edit" onclick="editLeader('${leader.id}')" title="Edit Leader">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-icon delete" onclick="deleteLeader('${leader.id}')" title="Delete Leader">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <div class="leader-header">
                <div class="leader-info">
                    <div class="leader-name">${escapeHtml(leader.name)}</div>
                    <div class="leader-role">${escapeHtml(leader.role)}</div>
                    <div class="leader-department">${escapeHtml(leader.department)}</div>
                    <div class="leader-status">
                        <span class="status-indicator ${statusClass}"></span>
                        <span class="status-text">${formatStatus(leader.status)}</span>
                    </div>
                </div>
            </div>
            
            <div class="leader-contact">
                <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <span>${escapeHtml(leader.email)}</span>
                </div>
                ${leader.phone ? `
                    <div class="contact-item">
                        <i class="fas fa-phone"></i>
                        <span>${escapeHtml(leader.phone)}</span>
                    </div>
                ` : ''}
            </div>
            
            ${leader.goals ? `
                <div class="leader-goals">
                    <h4><i class="fas fa-bullseye"></i> Current Goals</h4>
                    <p>${escapeHtml(leader.goals)}</p>
                </div>
            ` : ''}
            
            ${leader.metrics ? `
                <div class="leader-metrics">
                    <h4><i class="fas fa-chart-line"></i> Key Metrics</h4>
                    <p>${escapeHtml(leader.metrics)}</p>
                </div>
            ` : ''}
        </div>
    `;
}

// Add event listeners to leader action buttons
function addLeaderActionListeners() {
    // Event listeners are added inline in the HTML for simplicity
    // This approach works better with dynamic content
}

// Open leadership modal for adding/editing
function openLeadershipModal(leader = null) {
    const modal = document.getElementById('leadershipModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('leadershipForm');
    
    if (!modal || !modalTitle || !form) {
        console.error('Leadership modal elements not found');
        return;
    }
    
    currentEditingLeader = leader;
    
    if (leader) {
        modalTitle.textContent = 'Edit Leadership Team Member';
        populateForm(leader);
    } else {
        modalTitle.textContent = 'Add Leadership Team Member';
        form.reset();
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close leadership modal
function closeLeadershipModal() {
    const modal = document.getElementById('leadershipModal');
    const form = document.getElementById('leadershipForm');
    
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    if (form) {
        form.reset();
    }
    
    currentEditingLeader = null;
}

// Populate form with leader data
function populateForm(leader) {
    const fields = ['leaderName', 'leaderRole', 'leaderDepartment', 'leaderEmail', 'leaderPhone', 'leaderGoals', 'leaderMetrics', 'leaderStatus'];
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            const key = fieldId.replace('leader', '').toLowerCase();
            field.value = leader[key] || '';
        }
    });
}

// Handle form submission
async function handleLeadershipFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const leaderData = {
        name: formData.get('leaderName') || document.getElementById('leaderName').value,
        role: formData.get('leaderRole') || document.getElementById('leaderRole').value,
        department: formData.get('leaderDepartment') || document.getElementById('leaderDepartment').value,
        email: formData.get('leaderEmail') || document.getElementById('leaderEmail').value,
        phone: formData.get('leaderPhone') || document.getElementById('leaderPhone').value,
        goals: formData.get('leaderGoals') || document.getElementById('leaderGoals').value,
        metrics: formData.get('leaderMetrics') || document.getElementById('leaderMetrics').value,
        status: formData.get('leaderStatus') || document.getElementById('leaderStatus').value
    };
    
    // Validate required fields
    if (!leaderData.name || !leaderData.role || !leaderData.department || !leaderData.email) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leaderData.email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    try {
        const url = currentEditingLeader ? `/api/leadership-team/${currentEditingLeader.id}` : '/api/leadership-team';
        const method = currentEditingLeader ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(leaderData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save leader data');
        }
        
        const result = await response.json();
        
        if (result.success) {
            closeLeadershipModal();
            loadLeadershipData(); // Refresh the display
            showLeadershipSuccess(currentEditingLeader ? 'Leader updated successfully' : 'Leader added successfully');
        } else {
            throw new Error(result.message || 'Failed to save leader data');
        }
        
    } catch (error) {
        console.error('Error saving leader data:', error);
        showLeadershipError('Failed to save leader data: ' + error.message);
    }
}

// Edit leader function
function editLeader(leaderId) {
    const leader = leadershipData.find(l => l.id === leaderId);
    if (leader) {
        openLeadershipModal(leader);
    } else {
        console.error('Leader not found:', leaderId);
    }
}

// Delete leader function
async function deleteLeader(leaderId) {
    const leader = leadershipData.find(l => l.id === leaderId);
    if (!leader) {
        console.error('Leader not found:', leaderId);
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${leader.name}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/leadership-team/${leaderId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete leader');
        }
        
        const result = await response.json();
        
        if (result.success) {
            loadLeadershipData(); // Refresh the display
            showLeadershipSuccess('Leader deleted successfully');
        } else {
            throw new Error(result.message || 'Failed to delete leader');
        }
        
    } catch (error) {
        console.error('Error deleting leader:', error);
        showLeadershipError('Failed to delete leader: ' + error.message);
    }
}

// Update leadership team section in dashboard
function updateLeadershipTeam(leadershipTeamData) {
    if (leadershipTeamData && leadershipTeamData.leaders) {
        leadershipData = leadershipTeamData.leaders;
        updateLeadershipDisplay(leadershipData);
    }
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatStatus(status) {
    const statusMap = {
        active: 'Active',
        vacation: 'On Vacation',
        meeting: 'In Meeting',
        busy: 'Busy',
        offline: 'Offline'
    };
    return statusMap[status] || 'Active';
}

function showLeadershipSuccess(message) {
    console.log('✅ Leadership Success:', message);
    // You can implement a toast notification here
}

function showLeadershipError(message) {
    console.error('❌ Leadership Error:', message);
    // You can implement a toast notification here
}

// ============================================================================
// NINETY.IO DATA MANAGEMENT FUNCTIONS
// ============================================================================

let currentNinetyData = {
    todos: [],
    rocks: [],
    issues: [],
    data: []
};
let currentActiveTab = 'todos';

// Initialize Ninety.io data functionality
function initializeNinetyData() {
    console.log('🎯 Initializing Ninety.io data management...');
    
    // Setup event listeners
    setupNinetyEventListeners();
    
    // Load initial data
    loadNinetyData();
    
    console.log('✅ Ninety.io data management initialized');
}

// Setup event listeners for Ninety.io data
function setupNinetyEventListeners() {
    const refreshNinetyBtn = document.getElementById('refreshNinetyBtn');
    const ninetyTabs = document.querySelectorAll('.ninety-tab');
    
    if (refreshNinetyBtn) {
        refreshNinetyBtn.addEventListener('click', () => {
            loadNinetyData();
        });
    }
    
    // Setup tab switching
    ninetyTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchNinetyTab(tab.dataset.tab);
        });
    });
}

// Switch between tabs
function switchNinetyTab(tabName) {
    // Update active tab
    document.querySelectorAll('.ninety-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update active tab content
    document.querySelectorAll('.ninety-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    currentActiveTab = tabName;
    
    // Load data for the active tab
    loadNinetyTabData(tabName);
}

// Load all Ninety.io data (ENHANCED: Added scorecard loading)
async function loadNinetyData() {
    try {
        console.log('📥 Loading Ninety.io data...');
        
        // Load all data types including scorecard
        await Promise.all([
            loadNinetyTodos(),
            loadNinetyRocks(), 
            loadNinetyIssues(),
            loadNinetyScorecard(),
            loadNinetyDataItems()
        ]);
        
        console.log('✅ Ninety.io data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading Ninety.io data:', error);
        showNinetyError('Failed to load Ninety.io data');
    }
}

// Load specific tab data
async function loadNinetyTabData(tabName) {
    switch (tabName) {
        case 'todos':
            await loadNinetyTodos();
            break;
        case 'rocks':
            await loadNinetyRocks();
            break;
        case 'issues':
            await loadNinetyIssues();
            break;
        case 'data':
            await loadNinetyDataItems();
            break;
    }
}

// Load To-Do's data (FIXED: Data structure mismatch)
async function loadNinetyTodos() {
    try {
        console.log('🔄 Starting to load todos...');
        const response = await apiRequest('/api/ninety-data/todos');
        
        if (!response.ok) {
            throw new Error('Failed to load todos');
        }
        
        const result = await response.json();
        console.log('📊 Received todos API response:', result);
        
        // Fix: The API returns data in 'data' property, not 'todos'
        const todosData = result.data || [];
        console.log('📊 Extracted todos data:', todosData.length, 'items');
        
        if (todosData.length > 0) {
            console.log('📊 Sample todo item:', todosData[0]);
        }
        
        currentNinetyData.todos = todosData;
        console.log('💾 Stored todos in currentNinetyData:', currentNinetyData.todos.length);
        
        updateNinetyDisplay('todos', currentNinetyData.todos);
        
        // Show success message
        if (todosData.length > 0) {
            showNotification(`Loaded ${todosData.length} To-Do items from admin uploads`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Error loading todos:', error);
        showNinetyError('Failed to load To-Do\'s: ' + error.message);
    }
}

// Load Rocks data (FIXED: Data structure mismatch)
async function loadNinetyRocks() {
    try {
        console.log('🔄 Starting to load rocks...');
        const response = await apiRequest('/api/ninety-data/rocks');
        
        if (!response.ok) {
            throw new Error('Failed to load rocks');
        }
        
        const result = await response.json();
        console.log('📊 Received rocks API response:', result);
        
        // Fix: The API returns goals data (transformed from rocks), not direct rocks array
        const rocksData = result.data || [];
        console.log('📊 Extracted rocks data:', rocksData);
        
        // Transform goals back to rocks format for display if needed
        let displayData = rocksData;
        if (Array.isArray(rocksData)) {
            displayData = rocksData;
        } else if (rocksData.items) {
            displayData = rocksData.items;
        } else {
            // If it's a single goals object, create a display format
            displayData = [{
                title: 'Quarterly Goals',
                target: rocksData.quarterlyTarget,
                progress: rocksData.currentProgress,
                percentage: rocksData.percentageComplete,
                status: rocksData.trend === 'up' ? 'On Track' : 'Needs Attention'
            }];
        }
        
        currentNinetyData.rocks = displayData;
        console.log('💾 Stored rocks in currentNinetyData:', currentNinetyData.rocks.length);
        
        updateNinetyDisplay('rocks', currentNinetyData.rocks);
        
        // Show success message
        if (displayData.length > 0) {
            showNotification(`Loaded ${displayData.length} Rock items from admin uploads`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Error loading rocks:', error);
        showNinetyError('Failed to load Rocks: ' + error.message);
    }
}

// Load Issues data (FIXED: Data structure mismatch)
async function loadNinetyIssues() {
    try {
        console.log('🔄 Starting to load issues...');
        const response = await apiRequest('/api/ninety-data/issues');
        
        if (!response.ok) {
            throw new Error('Failed to load issues');
        }
        
        const result = await response.json();
        console.log('📊 Received issues API response:', result);
        
        // Fix: The API returns issues data in 'data' property
        const issuesData = result.data || [];
        console.log('📊 Extracted issues data:', issuesData);
        
        // Transform issues data for display if it's in summary format
        let displayData = issuesData;
        if (!Array.isArray(issuesData) && typeof issuesData === 'object') {
            // If it's a summary object, create a display format
            displayData = [{
                title: 'Total Issues',
                count: issuesData.totalIssues || 0,
                resolved: issuesData.resolvedIssues || 0,
                pending: issuesData.pendingIssues || 0,
                critical: issuesData.criticalIssues || 0,
                resolutionRate: issuesData.resolutionRate || 0
            }];
        }
        
        currentNinetyData.issues = displayData;
        console.log('💾 Stored issues in currentNinetyData:', currentNinetyData.issues.length);
        
        updateNinetyDisplay('issues', currentNinetyData.issues);
        
        // Show success message
        if (displayData.length > 0) {
            showNotification(`Loaded ${displayData.length} Issue items from admin uploads`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Error loading issues:', error);
        showNinetyError('Failed to load Issues: ' + error.message);
    }
}

// Load Data items
async function loadNinetyDataItems() {
    try {
        console.log('🔄 Starting to load data items...');
        
        // Note: There's no specific API endpoint for "data" type in ninety data
        // This might be for general data or could be combined with other types
        console.log('⚠️ No specific API endpoint for general data items');
        
        currentNinetyData.data = [];
        console.log('💾 Stored empty data in currentNinetyData');
        
        updateNinetyDisplay('data', currentNinetyData.data);
        
    } catch (error) {
        console.error('❌ Error loading data items:', error);
        showNinetyError('Failed to load Data: ' + error.message);
    }
}

// Update display for specific data type
function updateNinetyDisplay(dataType, items) {
    console.log(`🔍 Updating ${dataType} display with ${items ? items.length : 0} items`);
    
    const list = document.getElementById(`${dataType}List`);
    
    if (!list) {
        console.error(`${dataType} list element not found`);
        return;
    }
    
    console.log(`✅ Found ${dataType}List element`);
    
    if (!items || items.length === 0) {
        console.log(`📝 No items found for ${dataType}, showing empty state`);
        list.innerHTML = `
            <div class="ninety-empty-state">
                <i class="fas fa-${getIconForDataType(dataType)}"></i>
                <h3>No ${getDisplayNameForDataType(dataType)} Found</h3>
                <p>Upload your Ninety.io ${getDisplayNameForDataType(dataType)} export file to get started.</p>
                <button onclick="window.open('/admin', '_blank')" class="btn btn-primary">
                    <i class="fas fa-upload"></i> Upload Data
                </button>
            </div>
        `;
        return;
    }
    
    console.log(`📋 Creating ${items.length} list items for ${dataType}`);
    list.innerHTML = items.map(item => createNinetyListItem(dataType, item)).join('');
    console.log(`✅ ${dataType} display updated successfully`);
}

// Create line item for Ninety.io data
function createNinetyListItem(dataType, item) {
    const statusClass = getStatusClass(item.status);
    const priorityClass = getPriorityClass(item.priority);
    
    switch (dataType) {
        case 'todos':
            return `
                <div class="ninety-list-item ${statusClass}" onclick="openNinetyModal('${dataType}', '${item.id}')">
                    <div class="list-item-main">
                        <div class="list-item-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="list-item-content">
                            <h4>${item.title}</h4>
                            <p class="list-item-subtitle">${item.owner || 'Not assigned'} • ${formatDate(item.dueDate) || 'No due date'}</p>
                        </div>
                        <div class="list-item-badges">
                            <span class="status-badge ${statusClass}">${item.status}</span>
                            <span class="priority-badge ${priorityClass}">${item.priority}</span>
                        </div>
                    </div>
                    <div class="list-item-progress">
                        <div class="progress-indicator ${statusClass}"></div>
                    </div>
                </div>
            `;
            
        case 'rocks':
            return `
                <div class="ninety-list-item ${statusClass}" onclick="openNinetyModal('${dataType}', '${item.id}')">
                    <div class="list-item-main">
                        <div class="list-item-icon">
                            <i class="fas fa-mountain"></i>
                        </div>
                        <div class="list-item-content">
                            <h4>${item.title}</h4>
                            <p class="list-item-subtitle">${item.owner || 'Not assigned'} • ${formatDate(item.dueDate) || 'No due date'}</p>
                        </div>
                        <div class="list-item-badges">
                            <span class="status-badge ${statusClass}">${item.status}</span>
                            <span class="progress-badge">${item.progress || 0}%</span>
                        </div>
                    </div>
                    <div class="list-item-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${item.progress || 0}%"></div>
                        </div>
                    </div>
                </div>
            `;
            
        case 'issues':
            return `
                <div class="ninety-list-item ${statusClass}" onclick="openNinetyModal('${dataType}', '${item.id}')">
                    <div class="list-item-main">
                        <div class="list-item-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="list-item-content">
                            <h4>${item.title}</h4>
                            <p class="list-item-subtitle">${item.owner || 'Not assigned'}</p>
                        </div>
                        <div class="list-item-badges">
                            <span class="status-badge ${statusClass}">${item.status}</span>
                            <span class="priority-badge ${priorityClass}">${item.priority}</span>
                        </div>
                    </div>
                    <div class="list-item-progress">
                        <div class="progress-indicator ${statusClass}"></div>
                    </div>
                </div>
            `;
            
        case 'data':
            return `
                <div class="ninety-list-item" onclick="openNinetyModal('${dataType}', '${item.id}')">
                    <div class="list-item-main">
                        <div class="list-item-icon">
                            <i class="fas fa-database"></i>
                        </div>
                        <div class="list-item-content">
                            <h4>${item.title}</h4>
                            <p class="list-item-subtitle">${item.owner || 'Not assigned'} • ${item.category || 'General'}</p>
                        </div>
                        <div class="list-item-badges">
                            <span class="type-badge">${item.type}</span>
                            <span class="value-badge">${item.value || 'No value'}</span>
                        </div>
                    </div>
                    <div class="list-item-progress">
                        <div class="progress-indicator"></div>
                    </div>
                </div>
            `;
    }
}

// Open modal with item details
function openNinetyModal(dataType, itemId) {
    const items = currentNinetyData[dataType];
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
        console.error('Item not found:', itemId);
        return;
    }
    
    const modal = document.getElementById('ninetyDetailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    modalTitle.textContent = item.title;
    modalContent.innerHTML = generateModalContent(dataType, item);
    
    modal.style.display = 'block';
}

// Close modal
function closeNinetyModal() {
    const modal = document.getElementById('ninetyDetailModal');
    modal.style.display = 'none';
}

// Generate modal content based on data type
function generateModalContent(dataType, item) {
    const statusClass = getStatusClass(item.status);
    const priorityClass = getPriorityClass(item.priority);
    
    switch (dataType) {
        case 'todos':
            return `
                <div class="modal-detail-section">
                    <div class="detail-header">
                        <div class="detail-badges">
                            <span class="status-badge ${statusClass}">${item.status}</span>
                            <span class="priority-badge ${priorityClass}">${item.priority}</span>
                        </div>
                    </div>
                    <div class="detail-content">
                        <div class="detail-field">
                            <label>Description:</label>
                            <p>${item.description || 'No description provided'}</p>
                        </div>
                        <div class="detail-field">
                            <label>Owner:</label>
                            <p>${item.owner || 'Not assigned'}</p>
                        </div>
                        <div class="detail-field">
                            <label>Due Date:</label>
                            <p>${formatDate(item.dueDate) || 'No due date'}</p>
                        </div>
                        <div class="detail-field">
                            <label>Created:</label>
                            <p>${formatDate(item.created_date) || 'Unknown'}</p>
                        </div>
                    </div>
                </div>
            `;
            
        case 'rocks':
            return `
                <div class="modal-detail-section">
                    <div class="detail-header">
                        <div class="detail-badges">
                            <span class="status-badge ${statusClass}">${item.status}</span>
                            <span class="progress-badge">${item.progress || 0}%</span>
                        </div>
                    </div>
                    <div class="detail-content">
                        <div class="detail-field">
                            <label>Progress:</label>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${item.progress || 0}%"></div>
                            </div>
                            <p>${item.progress || 0}% Complete</p>
                        </div>
                        <div class="detail-field">
                            <label>Description:</label>
                            <p>${item.description || 'No description provided'}</p>
                        </div>
                        <div class="detail-field">
                            <label>Owner:</label>
                            <p>${item.owner || 'Not assigned'}</p>
                        </div>
                        <div class="detail-field">
                            <label>Due Date:</label>
                            <p>${formatDate(item.dueDate) || 'No due date'}</p>
                        </div>
                        <div class="detail-field">
                            <label>Created:</label>
                            <p>${formatDate(item.created_date) || 'Unknown'}</p>
                        </div>
                    </div>
                </div>
            `;
            
        case 'issues':
            return `
                <div class="modal-detail-section">
                    <div class="detail-header">
                        <div class="detail-badges">
                            <span class="status-badge ${statusClass}">${item.status}</span>
                            <span class="priority-badge ${priorityClass}">${item.priority}</span>
                        </div>
                    </div>
                    <div class="detail-content">
                        <div class="detail-field">
                            <label>Description:</label>
                            <p>${item.description || 'No description provided'}</p>
                        </div>
                        <div class="detail-field">
                            <label>Owner:</label>
                            <p>${item.owner || 'Not assigned'}</p>
                        </div>
                        <div class="detail-field">
                            <label>Created:</label>
                            <p>${formatDate(item.created_date) || 'Unknown'}</p>
                        </div>
                    </div>
                </div>
            `;
            
        case 'data':
            return `
                <div class="modal-detail-section">
                    <div class="detail-header">
                        <div class="detail-badges">
                            <span class="type-badge">${item.type}</span>
                        </div>
                    </div>
                    <div class="detail-content">
                        <div class="detail-field">
                            <label>Value:</label>
                            <p>${item.value || 'No value'}</p>
                        </div>
                        <div class="detail-field">
                            <label>Description:</label>
                            <p>${item.description || 'No description provided'}</p>
                        </div>
                        <div class="detail-field">
                            <label>Owner:</label>
                            <p>${item.owner || 'Not assigned'}</p>
                        </div>
                        <div class="detail-field">
                            <label>Category:</label>
                            <p>${item.category || 'General'}</p>
                        </div>
                        <div class="detail-field">
                            <label>Updated:</label>
                            <p>${formatDate(item.updated_date) || 'Unknown'}</p>
                        </div>
                    </div>
                </div>
            `;
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('ninetyDetailModal');
    if (event.target == modal) {
        closeNinetyModal();
    }
}

// ... existing code ...

// Initialize leadership team when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded - Initializing systems...');
    initializeLeadershipTeam();
    initializeNinetyData();
    console.log('🎉 All systems initialized');
});

// Make functions available globally
window.editLeader = editLeader;
window.deleteLeader = deleteLeader;
window.closeLeadershipModal = closeLeadershipModal;

// Test function to manually load data (can be called from browser console)
window.testNinetyData = async function() {
    console.log('🧪 Testing Ninety.io data loading...');
    
    try {
        // Test todos
        console.log('Testing todos...');
        const todosResponse = await fetch('/api/ninety-data/todos');
        const todosData = await todosResponse.json();
        console.log('Todos response:', todosData);
        
        // Test if the element exists
        const todosList = document.getElementById('todosList');
        console.log('todosList element:', todosList);
        
        if (todosList && todosData.todos && todosData.todos.length > 0) {
            console.log('Creating test todo item...');
            const testItem = todosData.todos[0];
            console.log('Test item:', testItem);
            
            // Test the createNinetyListItem function
            const listItemHTML = createNinetyListItem('todos', testItem);
            console.log('Generated HTML:', listItemHTML);
            
            // Test updating the display
            updateNinetyDisplay('todos', todosData.todos);
            console.log('Display updated');
        }
        
    } catch (error) {
        console.error('Test error:', error);
    }
};

// Force refresh function (can be called from browser console)
window.forceRefreshNinetyData = function() {
    console.log('🔄 Force refreshing Ninety.io data...');
    loadNinetyData();
};

// Helper functions for Ninety.io data display
function getStatusClass(status) {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('complete') || statusLower.includes('done') || statusLower.includes('closed')) {
        return 'completed';
    } else if (statusLower.includes('progress') || statusLower.includes('working') || statusLower.includes('active')) {
        return 'in-progress';
    } else if (statusLower.includes('overdue') || statusLower.includes('late') || statusLower.includes('off-track')) {
        return 'overdue';
    } else {
        return 'open';
    }
}

function getPriorityClass(priority) {
    if (!priority) return '';
    
    const priorityLower = priority.toLowerCase();
    
    if (priorityLower.includes('high') || priorityLower.includes('urgent') || priorityLower.includes('critical')) {
        return 'high';
    } else if (priorityLower.includes('medium') || priorityLower.includes('normal')) {
        return 'medium';
    } else if (priorityLower.includes('low') || priorityLower.includes('minor')) {
        return 'low';
    } else {
        return 'medium';
    }
}

function getIconForDataType(dataType) {
    switch (dataType) {
        case 'todos':
            return 'check-circle';
        case 'rocks':
            return 'mountain';
        case 'issues':
            return 'exclamation-triangle';
        case 'data':
            return 'database';
        default:
            return 'file';
    }
}

function getDisplayNameForDataType(dataType) {
    switch (dataType) {
        case 'todos':
            return 'To-Do\'s';
        case 'rocks':
            return 'Rocks';
        case 'issues':
            return 'Issues';
        case 'data':
            return 'Data';
        default:
            return 'Items';
    }
}

function formatDate(dateString) {
    if (!dateString) return null;
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return null;
    }
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

// Set up authentication form handlers
function setupAuthenticationHandlers() {
    // Login form handler
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
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
                currentUser = data.user;
                authToken = data.token;
                localStorage.setItem('authToken', data.token);
                isAuthenticated = true;
                showDashboard();
            } else {
                showNotification('Login failed: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Login failed. Please try again.', 'error');
        }
    });
    
    // Register form handler
    document.getElementById('register-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            firstName: document.getElementById('register-firstName').value,
            lastName: document.getElementById('register-lastName').value,
            username: document.getElementById('register-username').value,
            email: document.getElementById('register-email').value,
            password: document.getElementById('register-password').value,
            confirmPassword: document.getElementById('register-confirmPassword').value
        };
        
        // Validate password confirmation
        if (formData.password !== formData.confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('Registration successful! Please login.', 'success');
                showLoginForm();
            } else {
                showNotification('Registration failed: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showNotification('Registration failed. Please try again.', 'error');
        }
    });
    
    // Form switching handlers
    document.getElementById('show-register').addEventListener('click', function(e) {
        e.preventDefault();
        showRegisterForm();
    });
    
    document.getElementById('show-login').addEventListener('click', function(e) {
        e.preventDefault();
        showLoginForm();
    });
}

// Show login form
function showLoginForm() {
    document.getElementById('login-form').style.display = 'flex';
    document.getElementById('register-form').style.display = 'none';
}

// Show register form
function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'flex';
}

// Load user profile
async function loadUserProfile() {
    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            document.getElementById('user-name').textContent = `${currentUser.firstName} ${currentUser.lastName}`;
            document.getElementById('user-email').textContent = currentUser.email;
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

// Load user teams
async function loadUserTeams() {
    try {
        const response = await fetch('/api/auth/teams', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const teamSelector = document.getElementById('team-selector');
            teamSelector.innerHTML = '<option value="">Select Team...</option>';
            
            data.teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                teamSelector.appendChild(option);
            });
            
            // Select first team by default
            if (data.teams.length > 0) {
                teamSelector.value = data.teams[0].id;
                currentTeam = data.teams[0];
            }
        }
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

// Set up user menu handlers
function setupUserMenuHandlers() {
    // User menu toggle
    document.getElementById('user-menu-btn').addEventListener('click', function() {
        const menu = document.getElementById('user-menu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('user-menu');
        const btn = document.getElementById('user-menu-btn');
        
        if (!menu.contains(e.target) && !btn.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
    
    // Logout handler
    document.getElementById('logout-btn').addEventListener('click', async function(e) {
        e.preventDefault();
        
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        // Clear local storage and reset state
        localStorage.removeItem('authToken');
        currentUser = null;
        currentTeam = null;
        authToken = null;
        isAuthenticated = false;
        
        // Show authentication form
        showAuthenticationForm();
    });
    
    // Team selector handler
    document.getElementById('team-selector').addEventListener('change', function() {
        const teamId = this.value;
        // TODO: Switch to selected team and refresh data
        console.log('Team selected:', teamId);
    });
    
    // Team management handler
    document.getElementById('team-management').addEventListener('click', function(e) {
        e.preventDefault();
        showTeamManagementModal();
    });
    
    // Team manage button handler
    document.getElementById('team-manage-btn').addEventListener('click', function() {
        showTeamManagementModal();
    });
}

// Team Management Modal Functions
function showTeamManagementModal() {
    const modal = document.getElementById('team-management-modal');
    modal.style.display = 'block';
    
    // Load team data
    loadTeamMembers();
    loadTeamSettings();
    
    // Set up modal handlers
    setupTeamManagementHandlers();
}

function setupTeamManagementHandlers() {
    // Close modal handler
    document.getElementById('close-team-modal').addEventListener('click', function() {
        document.getElementById('team-management-modal').style.display = 'none';
    });
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTeamTab(tabName);
        });
    });
    
    // Invite member form
    document.getElementById('invite-member-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('invite-email').value;
        const role = document.getElementById('invite-role').value;
        
        await inviteMember(email, role);
    });
    
    // Team settings form
    document.getElementById('team-settings-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('team-name').value;
        const description = document.getElementById('team-description').value;
        
        await updateTeamSettings(name, description);
    });
    
    // Delete team handler
    document.getElementById('delete-team-btn').addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
            deleteTeam();
        }
    });
}

function switchTeamTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

async function loadTeamMembers() {
    if (!currentTeam) return;
    
    try {
        const response = await fetch(`/api/auth/teams/${currentTeam.id}/members`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayTeamMembers(data.members);
        } else {
            console.error('Error loading team members:', data.message);
        }
    } catch (error) {
        console.error('Error loading team members:', error);
    }
}

function displayTeamMembers(members) {
    const membersGrid = document.getElementById('members-grid');
    const membersCount = document.getElementById('members-count');
    
    membersCount.textContent = `${members.length} member${members.length !== 1 ? 's' : ''}`;
    
    membersGrid.innerHTML = members.map(member => `
        <div class="member-card">
            <div class="member-avatar">
                ${member.first_name.charAt(0)}${member.last_name.charAt(0)}
            </div>
            <div class="member-info">
                <div class="member-name">${member.first_name} ${member.last_name}</div>
                <div class="member-email">${member.email}</div>
                <span class="member-role ${member.role}">${member.role}</span>
            </div>
            <div class="member-actions">
                <button class="member-action-btn" onclick="changeUserRole(${member.id}, '${member.role}')">
                    <i class="fas fa-user-edit"></i>
                </button>
                <button class="member-action-btn danger" onclick="removeMember(${member.id})">
                    <i class="fas fa-user-times"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function inviteMember(email, role) {
    if (!currentTeam) return;
    
    try {
        const response = await fetch(`/api/auth/teams/${currentTeam.id}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ email, role })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Invitation sent successfully!', 'success');
            document.getElementById('invite-member-form').reset();
            loadTeamMembers(); // Refresh member list
        } else {
            showNotification('Failed to send invitation: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error inviting member:', error);
        showNotification('Failed to send invitation', 'error');
    }
}

async function changeUserRole(userId, currentRole) {
    if (!currentTeam) return;
    
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    
    try {
        const response = await fetch(`/api/auth/teams/${currentTeam.id}/members/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ role: newRole })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Member role updated successfully!', 'success');
            loadTeamMembers(); // Refresh member list
        } else {
            showNotification('Failed to update role: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error changing user role:', error);
        showNotification('Failed to update role', 'error');
    }
}

async function removeMember(userId) {
    if (!currentTeam) return;
    
    if (!confirm('Are you sure you want to remove this member from the team?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/auth/teams/${currentTeam.id}/members/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Member removed successfully!', 'success');
            loadTeamMembers(); // Refresh member list
        } else {
            showNotification('Failed to remove member: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error removing member:', error);
        showNotification('Failed to remove member', 'error');
    }
}

function loadTeamSettings() {
    if (!currentTeam) return;
    
    document.getElementById('team-name').value = currentTeam.name || '';
    document.getElementById('team-description').value = currentTeam.description || '';
}

async function updateTeamSettings(name, description) {
    if (!currentTeam) return;
    
    try {
        const response = await fetch(`/api/auth/teams/${currentTeam.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, description })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Team settings updated successfully!', 'success');
            currentTeam.name = name;
            currentTeam.description = description;
            loadUserTeams(); // Refresh team list
        } else {
            showNotification('Failed to update team settings: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error updating team settings:', error);
        showNotification('Failed to update team settings', 'error');
    }
}

async function deleteTeam() {
    if (!currentTeam) return;
    
    try {
        const response = await fetch(`/api/auth/teams/${currentTeam.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Team deleted successfully!', 'success');
            document.getElementById('team-management-modal').style.display = 'none';
            loadUserTeams(); // Refresh team list
        } else {
            showNotification('Failed to delete team: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting team:', error);
        showNotification('Failed to delete team', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Profile Management Functions
async function openProfileModal() {
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Populate form fields
            document.getElementById('profileUsername').value = data.user.username;
            document.getElementById('profileEmail').value = data.user.email;
            document.getElementById('profileFirstName').value = data.user.firstName;
            document.getElementById('profileLastName').value = data.user.lastName;
            
            // Load preferences
            const preferences = data.user.preferences || {};
            document.getElementById('emailNotifications').checked = preferences.emailNotifications || false;
            document.getElementById('darkMode').checked = preferences.darkMode || false;
            document.getElementById('timezone').value = preferences.timezone || 'UTC';
            
            // Show modal
            document.getElementById('profile-modal').style.display = 'block';
        } else {
            showNotification('Failed to load profile', 'error');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Error loading profile', 'error');
    }
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

function showProfileTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('#profile-modal .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('#profile-modal .tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(`${tabName}-tab-content`).classList.add('active');
    
    // Mark selected button as active
    document.querySelector(`#profile-modal .tab-button[data-tab="${tabName}"]`).classList.add('active');
}

async function updateProfile(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const profileData = {
        username: formData.get('username'),
        email: formData.get('email'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName')
    };
    
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(profileData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Profile updated successfully', 'success');
            // Update the user display
            updateUserDisplay(data.user);
        } else {
            showNotification(data.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification('Error updating profile', 'error');
    }
}

async function changePassword(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const currentPassword = formData.get('currentPassword');
    const newPassword = formData.get('newPassword');
    const confirmNewPassword = formData.get('confirmNewPassword');
    
    if (newPassword !== confirmNewPassword) {
        showNotification('New passwords do not match', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/profile/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Password changed successfully', 'success');
            // Clear form
            event.target.reset();
        } else {
            showNotification(data.message || 'Failed to change password', 'error');
        }
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('Error changing password', 'error');
    }
}

async function updatePreferences(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const preferences = {
        emailNotifications: formData.get('emailNotifications') === 'on',
        darkMode: formData.get('darkMode') === 'on',
        timezone: formData.get('timezone')
    };
    
    try {
        const response = await fetch('/api/auth/profile/preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ preferences })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Preferences updated successfully', 'success');
            
            // Apply dark mode if enabled
            if (preferences.darkMode) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        } else {
            showNotification(data.message || 'Failed to update preferences', 'error');
        }
    } catch (error) {
        console.error('Error updating preferences:', error);
        showNotification('Error updating preferences', 'error');
    }
}

async function deleteAccount() {
    const password = prompt('Please enter your password to confirm account deletion:');
    
    if (!password) {
        return;
    }
    
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Account deleted successfully', 'success');
            // Clear local storage and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
        } else {
            showNotification(data.message || 'Failed to delete account', 'error');
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        showNotification('Error deleting account', 'error');
    }
}

function updateUserDisplay(user) {
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = `${user.firstName} ${user.lastName}`;
    }
}

// Initialize dashboard when DOM is loaded (FIXED: Combined profile and dashboard initialization)
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Dashboard initializing...');
    
    // FIRST: Initialize profile management
    console.log('👤 Initializing profile management...');
    
    // Add profile form event listeners
    const profileForm = document.getElementById('profileForm');
    const passwordForm = document.getElementById('passwordForm');
    const preferencesForm = document.getElementById('preferencesForm');
    
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
    }
    
    if (passwordForm) {
        passwordForm.addEventListener('submit', changePassword);
    }
    
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', updatePreferences);
    }
    
    // Add profile modal event listeners
    const profileSettings = document.getElementById('profile-settings');
    const closeProfileBtn = document.getElementById('close-profile-modal');
    
    if (profileSettings) {
        profileSettings.addEventListener('click', (e) => {
            e.preventDefault();
            openProfileModal();
        });
    }
    
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeProfileModal();
        });
    }
    
    // Add profile tab functionality
    document.querySelectorAll('#profile-modal .tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            showProfileTab(button.dataset.tab);
        });
    });
    
    console.log('✅ Profile management initialized');
    
    // SECOND: Initialize main dashboard
    console.log('🚀 Dashboard initializing...');
    
    try {
        // Check authentication status first
        await checkAuthStatus();
        
        // Add sync button to dashboard
        setTimeout(addSyncButton, 1000); // Add button after DOM is fully loaded
        
        // Load initial dashboard data (this will now include admin uploads)
        console.log('📊 Loading initial dashboard data...');
        await loadDashboardData('today');
        
        // Automatically sync admin data on startup
        setTimeout(async () => {
            console.log('🔄 Auto-syncing admin data on startup...');
            await syncAdminData();
        }, 2000);
        
        // Set up socket connection for real-time updates
        setupSocketConnection();
        
        // Set up event handlers
        setupEventHandlers();
        
        // Initialize specialized components
        initializeComponents();
        
        console.log('✅ Dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        showErrorMessage('Failed to initialize dashboard. Please refresh the page.');
    }
});

// Function to manually sync admin uploaded data with main dashboard
async function syncAdminData() {
    try {
        console.log('🔄 Syncing admin uploaded data with main dashboard...');
        
        const response = await fetch('/api/sync-admin-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Admin data synchronized successfully');
            showNotification('Data synchronized with admin uploads', 'success');
            
            // Reload dashboard data to reflect changes
            await loadDashboardData('today');
        } else {
            console.error('❌ Admin data sync failed:', result.message);
            showNotification('Failed to sync admin data: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('❌ Error syncing admin data:', error);
        showNotification('Error syncing admin data', 'error');
    }
}

// Function to add sync button to the main dashboard
function addSyncButton() {
    const headerActions = document.querySelector('.header-actions') || document.querySelector('.dashboard-header');
    
    if (headerActions && !document.getElementById('sync-admin-data-btn')) {
        const syncButton = document.createElement('button');
        syncButton.id = 'sync-admin-data-btn';
        syncButton.className = 'btn btn-secondary';
        syncButton.innerHTML = '<i class="fas fa-sync"></i> Sync Admin Data';
        syncButton.onclick = syncAdminData;
        
        headerActions.appendChild(syncButton);
        console.log('✅ Sync admin data button added to dashboard');
    }
}

// Load Scorecard data (ADDED: Missing function for scorecard)
async function loadNinetyScorecard() {
    try {
        console.log('🔄 Starting to load scorecard...');
        const response = await apiRequest('/api/ninety-data/scorecard');
        
        if (!response.ok) {
            throw new Error('Failed to load scorecard');
        }
        
        const result = await response.json();
        console.log('📊 Received scorecard API response:', result);
        
        // Fix: The API returns scorecard data in 'data' property
        const scorecardData = result.data || {};
        console.log('📊 Extracted scorecard data:', scorecardData);
        
        // Update the scorecard display directly
        updateScorecard(scorecardData);
        
        // Show success message if data exists
        if (Object.keys(scorecardData).length > 0) {
            showNotification('Loaded Scorecard data from admin uploads', 'success');
        }
        
    } catch (error) {
        console.error('❌ Error loading scorecard:', error);
        showNinetyError('Failed to load Scorecard: ' + error.message);
    }
}