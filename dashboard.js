// Initialize Socket.io connection
const socket = io();

let funnelChart;

// Format number as currency
function formatCurrency(num) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}

// Format number with commas
function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
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

// Update entire dashboard
function updateDashboard(data) {
    updateGoals(data.goals);
    updateRevenueFunnel(data.revenueFunnel);
    updateVTO(data.vto);
    updateIssues(data.issues);
    updateScorecard(data.scorecard);
    updateKnowledgeBase(data.knowledgeBase);
    updateLastUpdated(data.lastUpdated);
}

// Socket event listeners
socket.on('connect', () => {
    console.log('Connected to dashboard server');
});

socket.on('dashboardData', (data) => {
    console.log('Received dashboard data');
    updateDashboard(data);
    
    // Initialize funnel chart after data is loaded
    setTimeout(() => {
        initializeFunnelChart(data.revenueFunnel);
    }, 100);
});

socket.on('dashboardUpdate', (update) => {
    console.log('Received dashboard update:', update);
    
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
    console.log('Disconnected from dashboard server');
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
    notification.textContent = 'Dashboard Updated';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// Show notification on updates
socket.on('dashboardUpdate', () => {
    showUpdateNotification();
});

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initialized');
    initializeNewSections();
});

// Initialize new sections functionality
function initializeNewSections() {
    // Get modal elements
    const modal = document.getElementById('sectionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const closeModal = document.getElementById('closeModal');
    const addDataBtn = document.getElementById('addDataBtn');

    // Section data structure for different sections
    const sectionData = {
        'creative-team': {
            title: 'Creative Team',
            content: 'Access creative team resources, contact information, and project collaboration tools.'
        },
        'tech-team': {
            title: 'Tech Team',
            content: 'Technical documentation, development resources, and team communication channels.'
        },
        'sales-success': {
            title: 'Sales & Success',
            content: 'Sales materials, customer success resources, and performance tracking tools.'
        },
        'accounting-team': {
            title: 'Accounting Team',
            content: 'Financial reports, accounting procedures, and expense management tools.'
        },
        'media-team': {
            title: 'Media Team',
            content: 'Media assets, campaign materials, and content creation resources.'
        },
        'jrs-knowledge-hub': {
            title: 'Jrs-Knowledge Hub',
            content: 'Junior staff training materials, onboarding resources, and learning paths.'
        },
        'monthly-schedule': {
            title: 'Monthly Schedule',
            content: 'View and manage monthly schedules, important dates, and team availability.'
        },
        'team-updates': {
            title: 'Team Updates',
            content: 'Latest team announcements, company news, and important updates.'
        },
        'meetings': {
            title: 'Meetings',
            content: 'Schedule meetings, view upcoming appointments, and access meeting notes.'
        },
        'wiki': {
            title: 'Wiki',
            content: 'Company knowledge base, procedures, and shared documentation.'
        },
        'projects': {
            title: 'Projects',
            content: 'Active projects, project timelines, and collaboration tools.'
        },
        'team-directory': {
            title: 'Team Directory',
            content: 'Employee contact information, roles, and organizational structure.'
        },
        'values-culture': {
            title: 'Values & Culture',
            content: 'Company values, culture guidelines, and team building resources.'
        },
        'faq': {
            title: 'FAQ',
            content: 'Frequently asked questions and common procedures.'
        },
        'office-manual': {
            title: 'Office Manual',
            content: 'Office procedures, guidelines, and workplace policies.'
        },
        'vacation-policy': {
            title: 'Vacation Policy',
            content: 'Vacation request procedures, policy details, and time-off tracking.'
        },
        'benefits-policies': {
            title: 'Benefits Policies',
            content: 'Employee benefits information, healthcare details, and policy documents.'
        },
        'sops': {
            title: 'SOPs',
            content: 'Standard Operating Procedures for all business processes.'
        },
        'docs': {
            title: 'Docs',
            content: 'General documentation, templates, and reference materials.'
        },
        'ideal-client-profiles': {
            title: 'Ideal Client Profiles',
            content: 'Target customer profiles, persona details, and market research.'
        },
        'product-menu': {
            title: 'Product Menu (Template)',
            content: 'Product offerings, service descriptions, and pricing templates.'
        }
    };

    // Add click event listeners to all clickable items
    const clickableItems = document.querySelectorAll('.clickable-item');
    clickableItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionKey = item.getAttribute('data-section');
            const section = sectionData[sectionKey];
            
            if (section) {
                showSectionModal(section, sectionKey);
            }
        });
    });

    // Close modal functionality
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Add data button functionality
    addDataBtn.addEventListener('click', () => {
        showAddDataInterface();
    });

    // Function to show section modal
    function showSectionModal(section, sectionKey) {
        modalTitle.textContent = section.title;
        modalContent.innerHTML = `
            <div class="section-content" style="text-align: left; margin-bottom: 20px;">
                <p>${section.content}</p>
                <div class="section-placeholder" style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 2px dashed #dee2e6; text-align: center; margin: 20px 0;">
                    <i class="fas fa-plus-circle" style="font-size: 2rem; color: #6c757d; margin-bottom: 10px;"></i>
                    <p style="color: #6c757d; margin: 0;">No data added yet. Click "Add Data" to get started.</p>
                </div>
            </div>
            <button id="addDataBtn" class="add-data-btn" data-section="${sectionKey}">Add Data</button>
        `;
        
        // Re-attach event listener to the new button
        const newAddDataBtn = modalContent.querySelector('#addDataBtn');
        newAddDataBtn.addEventListener('click', () => {
            showAddDataInterface(sectionKey, section.title);
        });

        modal.style.display = 'block';
    }

    // Function to show add data interface
    function showAddDataInterface(sectionKey, sectionTitle) {
        modalContent.innerHTML = `
            <div class="add-data-form">
                <h3>Add Data to ${sectionTitle}</h3>
                <form id="addDataForm" style="text-align: left;">
                    <div style="margin-bottom: 15px;">
                        <label for="dataTitle" style="display: block; margin-bottom: 5px; font-weight: 600;">Title:</label>
                        <input type="text" id="dataTitle" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="Enter title">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label for="dataContent" style="display: block; margin-bottom: 5px; font-weight: 600;">Content:</label>
                        <textarea id="dataContent" rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; resize: vertical;" placeholder="Enter content or description"></textarea>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label for="dataUrl" style="display: block; margin-bottom: 5px; font-weight: 600;">URL (optional):</label>
                        <input type="url" id="dataUrl" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px;" placeholder="https://">
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <button type="submit" class="add-data-btn" style="margin-right: 10px;">Save Data</button>
                        <button type="button" id="cancelAdd" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer;">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        // Handle form submission
        const form = modalContent.querySelector('#addDataForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const title = document.getElementById('dataTitle').value.trim();
            const content = document.getElementById('dataContent').value.trim();
            const url = document.getElementById('dataUrl').value.trim();

            if (!title || !content) {
                alert('Please fill in both title and content fields.');
                return;
            }

            // Here you would typically send the data to your server
            // For now, we'll just show a success message
            showSuccessMessage(sectionTitle, title);
            
            // Close modal after a short delay
            setTimeout(() => {
                modal.style.display = 'none';
            }, 2000);
        });

        // Handle cancel button
        const cancelBtn = modalContent.querySelector('#cancelAdd');
        cancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Function to show success message
    function showSuccessMessage(sectionTitle, dataTitle) {
        modalContent.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-check-circle" style="font-size: 3rem; color: #27ae60; margin-bottom: 15px;"></i>
                <h3 style="color: #27ae60; margin-bottom: 10px;">Success!</h3>
                <p>Your data "${dataTitle}" has been added to ${sectionTitle}.</p>
                <p style="color: #6c757d; font-size: 0.9rem;">The modal will close automatically in a moment.</p>
            </div>
        `;
    }
}

// Add some hover effects and interactions
document.addEventListener('DOMContentLoaded', () => {
    // Add ripple effect to clickable items
    const clickableItems = document.querySelectorAll('.clickable-item');
    clickableItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateY(-3px) scale(1.02)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.transform = 'translateY(0) scale(1)';
        });
    });
}); 