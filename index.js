// Global variables
let usersData = [];
let usagesData = [];
let mergedData = [];

// Initialize the dashboard
async function init() {
    try {
        await loadData();
        populateProvinceFilter();
        updateStats();
        renderTable();
        renderCharts();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        document.getElementById('tableBody').innerHTML = 
            '<tr><td colspan="6" class="loading" style="color: red;">Error loading data. Please check console.</td></tr>';
    }
}

// Load JSON data
async function loadData() {
    try {
        const [usersResponse, usagesResponse] = await Promise.all([
            fetch('electricity_users_en.json'),
            fetch('electricity_usages_en.json')
        ]);

        usersData = await usersResponse.json();
        const usagesWrapper = await usagesResponse.json();
        usagesData = usagesWrapper.Sheet1;

        // Merge data by province_code
        mergedData = usersData.map(user => {
            const usage = usagesData.find(u => u.province_code === user.province_code);
            return {
                ...user,
                ...usage
            };
        });
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
// Missing closing brace here!

// Populate province filter dropdown
function populateProvinceFilter() {
    const select = document.getElementById('provinceFilter');
    const provinces = [...new Set(mergedData.map(d => d.province_name))].sort();
    
    provinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province;
        option.textContent = province;
        select.appendChild(option);
    });
}

// Update statistics cards
function updateStats() {
    const data = getFilteredData();
    
    // Total users (all categories)
    const totalUsers = data.reduce((sum, d) => 
        sum + (d.residential_count || 0) + 
        (d.small_business_count || 0) + 
        (d.medium_business_count || 0) + 
        (d.large_business_count || 0) + 
        (d.specialized_business_count || 0) + 
        (d.public_electricity_count || 0) + 
        (d.temporary_electricity_count || 0), 0
    );

    // Total usage (all categories in kWh)
    const totalUsage = data.reduce((sum, d) => 
        sum + (d.residential_kwh || 0) + 
        (d.small_business_kwh || 0) + 
        (d.medium_business_kwh || 0) + 
        (d.large_business_kwh || 0) + 
        (d.specialized_business_kwh || 0) + 
        (d.public_electricity_kwh || 0) + 
        (d.temporary_electricity_kwh || 0) + 
        (d.ev_charging_kwh || 0), 0
    );

    // Total EV charging
    const totalEVCharging = data.reduce((sum, d) => sum + (d.ev_charging_count || 0), 0);

    document.getElementById('totalUsers').textContent = formatNumber(totalUsers);
    document.getElementById('totalUsage').textContent = formatNumber(Math.round(totalUsage));
    document.getElementById('totalProvinces').textContent = data.length;
    document.getElementById('totalEVCharging').textContent = formatNumber(totalEVCharging);
}

// Render data table
function renderTable() {
    const tbody = document.getElementById('tableBody');
    const data = getFilteredData();
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No data found</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(d => {
        const businessUsers = (d.small_business_count || 0) + 
                            (d.medium_business_count || 0) + 
                            (d.large_business_count || 0);
        
        const totalUsage = (d.residential_kwh || 0) + 
                          (d.small_business_kwh || 0) + 
                          (d.medium_business_kwh || 0) + 
                          (d.large_business_kwh || 0) + 
                          (d.specialized_business_kwh || 0) + 
                          (d.public_electricity_kwh || 0) + 
                          (d.temporary_electricity_kwh || 0) + 
                          (d.ev_charging_kwh || 0);

        return `
            <tr>
                <td><strong>${d.province_name}</strong></td>
                <td class="number-cell">${formatNumber(d.residential_count || 0)}</td>
                <td class="number-cell">${formatNumber(businessUsers)}</td>
                <td class="number-cell">${formatNumber(Math.round(totalUsage))}</td>
                <td class="number-cell">${formatNumber(d.ev_charging_kwh || 0)}</td>
                <td class="number-cell">${formatNumber(d.ev_charging_count || 0)}</td>
            </tr>
        `;
    }).join('');
}

// Chart instances
let topProvincesChart = null;
let usageDistributionChart = null;
let userCategoriesChart = null;

// Render charts
function renderCharts() {
    const data = getFilteredData();
    
    // Top 10 provinces by usage
    renderTopProvincesChart(data);
    
    // Usage distribution pie chart
    renderUsageDistributionChart(data);
    
    // User categories pie chart
    renderUserCategoriesChart(data);
}

