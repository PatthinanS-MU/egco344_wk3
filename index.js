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
}

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