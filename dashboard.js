// Initialize Socket.io connection
const socket = io();

let funnelChart;
let currentView = 'today'; // Track current view: 'today', 'summary', or specific date
let availableDates = []; // Store available dates for dropdown

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

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Dashboard initialized - waiting for data...');
    
    // Add loading indicators
    const loadingElements = document.querySelectorAll('#googleImpressions, #facebookImpressions, #leads, #revenue');
    loadingElements.forEach(el => {
        if (el.textContent === '0') {
            el.textContent = 'Loading...';
        }
    });
});

// NEW: Date selection and summary functionality
function initializeDateSelector() {
    const dateSelect = document.getElementById('dateSelect');
    
    // Load available dates from server
    loadAvailableDates();
    
    // Handle date selection changes
    dateSelect.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        
        if (selectedValue === 'summary') {
            showSummaryView();
        } else if (selectedValue === 'today') {
            showTodayView();
        } else {
            showSpecificDateView(selectedValue);
        }
    });
}

// Load available dates from the server
async function loadAvailableDates() {
    try {
        const response = await fetch('/api/available-dates');
        const dates = await response.json();
        
        availableDates = dates;
        populateDateDropdown(dates);
    } catch (error) {
        console.error('❌ Error loading available dates:', error);
    }
}

// Populate the date dropdown with available dates
function populateDateDropdown(dates) {
    const dateSelect = document.getElementById('dateSelect');
    
    // Keep existing options (Today and Summary)
    const existingOptions = dateSelect.innerHTML;
    
    // Add specific date options
    dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatDateForDisplay(date);
        dateSelect.appendChild(option);
    });
}

// Format date for display in dropdown
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateString === today.toISOString().split('T')[0]) {
        return 'Today';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }
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
        const url = date === 'today' ? '/api/dashboard-data' : `/api/dashboard-data/${date}`;
        const response = await fetch(url);
        const data = await response.json();
        
        updateDashboard(data);
        
        // Update last updated timestamp
        updateLastUpdated(new Date().toISOString());
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
    }
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

// Initialize date selector when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Dashboard initialized - waiting for data...');
    
    // Initialize date selector
    initializeDateSelector();
    
    // Add loading indicators
    const loadingElements = document.querySelectorAll('#googleImpressions, #facebookImpressions, #leads, #revenue');
    loadingElements.forEach(el => {
        if (el.textContent === '0') {
            el.textContent = 'Loading...';
        }
    });
});

console.log('📊 Comprehensive Dashboard JavaScript loaded successfully!');

// NEW: Date selection and summary functionality
function initializeDateSelector() {
    const dateSelect = document.getElementById('dateSelect');
    
    // Load available dates from server
    fetch('/api/available-dates')
        .then(response => response.json())
        .then(data => {
            availableDates = data.dates || [];
            populateDateDropdown();
        })
        .catch(error => {
            console.log('⚠️ Could not load available dates:', error);
        });
    
    // Handle date selection change
    dateSelect.addEventListener('change', handleDateChange);
}

function populateDateDropdown() {
    const dateSelect = document.getElementById('dateSelect');
    
    // Clear existing options except "Today" and "All Days Summary"
    while (dateSelect.children.length > 2) {
        dateSelect.removeChild(dateSelect.lastChild);
    }
    
    // Add available dates
    availableDates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatDateForDisplay(date);
        dateSelect.appendChild(option);
    });
}

function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function handleDateChange(event) {
    const selectedValue = event.target.value;
    currentView = selectedValue;
    
    if (selectedValue === 'today') {
        showTodayView();
        loadTodayData();
    } else if (selectedValue === 'summary') {
        showSummaryView();
        loadSummaryData();
    } else {
        // Specific date selected
        showTodayView(); // Use same layout as today
        loadSpecificDateData(selectedValue);
    }
}

function showTodayView() {
    document.getElementById('summarySection').style.display = 'none';
    document.querySelector('.platform-overview').style.display = 'block';
    document.querySelector('.revenue-funnel').style.display = 'block';
    document.querySelector('.platform-comparison').style.display = 'block';
}

function showSummaryView() {
    document.getElementById('summarySection').style.display = 'block';
    document.querySelector('.platform-overview').style.display = 'none';
    document.querySelector('.revenue-funnel').style.display = 'none';
    document.querySelector('.platform-comparison').style.display = 'none';
}

function loadTodayData() {
    // This will trigger the normal data loading
    socket.emit('requestTodayData');
}