function renderTopProvincesChart(data) {
    const sorted = [...data].sort((a, b) => {
        const totalA = (a.residential_kwh || 0) + (a.small_business_kwh || 0) + 
                      (a.medium_business_kwh || 0) + (a.large_business_kwh || 0);
        const totalB = (b.residential_kwh || 0) + (b.small_business_kwh || 0) + 
                      (b.medium_business_kwh || 0) + (b.large_business_kwh || 0);
        return totalB - totalA;
    }).slice(0, 10);

    const ctx = document.getElementById('topProvincesChart');
    
    if (topProvincesChart) {
        topProvincesChart.destroy();
    }

    topProvincesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(d => d.province_name),
            datasets: [{
                label: 'Total Usage (kWh)',
                data: sorted.map(d => 
                    (d.residential_kwh || 0) + 
                    (d.small_business_kwh || 0) + 
                    (d.medium_business_kwh || 0) + 
                    (d.large_business_kwh || 0)
                ),
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Usage: ' + formatNumber(Math.round(context.parsed.y)) + ' kWh';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

function renderUsageDistributionChart(data) {
    const totals = {
        residential: data.reduce((sum, d) => sum + (d.residential_kwh || 0), 0),
        smallBusiness: data.reduce((sum, d) => sum + (d.small_business_kwh || 0), 0),
        mediumBusiness: data.reduce((sum, d) => sum + (d.medium_business_kwh || 0), 0),
        largeBusiness: data.reduce((sum, d) => sum + (d.large_business_kwh || 0), 0),
        specialized: data.reduce((sum, d) => sum + (d.specialized_business_kwh || 0), 0)
    };

    const ctx = document.getElementById('usageDistributionChart');
    
    if (usageDistributionChart) {
        usageDistributionChart.destroy();
    }

    usageDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Residential', 'Small Business', 'Medium Business', 'Large Business', 'Specialized'],
            datasets: [{
                data: [
                    totals.residential,
                    totals.smallBusiness,
                    totals.mediumBusiness,
                    totals.largeBusiness,
                    totals.specialized
                ],
                backgroundColor: [
                    'rgba(37, 99, 235, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatNumber(Math.round(context.parsed));
                            return label + ': ' + value + ' kWh';
                        }
                    }
                }
            }
        }
    });
}

function renderUserCategoriesChart(data) {
    const totals = {
        residential: data.reduce((sum, d) => sum + (d.residential_count || 0), 0),
        smallBusiness: data.reduce((sum, d) => sum + (d.small_business_count || 0), 0),
        mediumBusiness: data.reduce((sum, d) => sum + (d.medium_business_count || 0), 0),
        largeBusiness: data.reduce((sum, d) => sum + (d.large_business_count || 0), 0),
        specialized: data.reduce((sum, d) => sum + (d.specialized_business_count || 0), 0)
    };

    const ctx = document.getElementById('userCategoriesChart');
    
    if (userCategoriesChart) {
        userCategoriesChart.destroy();
    }

    userCategoriesChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Residential', 'Small Business', 'Medium Business', 'Large Business', 'Specialized'],
            datasets: [{
                data: [
                    totals.residential,
                    totals.smallBusiness,
                    totals.mediumBusiness,
                    totals.largeBusiness,
                    totals.specialized
                ],
                backgroundColor: [
                    'rgba(37, 99, 235, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(139, 92, 246, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatNumber(context.parsed);
                            return label + ': ' + value + ' users';
                        }
                    }
                }
            }
        }
    });
}

// Get filtered data based on current filters
function getFilteredData() {
    const provinceFilter = document.getElementById('provinceFilter').value;
    const searchText = document.getElementById('searchBox').value.toLowerCase();

    return mergedData.filter(d => {
        const matchesProvince = !provinceFilter || d.province_name === provinceFilter;
        const matchesSearch = !searchText || d.province_name.toLowerCase().includes(searchText);
        return matchesProvince && matchesSearch;
    });
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('provinceFilter').addEventListener('change', () => {
        updateStats();
        renderTable();
        renderCharts();
    });

    document.getElementById('searchBox').addEventListener('input', () => {
        updateStats();
        renderTable();
        renderCharts();
    });
}

// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
