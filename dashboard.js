// Initialize Socket.io connection
const socket = io();

let funnelChart;
let currentView = 'today'; // Track current view: 'today', 'summary', or specific date
let availableDates = []; // Store available dates for calendar
let currentCalendarDate = new Date(); // Current month/year being displayed
let selectedDates = []; // Selected date(s)
let selectionMode = 'single'; // 'single', 'range', or 'summary'
let calendarOpen = false;

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
            const startDate = new Date(selectedDates[0]);
            const endDate = new Date(selectedDates[1]);
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
        dayElement.addEventListener('click', () => handleDateClick(dateStr));
        
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
    return date.toISOString().split('T')[0];
}

function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateString === formatDateForAPI(today)) {
        return 'Today';
    } else if (dateString === formatDateForAPI(yesterday)) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
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
        let url, response, data;
        
        if (date === 'today') {
            // Load current dashboard data
            url = '/api/dashboard';
            response = await fetch(url);
            data = await response.json();
            updateDashboard(data);
        } else {
            // Load specific date data
            url = `/api/daily-data/${date}`;
            response = await fetch(url);
            const result = await response.json();
            
            if (result.success && result.data) {
                updateDashboardWithSingleDateData(result.data);
                console.log(`✅ Loaded data for ${date}`);
            } else {
                console.error('❌ No data available for date:', date);
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
        const response = await fetch(`/api/date-range/${startDate}/${endDate}`);
        const result = await response.json();
        
        if (result.success) {
            updateDashboardWithRangeData(result.data);
            console.log(`✅ Loaded date range data: ${startDate} to ${endDate}`);
        } else {
            console.error('❌ Failed to load date range data:', result.error);
        }
    } catch (error) {
        console.error('❌ Error loading date range data:', error);
    }
}

// NEW: Update dashboard with date range data
function updateDashboardWithRangeData(rangeData) {
    // Update platform cards with aggregated data
    if (rangeData.totals) {
        const totalDays = rangeData.google.length + rangeData.facebook.length;
        
        // Calculate Google aggregated data
        let googleTotals = {
            impressions: 0,
            clicks: 0,
            revenue: 0,
            adSpend: 0,
            profit: 0
        };
        
        rangeData.google.forEach(day => {
            googleTotals.impressions += day.impressions || 0;
            googleTotals.clicks += day.clicks || 0;
            googleTotals.revenue += day.revenue || 0;
            googleTotals.adSpend += day.adSpend || 0;
            googleTotals.profit += day.grossProfit || 0;
        });
        
        // Calculate Facebook aggregated data
        let facebookTotals = {
            impressions: 0,
            clicks: 0,
            revenue: 0,
            adSpend: 0,
            profit: 0
        };
        
        rangeData.facebook.forEach(day => {
            facebookTotals.impressions += day.impressions || 0;
            facebookTotals.clicks += day.clicks || 0;
            facebookTotals.revenue += day.revenue || 0;
            facebookTotals.adSpend += day.adSpend || 0;
            facebookTotals.profit += day.grossProfit || 0;
        });
        
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
                status: `${rangeData.google.length} days aggregated`,
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
                status: `${rangeData.facebook.length} days aggregated`,
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
                `${winner} is performing better over this ${rangeData.google.length + rangeData.facebook.length} day period`,
                `Total combined revenue: ${formatCurrency(totalGoogleRevenue + totalFacebookRevenue)}`,
                `Total combined profit: ${formatCurrency(googleTotals.profit + facebookTotals.profit)}`
            ]
        };
        
        updatePlatformComparison(comparisonData);
    }
    
    // Update last updated timestamp to show date range
    const startDate = formatDateForDisplay(rangeData.startDate);
    const endDate = formatDateForDisplay(rangeData.endDate);
    document.getElementById('lastUpdated').textContent = `Data Range: ${startDate} - ${endDate}`;
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