// ===== THEME TOGGLE =====
const themeToggle = document.getElementById('theme-toggle');
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    themeToggle.innerHTML = theme === 'dark' 
        ? '<i class="fas fa-sun"></i>' 
        : '<i class="fas fa-moon"></i>';
}

// ===== TAB NAVIGATION =====
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        
        item.classList.add('active');
        const tabId = item.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
        
        // Load charts when dashboard is opened
        if (tabId === 'dashboard') {
            loadCharts();
        }
    });
});

// ===== CLOCK =====
function updateClock() {
    const now = new Date();
    document.getElementById('time-display').textContent = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
setInterval(updateClock, 1000);
updateClock();

// ===== CHART INSTANCES =====
let chartsInstances = {
    salesTrend: null,
    salesCountry: null,
    expensesCategory: null,
    revenueExpense: null
};

// ===== FORMAT CURRENCY =====
function formatCurrency(value) {
    return '$' + value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ===== LOAD DASHBOARD DATA =====
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard-stats');
        const data = await response.json();
        
        // Animate KPI values
        animateValue('#total-sales', 0, data.total_sales, 1000);
        animateValue('#total-expenses', 0, data.total_expenses, 1000);
        animateValue('#net-profit', 0, data.profit, 1000);
        
        // Update profit margin
        document.getElementById('profit-margin').innerHTML = 
            `<i class="fas fa-percent"></i> ${data.profit_margin.toFixed(2)}% Margin`;
        
        // Update active clients
        document.getElementById('active-clients').textContent = data.unique_clients;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function animateValue(selector, start, end, duration) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = start + progress * (end - start);
        
        element.textContent = formatCurrency(value);
        
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };
    requestAnimationFrame(step);
}

// ===== LOAD CHARTS =====
async function loadCharts() {
    try {
        // Load Sales Trend
        fetchAndDrawChart(
            '/api/sales-trend',
            'salesTrendChart',
            'line',
            'Sales Trend (Monthly)',
            '#6366f1'
        );
        
        // Load Sales Forecast
        loadForecastCharts();
        
        // Load Sales by Country
        fetchAndDrawChart(
            '/api/sales-by-country',
            'salesCountryChart',
            'bar',
            'Sales by Country',
            '#8b5cf6'
        );
        
        // Load Expenses by Category
        fetchAndDrawChart(
            '/api/expenses-by-category',
            'expensesCategoryChart',
            'doughnut',
            'Expenses by Category',
            '#d946ef'
        );
        
        // Load Revenue vs Expenses
        loadRevenueExpenseChart();
        
        // Load Top Clients
        loadTopClients();
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}

async function fetchAndDrawChart(endpoint, canvasId, type, label, color) {
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        // Destroy previous chart if exists
        if (chartsInstances[canvasId]) {
            chartsInstances[canvasId].destroy();
        }
        
        const chartConfig = getChartConfig(type, data.labels, data.values, label, color);
        chartsInstances[canvasId] = new Chart(ctx, chartConfig);
    } catch (error) {
        console.error(`Error loading chart ${canvasId}:`, error);
    }
}

function getChartConfig(type, labels, values, label, color) {
    const baseConfig = {
        labels: labels,
        datasets: [{
            label: label,
            data: values,
        }]
    };
    
    const options = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: type === 'doughnut' || type === 'pie'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        label += '$' + context.parsed.y?.toLocaleString() || context.parsed;
                        return label;
                    }
                }
            }
        }
    };
    
    if (type === 'line') {
        baseConfig.datasets[0].borderColor = color;
        baseConfig.datasets[0].backgroundColor = color + '19';
        baseConfig.datasets[0].borderWidth = 2;
        baseConfig.datasets[0].fill = true;
        baseConfig.datasets[0].tension = 0.4;
    } else if (type === 'bar') {
        baseConfig.datasets[0].backgroundColor = color;
    } else if (type === 'doughnut') {
        const colors = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'];
        baseConfig.datasets[0].backgroundColor = colors;
    }
    
    return { type, data: baseConfig, options };
}