function loadSpecificDateData(date) {
    fetch(`/api/daily-data/${date}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateDashboardWithDateData(data.data);
            } else {
                console.log('⚠️ No data available for selected date');
                showNoDataMessage();
            }
        })
        .catch(error => {
            console.error('❌ Error loading date data:', error);
            showNoDataMessage();
        });
}

function loadSummaryData() {
    fetch('/api/summary-data')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateSummaryView(data.data);
            } else {
                console.log('⚠️ No summary data available');
                showNoSummaryDataMessage();
            }
        })
        .catch(error => {
            console.error('❌ Error loading summary data:', error);
            showNoSummaryDataMessage();
        });
}

function updateDashboardWithDateData(data) {
    if (data.google) {
        updateGoogleAdsData(data.google);
    }
    if (data.facebook) {
        updateFacebookAdsData(data.facebook);
    }
    if (data.comparison) {
        updatePlatformComparison(data.comparison);
    }
    
    // Update last updated to show the selected date
    document.getElementById('lastUpdated').textContent = `Data for ${formatDateForDisplay(data.date)}`;
}

function updateSummaryView(summaryData) {
    // Update summary cards
    document.getElementById('summaryPeriod').textContent = `Last ${summaryData.totalDays} days`;
    
    // Total performance
    document.getElementById('totalRevenue').textContent = formatCurrency(summaryData.totals.revenue);
    document.getElementById('totalProfit').textContent = formatCurrency(summaryData.totals.profit);
    document.getElementById('totalAdSpend').textContent = formatCurrency(summaryData.totals.adSpend);
    document.getElementById('averageROAS').textContent = summaryData.totals.averageROAS.toFixed(2);
    
    // Google summary
    document.getElementById('googleTotalImpressions').textContent = formatNumber(summaryData.google.totalImpressions);
    document.getElementById('googleTotalRevenue').textContent = formatCurrency(summaryData.google.totalRevenue);
    document.getElementById('googleTotalProfit').textContent = formatCurrency(summaryData.google.totalProfit);
    document.getElementById('googleAvgROAS').textContent = summaryData.google.averageROAS.toFixed(2);
    
    // Facebook summary
    document.getElementById('facebookTotalImpressions').textContent = formatNumber(summaryData.facebook.totalImpressions);
    document.getElementById('facebookTotalRevenue').textContent = formatCurrency(summaryData.facebook.totalRevenue);
    document.getElementById('facebookTotalProfit').textContent = formatCurrency(summaryData.facebook.totalProfit);
    document.getElementById('facebookAvgROAS').textContent = summaryData.facebook.averageROAS.toFixed(2);
    
    // Update history table
    updateHistoryTable(summaryData.dailyHistory);
    
    // Update trends
    updatePerformanceTrends(summaryData.trends);
}

function updateHistoryTable(dailyHistory) {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';
    
    if (!dailyHistory || dailyHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading-row">No historical data available</td></tr>';
        return;
    }
    
    dailyHistory.forEach(day => {
        const row = document.createElement('tr');
        
        const winner = day.comparison.winningPlatform === 'google' ? 'Google' : 'Facebook';
        const winnerClass = day.comparison.winningPlatform === 'google' ? 'winner-google' : 'winner-facebook';
        
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
            <td class="winner-cell ${winnerClass}">${winner}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function updatePerformanceTrends(trends) {
    // Revenue trend
    const revenueTrend = document.getElementById('revenueTrend');
    updateTrendIndicator(revenueTrend, trends.revenue);
    
    // ROAS trend
    const roasTrend = document.getElementById('roasTrend');
    updateTrendIndicator(roasTrend, trends.roas);
    
    // Profit trend
    const profitTrend = document.getElementById('profitTrend');
    updateTrendIndicator(profitTrend, trends.profit);
}

function updateTrendIndicator(element, trendData) {
    const icon = element.querySelector('i');
    const span = element.querySelector('span');
    
    // Remove existing classes
    element.classList.remove('positive', 'negative', 'neutral');
    
    if (trendData.direction === 'up') {
        element.classList.add('positive');
        icon.className = 'fas fa-arrow-up';
        span.textContent = `+${trendData.percentage.toFixed(1)}%`;
    } else if (trendData.direction === 'down') {
        element.classList.add('negative');
        icon.className = 'fas fa-arrow-down';
        span.textContent = `${trendData.percentage.toFixed(1)}%`;
    } else {
        element.classList.add('neutral');
        icon.className = 'fas fa-minus';
        span.textContent = '0%';
    }
}

function showNoDataMessage() {
    // Show message in platform cards
    document.getElementById('googleImpressions').textContent = 'No data';
    document.getElementById('facebookImpressions').textContent = 'No data';
    document.getElementById('lastUpdated').textContent = 'No data available for selected date';
}

function showNoSummaryDataMessage() {
    document.getElementById('totalRevenue').textContent = 'No data';
    document.getElementById('totalProfit').textContent = 'No data';
    document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="10" class="loading-row">No summary data available</td></tr>';
}

// Initialize date selector when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Dashboard initialized - waiting for data...');
    
    // Initialize date selector
    setTimeout(initializeDateSelector, 1000); // Wait a bit for the page to load
    
    // Add loading indicators
    const loadingElements = document.querySelectorAll('#googleImpressions, #facebookImpressions, #leads, #revenue');
    loadingElements.forEach(el => {
        if (el.textContent === '0') {
            el.textContent = 'Loading...';
        }
    });
});