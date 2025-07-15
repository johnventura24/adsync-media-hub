// Initialize Socket.io connection
const socket = io();

let funnelChart;
let currentView = 'today'; // Track current view: 'today', 'summary', or specific date
let availableDates = []; // Store available dates for calendar
let currentCalendarDate = new Date(); // Current month/year being displayed
let selectedDates = []; // Selected date(s)
let selectionMode = 'single'; // 'single', 'range', or 'summary'
let calendarOpen = false;

// Initialize Ninety.io-style navigation
document.addEventListener('DOMContentLoaded', function() {
    initializeSidebarNavigation();
    initializeNinetyTabs();
    loadDashboardSnapshot();
    initializeRefreshButtons();
    // Show dashboard section by default
    switchToSection('dashboard');
});

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

// Initialize refresh buttons for individual sections
function initializeRefreshButtons() {
    // Refresh buttons for Ninety.io sections
    const refreshTodosBtn = document.getElementById('refreshTodosBtn');
    const refreshRocksBtn = document.getElementById('refreshRocksBtn');
    const refreshIssuesBtn = document.getElementById('refreshIssuesBtn');
    
    if (refreshTodosBtn) {
        refreshTodosBtn.addEventListener('click', function() {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            loadNinetyTodos().finally(() => {
                this.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            });
        });
    }
    
    if (refreshRocksBtn) {
        refreshRocksBtn.addEventListener('click', function() {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            loadNinetyRocks().finally(() => {
                this.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            });
        });
    }
    
    if (refreshIssuesBtn) {
        refreshIssuesBtn.addEventListener('click', function() {
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            loadNinetyIssues().finally(() => {
                this.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            });
        });
    }
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

// NEW: Update Google Ads platform data
function updateGoogleAdsData(googleData) {
    const daily = googleData.daily || googleData;
    const labels = googleData.labels || {};
    
    // Core metrics
    document.getElementById('googleImpressions').textContent = formatNumber(daily.impressions);
    document.getElementById('googleClicks').textContent = formatNumber(daily.clicks);
    document.getElementById('googleCTR').textContent = formatPercentage(daily.ctr);
    
    // Financial metrics
    document.getElementById('googleRevenue').textContent = formatCurrency(daily.revenue);
    document.getElementById('googleAdSpend').textContent = formatCurrency(daily.adSpend);
    document.getElementById('googleProfit').textContent = formatCurrency(daily.grossProfit);
    
    // Performance metrics
    document.getElementById('googleROAS').textContent = daily.roas || '0.00';
    document.getElementById('googleCPC').textContent = formatCurrency(daily.cpc);
    document.getElementById('googleConvRate').textContent = formatPercentage(daily.conversionRate);
    
    // Status and recommendation
    document.getElementById('googleStatus').textContent = labels.status || 'Active';
    document.getElementById('googleRecommendation').textContent = labels.recommendation || 'Optimize';
}

// NEW: Update Facebook Ads platform data
function updateFacebookAdsData(facebookData) {
    const daily = facebookData.daily || facebookData;
    const labels = facebookData.labels || {};
    
    // Core metrics
    document.getElementById('facebookImpressions').textContent = formatNumber(daily.impressions);
    document.getElementById('facebookClicks').textContent = formatNumber(daily.clicks);
    document.getElementById('facebookCTR').textContent = formatPercentage(daily.ctr);
    
    // Financial metrics
    document.getElementById('facebookRevenue').textContent = formatCurrency(daily.revenue);
    document.getElementById('facebookAdSpend').textContent = formatCurrency(daily.adSpend);
    document.getElementById('facebookProfit').textContent = formatCurrency(daily.grossProfit);
    
    // Performance metrics
    document.getElementById('facebookROAS').textContent = daily.roas || '0.00';
    document.getElementById('facebookCPC').textContent = formatCurrency(daily.cpc);
    document.getElementById('facebookConvRate').textContent = formatPercentage(daily.conversionRate);
    
    // Status and recommendation
    document.getElementById('facebookStatus').textContent = labels.status || 'Active';
    document.getElementById('facebookRecommendation').textContent = labels.recommendation || 'Optimize';
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

// Update scorecard
function updateScorecard(scorecard) {
    document.getElementById('customerSatisfaction').textContent = scorecard.customerSatisfaction;
    document.getElementById('teamEfficiency').textContent = scorecard.teamEfficiency;
    document.getElementById('goalCompletion').textContent = scorecard.goalCompletion;
    document.getElementById('qualityScore').textContent = scorecard.qualityScore;
    
    // Update circle colors based on score
    updateScoreCircle('customerSatisfactionCircle', scorecard.customerSatisfaction);
    updateScoreCircle('teamEfficiencyCircle', scorecard.teamEfficiency);
    updateScoreCircle('goalCompletionCircle', scorecard.goalCompletion);
    updateScoreCircle('qualityScoreCircle', scorecard.qualityScore);
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
    
    // Update platform-specific data (NEW!)
    if (data.google) {
        updateGoogleAdsData(data.google);
        console.log('✅ Google Ads data updated');
    }
    
    if (data.facebook) {
        updateFacebookAdsData(data.facebook);
        console.log('✅ Facebook Ads data updated');
    }
    
    // Update platform comparison (NEW!)
    if (data.platformComparison) {
        updatePlatformComparison(data.platformComparison);
        console.log('✅ Platform comparison updated');
    }
    
    // Update extraction info (NEW!)
    if (data.extractionInfo) {
        updateExtractionInfo(data.extractionInfo);
        console.log('✅ Extraction info updated');
    }
    
    // Update existing sections
    updateGoals(data.goals);
    updateRevenueFunnel(data.revenueFunnel);
    updateVTO(data.vto);
    updateIssues(data.issues);
    updateScorecard(data.scorecard);
    updateKnowledgeBase(data.knowledgeBase);
    updateLeadershipTeam(data.leadershipTeam);
    updateLastUpdated(data.lastUpdated);
    
    console.log('✅ Dashboard update complete');
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

// Load all Ninety.io data
async function loadNinetyData() {
    try {
        console.log('📥 Loading Ninety.io data...');
        
        // Load all data types
        await Promise.all([
            loadNinetyTodos(),
            loadNinetyRocks(),
            loadNinetyIssues(),
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

// Load To-Do's data
async function loadNinetyTodos() {
    try {
        console.log('🔄 Starting to load todos...');
        const response = await fetch('/api/ninety-data/todos');
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error('Failed to load todos');
        }
        
        const data = await response.json();
        console.log('📊 Received todos data:', data);
        console.log('📊 Todos array:', data.todos);
        console.log('📊 Todos count:', data.todos ? data.todos.length : 'undefined');
        
        currentNinetyData.todos = data.todos || [];
        console.log('💾 Stored todos in currentNinetyData:', currentNinetyData.todos.length);
        
        updateNinetyDisplay('todos', currentNinetyData.todos);
        
    } catch (error) {
        console.error('❌ Error loading todos:', error);
        showNinetyError('Failed to load To-Do\'s');
    }
}

// Load Rocks data
async function loadNinetyRocks() {
    try {
        console.log('🔄 Starting to load rocks...');
        const response = await fetch('/api/ninety-data/rocks');
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error('Failed to load rocks');
        }
        
        const data = await response.json();
        console.log('📊 Received rocks data:', data);
        console.log('📊 Rocks array:', data.rocks);
        console.log('📊 Rocks count:', data.rocks ? data.rocks.length : 'undefined');
        
        currentNinetyData.rocks = data.rocks || [];
        console.log('💾 Stored rocks in currentNinetyData:', currentNinetyData.rocks.length);
        
        updateNinetyDisplay('rocks', currentNinetyData.rocks);
        
    } catch (error) {
        console.error('❌ Error loading rocks:', error);
        showNinetyError('Failed to load Rocks');
    }
}

// Load Issues data
async function loadNinetyIssues() {
    try {
        console.log('🔄 Starting to load issues...');
        const response = await fetch('/api/ninety-data/issues');
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error('Failed to load issues');
        }
        
        const data = await response.json();
        console.log('📊 Received issues data:', data);
        console.log('📊 Issues array:', data.issues);
        console.log('📊 Issues count:', data.issues ? data.issues.length : 'undefined');
        
        currentNinetyData.issues = data.issues || [];
        console.log('💾 Stored issues in currentNinetyData:', currentNinetyData.issues.length);
        
        updateNinetyDisplay('issues', currentNinetyData.issues);
        
    } catch (error) {
        console.error('❌ Error loading issues:', error);
        showNinetyError('Failed to load Issues');
    }
}

// Load Data items
async function loadNinetyDataItems() {
    try {
        console.log('🔄 Starting to load data items...');
        const response = await fetch('/api/ninety-data/data');
        
        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);
        
        if (!response.ok) {
            throw new Error('Failed to load data items');
        }
        
        const data = await response.json();
        console.log('📊 Received data items:', data);
        console.log('📊 Data array:', data.data);
        console.log('📊 Data count:', data.data ? data.data.length : 'undefined');
        
        currentNinetyData.data = data.data || [];
        console.log('💾 Stored data in currentNinetyData:', currentNinetyData.data.length);
        
        updateNinetyDisplay('data', currentNinetyData.data);
        
    } catch (error) {
        console.error('❌ Error loading data items:', error);
        showNinetyError('Failed to load Data');
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