async function loadRevenueExpenseChart() {
    try {
        const statsResponse = await fetch('/api/dashboard-stats');
        const stats = await statsResponse.json();
        
        const ctx = document.getElementById('revenueExpenseChart');
        if (!ctx) return;
        
        if (chartsInstances.revenueExpense) {
            chartsInstances.revenueExpense.destroy();
        }
        
        chartsInstances.revenueExpense = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Total Sales', 'Total Expenses', 'Net Profit'],
                datasets: [{
                    label: 'Amount',
                    data: [stats.total_sales, stats.total_expenses, stats.profit],
                    backgroundColor: ['#6366f1', '#ef4444', '#10b981']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Amount: $' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return '$' + (value / 1000).toFixed(0) + 'K';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading revenue vs expense chart:', error);
    }
}

async function loadTopClients() {
    try {
        const response = await fetch('/api/top-clients');
        const clients = await response.json();
        
        if (!clients || clients.length === 0) {
            document.getElementById('topClientsBody').innerHTML = 
                '<tr><td colspan="4" class="text-center">No data available</td></tr>';
            return;
        }
        
        const totalSales = clients.reduce((sum, c) => sum + parseFloat(c.sales), 0);
        
        const rows = clients.map((client, index) => {
            const percentage = ((parseFloat(client.sales) / totalSales) * 100).toFixed(2);
            
            return `
                <tr>
                    <td><strong>${client.clientname}</strong></td>
                    <td>${formatCurrency(client.sales)}</td>
                    <td>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span>${percentage}%</span>
                    </td>
                    <td>
                        <button class="drill-btn" onclick="showClientDrillDown('${client.clientname}')">
                            <i class="fas fa-arrow-right"></i> View Details
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        document.getElementById('topClientsBody').innerHTML = rows;
    } catch (error) {
        console.error('Error loading top clients:', error);
        document.getElementById('topClientsBody').innerHTML = 
            '<tr><td colspan="4" class="text-center error">Failed to load data</td></tr>';
    }
}

// ===== DRILL-DOWN FUNCTIONALITY =====
async function showClientDrillDown(clientName) {
    try {
        const response = await fetch(`/api/sales-by-client-detail?client=${encodeURIComponent(clientName)}`);
        const data = await response.json();
        
        let detailHtml = '<table class="detail-table"><thead><tr><th>Date</th><th>Sales</th><th>Country</th></tr></thead><tbody>';
        
        if (data.detail && data.detail.length > 0) {
            data.detail.forEach(row => {
                detailHtml += `
                    <tr>
                        <td>${row.date}</td>
                        <td>${formatCurrency(row.netsales)}</td>
                        <td>${row.country}</td>
                    </tr>
                `;
            });
        } else {
            detailHtml += '<tr><td colspan="3" class="text-center">No sales data</td></tr>';
        }
        
        detailHtml += '</tbody></table>';
        
        showModal(`Sales Detail - ${clientName}`, detailHtml);
    } catch (error) {
        console.error('Error loading client drill-down:', error);
        showModal('Error', '<p>Failed to load client details</p>');
    }
}

function showDrillDown(type) {
    if (type === 'country') {
        showModal('Sales by Country', '<p>Click on a country in the chart to see details</p>');
    }
}

function showModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-content">
                ${content}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// ===== AI CHAT =====
async function askAI() {
    const question = document.getElementById("question").value.trim();
    if (!question) return;

    // Add user message
    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML += `
        <div class="message user">
            <div class="message-content">
                <p>${escapeHtml(question)}</p>
            </div>
        </div>
    `;
    document.getElementById("question").value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    // Add typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant typing';
    typingDiv.innerHTML = `
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const res = await fetch("/ask-ai", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({question: question})
        });

        const data = await res.json();
        typingDiv.remove();

        let responseHtml = '';
        if (data.insight) responseHtml += `<p><strong>💡 Insight:</strong> ${escapeHtml(data.insight)}</p>`;
        if (data.sql) responseHtml += `<p><strong>🔍 Query:</strong> <code>${escapeHtml(data.sql)}</code></p>`;
        if (data.table && data.table.length > 0) {
            responseHtml += '<table class="data-table"><thead><tr>';
            Object.keys(data.table[0]).forEach(key => {
                responseHtml += `<th>${key}</th>`;
            });
            responseHtml += '</tr></thead><tbody>';
            data.table.forEach(row => {
                responseHtml += '<tr>';
                Object.values(row).forEach(val => {
                    responseHtml += `<td>${escapeHtml(String(val))}</td>`;
                });
                responseHtml += '</tr>';
            });
            responseHtml += '</tbody></table>';
        }

        chatBox.innerHTML += `
            <div class="message assistant">
                <div class="message-content">
                    ${responseHtml}
                </div>
            </div>
        `;
    } catch (error) {
        typingDiv.remove();
        chatBox.innerHTML += `
            <div class="message assistant error">
                <div class="message-content">
                    <p>❌ Error: ${escapeHtml(error.message)}</p>
                </div>
            </div>
        `;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

function askQuestion(question) {
    document.getElementById("question").value = question;
    askAI();
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        askAI();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    loadCountries();
    loadDashboardStats();
    loadCharts();
    loadGrowthAnalysis();
    
    // Refresh data every 5 minutes
    setInterval(() => {
        loadDashboardStats();
        loadCharts();
    }, 300000);
});

// ===== FILTER FUNCTIONALITY =====
async function loadCountries() {
    try {
        const response = await fetch('/api/countries');
        const data = await response.json();
        const select = document.getElementById('countryFilter');
        
        if (data.countries) {
            data.countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country;
                option.textContent = country;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading countries:', error);
    }
}

function applyFilters() {
    const country = document.getElementById('countryFilter').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    // Show loading state
    const trendCanvas = document.getElementById('salesTrendChart');
    if (trendCanvas) {
        trendCanvas.style.opacity = '0.5';
    }
    
    // Load filtered sales
    loadFilteredSales(country, startDate, endDate);
}

function resetFilters() {
    document.getElementById('countryFilter').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    loadCharts();
}

async function loadFilteredSales(country, startDate, endDate) {
    try {
        let url = '/api/filtered-sales?';
        if (country) url += `country=${country}&`;
        if (startDate) url += `start_date=${startDate}&`;
        if (endDate) url += `end_date=${endDate}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        // Update chart
        if (chartsInstances.salesTrend) {
            chartsInstances.salesTrend.destroy();
        }
        
        const ctx = document.getElementById('salesTrendChart');
        const chartConfig = {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Filtered Sales',
                    data: data.values,
                    borderColor: '#6366f1',
                    backgroundColor: '#6366f119',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Sales: $' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return '$' + (value / 1000).toFixed(0) + 'K';
                            }
                        }
                    }
                }
            }
        };
        
        chartsInstances.salesTrend = new Chart(ctx, chartConfig);
        ctx.style.opacity = '1';
    } catch (error) {
        console.error('Error loading filtered sales:', error);
    }
}

// ===== GROWTH ANALYSIS =====
async function loadGrowthAnalysis() {
    try {
        const response = await fetch('/api/growth-analysis');
        const data = await response.json();
        
        document.getElementById('yoy-growth').textContent = 
            (data.yoy_growth >= 0 ? '+' : '') + data.yoy_growth + '%';
        document.getElementById('mom-growth').textContent = 
            (data.mom_growth >= 0 ? '+' : '') + data.mom_growth + '%';
        document.getElementById('cagr').textContent = 
            (data.cagr >= 0 ? '+' : '') + data.cagr + '%';
        document.getElementById('avg-sales').textContent = 
            formatCurrency(data.avg_monthly_sales);
    } catch (error) {
        console.error('Error loading growth analysis:', error);
    }
}

// ===== FORECAST CHARTS =====
async function loadForecastCharts() {
    try {
        // Sales Forecast
        fetchAndDrawForecastChart(
            '/api/sales-forecast',
            'forecastChart',
            'Sales Forecast'
        );
        
        // Expense Forecast
        fetchAndDrawExpenseForecast(
            '/api/expense-forecast',
            'expenseForecastChart',
            'Expense Forecast'
        );
    } catch (error) {
        console.error('Error loading forecast charts:', error);
    }
}

async function fetchAndDrawForecastChart(endpoint, canvasId, label) {
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        if (chartsInstances[canvasId]) {
            chartsInstances[canvasId].destroy();
        }
        
        // Combine historical and forecast data
        const allLabels = [...data.historical.labels, ...data.forecast.labels];
        const historicalValues = [...data.historical.values];
        const forecastValues = new Array(data.historical.values.length).fill(null);
        forecastValues.push(...data.forecast.values);
        
        const historicalData = [...data.historical.values];
        historicalData.push(...new Array(data.forecast.labels.length).fill(null));
        
        chartsInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allLabels,
                datasets: [
                    {
                        label: 'Historical',
                        data: historicalData,
                        borderColor: '#6366f1',
                        backgroundColor: '#6366f119',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Forecast',
                        data: forecastValues,
                        borderColor: '#8b5cf6',
                        backgroundColor: '#8b5cf619',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'High (95% CI)',
                        data: new Array(data.historical.values.length).fill(null).concat(data.forecast.high),
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                        fill: false,
                        borderDash: [2, 2],
                        pointRadius: 0
                    },
                    {
                        label: 'Low (95% CI)',
                        data: new Array(data.historical.values.length).fill(null).concat(data.forecast.low),
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                        fill: false,
                        borderDash: [2, 2],
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.parsed.y !== null) {
                                    return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return '$' + (value / 1000).toFixed(0) + 'K';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error(`Error loading forecast chart:`, error);
    }
}

async function fetchAndDrawExpenseForecast(endpoint, canvasId, label) {
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        if (chartsInstances[canvasId]) {
            chartsInstances[canvasId].destroy();
        }
        
        chartsInstances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.forecast.labels,
                datasets: [{
                    label: 'Forecasted Expenses',
                    data: data.forecast.values,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#ef4444',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Forecast: $' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return '$' + (value / 1000).toFixed(0) + 'K';
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error loading expense forecast:', error);
    }
}
