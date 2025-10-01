// Global variables
let allData = [];
let filteredData = [];
let map;
let markersLayer;
let charts = {};
// 0 = unsorted, 1 = A->Я (ascending), 2 = Я->A (descending)
let tableSortState = 0;

let currentPage = 1;
let itemsPerPage = 10;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initTheme();
    initMap();
    initFilters();
    initEventListeners();
    initTableSorting();
    updateUI();
});

// Load JSON data
function loadData() {
    try {
        // Перевірка наявності глобальної константи ALL_CNAP_DATA з converted.js
        if (typeof ALL_CNAP_DATA === 'undefined') {
            throw new Error('Константа ALL_CNAP_DATA не знайдена. Перевірте, що файл converted.js підключено перед script.js в index.html.');
        }

        allData = ALL_CNAP_DATA;
        filteredData = [...allData];
        console.log(`Loaded ${allData.length} records`);
        document.getElementById('loading').classList.add('hidden');
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Критична помилка завантаження даних. Перевірте консоль для деталей.');
        document.getElementById('loading').classList.add('hidden');
    }
}

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    // Оновлення іконки (збережено як у попередній версії)
    const iconContainer = document.getElementById('themeToggle');
    if (theme === 'dark') {
        iconContainer.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sun"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
    } else {
        iconContainer.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    }
}

// Initialize map
function initMap() {
    // Центральна точка України
    map = L.map('map').setView([48.5, 31.5], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}

// Get marker icon based on type (без змін)
function getMarkerIcon(type) {
    const iconColors = {
        'ЦНАП': '#0066cc',
        'ДІЯ ЦЕНТР': '#28a745',
        'МОБІЛЬНИЙ ЦНАП': '#fd7e14',
        'ВРМ': '#fd7e14',
        'БТІ': '#dc3545',
        'DEFAULT': '#6f42c1'
    };

    const key = String(type || '').trim().toUpperCase();
    let color = iconColors['DEFAULT'];
    if (key.includes('ВРМ')) color = iconColors['ВРМ'];
    else if (key.includes('БТІ')) color = iconColors['БТІ'];
    else if (iconColors[key]) color = iconColors[key];

    return L.divIcon({
        html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });
}

function isValidField(value) {
    if (value === null || value === undefined) return false;
    const s = String(value).trim();
    if (s === '') return false;
    if (s.toLowerCase() === 'null') return false;
    return true;
}

function displayValue(value, fallback = '') {
    return isValidField(value) ? String(value) : fallback;
}

// Update map markers
// ЗМІНЕНО: Логіка масштабування для "Zoom-in only"
function updateMap() {
    markersLayer.clearLayers();

    const validCoords = []; // Масив для зберігання [lat, lng] пар

    // 1. Створення маркерів та збір координат
    filteredData.forEach(item => {
        const lat = parseFloat(item.Lat);
        const lng = parseFloat(item.Long);

        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            validCoords.push([lat, lng]);

            const marker = L.marker([lat, lng], {
                icon: getMarkerIcon(item['Тип закладу'])
            });

            // Popup content setup... (скопійовано з попереднього повного коду)
            const popupContent = `
                <div class="popup-content">
                    <div class="popup-title">${displayValue(item['Найменування'], 'Без назви')}</div>
                    <div class="popup-info"><strong>Тип:</strong> ${displayValue(item['Тип закладу'], 'Не вказано')}</div>
                    <div class="popup-info"><strong>Адреса:</strong> ${formatAddress(item)}</div>
                    <div class="popup-info"><strong>Телефон:</strong> ${displayValue(item['Телефон'], 'Не вказано')}</div>
                    <button class="popup-button" onclick="showModal('${item.idf}')">Детальніше</button>
                </div>
            `;
            marker.bindPopup(popupContent);
            markersLayer.addLayer(marker);
        }
    });

    document.getElementById('mapCounter').textContent = `Показано: ${validCoords.length}`;

    // 2. Логіка масштабування з обмеженням "Zoom-in only"
    if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords);
        const currentZoom = map.getZoom();
        
        // Розрахунок оптимального рівня масштабування, необхідного для відображення всіх маркерів (з відступами 50x50px)
        const requiredZoom = map.getBoundsZoom(bounds, false, [50, 50]);
        
        // Якщо необхідний зум більший, ніж поточний (потрібно наблизити)
        if (requiredZoom > currentZoom) {
            // Збільшуємо масштаб, щоб вмістити всі маркери
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            // Якщо необхідний зум менший або дорівнює поточному (ми вже достатньо наближені),
            // ми просто переміщуємо карту до центру нових маркерів, зберігаючи поточний зум.
            map.panTo(bounds.getCenter());
            
            // Спеціальний випадок для однієї точки: якщо ми дуже віддалені (наприклад, з=6), 
            // краще наблизити до локального рівня (наприклад, з=10), навіть якщо requiredZoom менший за поточний
            // (щоб користувач побачив точку).
            if (validCoords.length === 1 && currentZoom < 10) {
                 map.setView(bounds.getCenter(), 10);
            }
        }

    } else {
        // Якщо немає маркерів, скидаємо до початкового вигляду (Україна)
        map.setView([48.5, 31.5], 6);
    }
}


// Ініціалізація фільтрів (без змін)
function initFilters() {
    // Region filter
    const regions = [...new Set(allData.map(item => displayValue(item['Область'])).filter(Boolean))].sort();
    const regionFilter = document.getElementById('regionFilter');
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionFilter.appendChild(option);
    });

    // Type filter
    const types = [...new Set(allData.map(item => displayValue(item['Тип закладу'])).filter(Boolean))].sort();
    const typeFilter = document.getElementById('typeFilter');
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });

    // District filter
    const districts = [...new Set(allData.map(item => displayValue(item['Район'])).filter(Boolean))].sort();
    const districtFilter = document.getElementById('districtFilter');
    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtFilter.appendChild(option);
    });
}

// Event listeners (без змін)
function initEventListeners() {
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);

    // Filter changes
    document.getElementById('regionFilter').addEventListener('change', applyFilters);
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('districtFilter').addEventListener('change', applyFilters);
    document.getElementById('searchFilter').addEventListener('input', applyFilters);
    document.getElementById('wifiFilter').addEventListener('change', applyFilters);
    document.getElementById('accessibleFilter').addEventListener('change', applyFilters);
    document.getElementById('onlineFilter').addEventListener('change', applyFilters);
    document.getElementById('dractsFilter').addEventListener('change', applyFilters);

    // Modal
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });
}

// Initialize table sorting control (stacked triangles) and handlers
function initTableSorting() {
    let nameHeader = document.querySelector('.data-table th[data-col="name"]');
    if (!nameHeader) {
        const headers = Array.from(document.querySelectorAll('.data-table th'));
        nameHeader = headers.find(th => th.textContent.trim().toLowerCase().startsWith('назва'));
    }
    if (!nameHeader) return;

    const control = document.createElement('span');
    control.className = 'sort-control';
    control.innerHTML = `
        <span class="triangle up" data-state="0"></span>
        <span class="triangle down" data-state="0"></span>
    `;

    const inner = document.createElement('span');
    inner.className = 'th-inner';
    while (nameHeader.firstChild) {
        inner.appendChild(nameHeader.firstChild);
    }
    nameHeader.appendChild(inner);
    inner.appendChild(control);

    control.addEventListener('click', (e) => {
        tableSortState = (tableSortState + 1) % 3;
        updateSortControlVisuals(control);
        updateTable();
    });

    updateSortControlVisuals(control);
}

function updateSortControlVisuals(control) {
    const up = control.querySelector('.triangle.up');
    const down = control.querySelector('.triangle.down');
    up.classList.remove('active');
    down.classList.remove('active');
    up.classList.remove('semi');
    down.classList.remove('semi');

    if (tableSortState === 0) {
        up.classList.add('semi');
        down.classList.add('semi');
    } else if (tableSortState === 1) {
        down.classList.add('active');
        up.classList.add('semi');
    } else if (tableSortState === 2) {
        up.classList.add('active');
        down.classList.add('semi');
    }
}

// Apply filters (без змін)
function applyFilters() {
    const region = document.getElementById('regionFilter').value;
    const type = document.getElementById('typeFilter').value;
    const district = document.getElementById('districtFilter').value;
    const search = document.getElementById('searchFilter').value.toLowerCase();
    const wifiOnly = document.getElementById('wifiFilter').checked;
    const accessibleOnly = document.getElementById('accessibleFilter').checked;
    const onlineOnly = document.getElementById('onlineFilter').checked;
    const dractsOnly = document.getElementById('dractsFilter').checked;

    filteredData = allData.filter(item => {
        if (region && displayValue(item['Область']) !== region) return false;
        if (type && displayValue(item['Тип закладу']) !== type) return false;
        if (district && displayValue(item['Район']) !== district) return false;

        if (search) {
            const searchFields = [
                displayValue(item['Найменування']),
                displayValue(item['Населений пункт']),
                displayValue(item['Вулиця'])
            ].join(' ').toLowerCase();
            if (!searchFields.includes(search)) return false;
        }

        if (wifiOnly && displayValue(item['Вільний Wi-Fi']).toLowerCase() !== 'так') return false;
        if (accessibleOnly && displayValue(item['Вільний (безперешкодний) вхід або пандус']).toLowerCase() !== 'так') return false;
        if (onlineOnly && displayValue(item['Онлайн-консультування']).toLowerCase() !== 'так') return false;
        if (dractsOnly && displayValue(item['Послуги ДРАЦС']).toLowerCase() !== 'так') return false;

        return true;
    });

    currentPage = 1;
    updateUI();
}

// Reset filters (без змін)
function resetFilters() {
    document.getElementById('regionFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('districtFilter').value = '';
    document.getElementById('searchFilter').value = '';
    document.getElementById('wifiFilter').checked = false;
    document.getElementById('accessibleFilter').checked = false;
    document.getElementById('onlineFilter').checked = false;
    document.getElementById('dractsFilter').checked = false;

    filteredData = [...allData];
    tableSortState = 0;
    currentPage = 1; 
    const sortControl = document.querySelector('.sort-control');
    if (sortControl) updateSortControlVisuals(sortControl);

    updateUI();
}

// Update all UI elements (без змін)
function updateUI() {
    updateStats();
    updateMap();
    updateCharts();
    updateTable();
}

// Update statistics (без змін)
function updateStats() {
    document.getElementById('totalCount').textContent = filteredData.length;

    const regions = new Set(filteredData.map(item => displayValue(item['Область'])).filter(Boolean));
    document.getElementById('regionCount').textContent = regions.size;

    const accessible = filteredData.filter(item =>
        displayValue(item['Вільний (безперешкодний) вхід або пандус']).toLowerCase() === 'так'
    ).length;
    document.getElementById('accessibleCount').textContent = accessible;

    const wifi = filteredData.filter(item => displayValue(item['Вільний Wi-Fi']).toLowerCase() === 'так').length;
    document.getElementById('wifiCount').textContent = wifi;
}

// Update charts
function updateCharts() {
    updateDistrictChart(); // ЗМІНЕНО: Викликаємо нову функцію
    updateTypeChart();
    updateServicesChart();
    updateInfrastructureChart();
}

// District chart
function updateDistrictChart() {
    const districtCounts = {};
    filteredData.forEach(item => {
        const district = displayValue(item['Район'], 'Не вказано');
        districtCounts[district] = (districtCounts[district] || 0) + 1;
    });

    const sortedDistricts = Object.entries(districtCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    const ctx = document.getElementById('regionChart');

    if (charts.region) charts.region.destroy();

    const shortLabels = sortedDistricts.map(([district]) => {
        if (district.length > 15) {
            return district.substring(0, 12) + '...';
        }
        return district;
    });

    charts.region = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: shortLabels,
            datasets: [{
                label: 'Кількість закладів',
                data: sortedDistricts.map(([, count]) => count),
                backgroundColor: [
                    'rgba(0, 102, 204, 0.8)',
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(253, 126, 20, 0.8)',
                    'rgba(111, 66, 193, 0.8)',
                    'rgba(220, 53, 69, 0.8)',
                    'rgba(23, 162, 184, 0.8)',
                    'rgba(255, 193, 7, 0.8)',
                    'rgba(108, 117, 125, 0.8)'
                ],
                borderColor: [
                    'rgba(0, 102, 204, 1)',
                    'rgba(40, 167, 69, 1)',
                    'rgba(253, 126, 20, 1)',
                    'rgba(111, 66, 193, 1)',
                    'rgba(220, 53, 69, 1)',
                    'rgba(23, 162, 184, 1)',
                    'rgba(255, 193, 7, 1)',
                    'rgba(108, 117, 125, 1)'
                ],
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Топ районів за кількістю закладів',
                    font: { size: 14, weight: 600 },
                    padding: { bottom: 20 }
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            const index = tooltipItems[0].dataIndex;
                            return sortedDistricts[index][0]; 
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        font: { size: 11 },
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Type chart (без змін)
function updateTypeChart() {
    const typeCounts = {};
    filteredData.forEach(item => {
        const type = displayValue(item['Тип закладу'], 'Не вказано');
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const ctx = document.getElementById('typeChart');

    if (charts.type) charts.type.destroy();

    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);
    const defaultPalette = [
        'rgba(0, 102, 204, 0.8)',
        'rgba(40, 167, 69, 0.8)',
        'rgba(253, 126, 20, 0.8)',
        'rgba(111, 66, 193, 0.8)'
    ];

    const backgroundColor = labels.map((label, i) => {
        if (String(label).toUpperCase().includes('БТІ')) {
            return 'rgba(220, 53, 69, 0.8)';
        }
        return defaultPalette[i % defaultPalette.length];
    });

    charts.type = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Services chart
function updateServicesChart() {
    const services = {
        'Паспортні': filteredData.filter(i => displayValue(i['Паспортні послуги']).toLowerCase() === 'так').length,
        'ДРАЦС': filteredData.filter(i => displayValue(i['Послуги ДРАЦС']).toLowerCase() === 'так').length,
        'Соціальні': filteredData.filter(i => displayValue(i['Соціальні послуги']).toLowerCase() === 'так').length,
        'Водіям': filteredData.filter(i => displayValue(i['Послуги водіям']).toLowerCase() === 'так').length,
        'Консультації': filteredData.filter(i => displayValue(i['Онлайн-консультування']).toLowerCase() === 'так').length
    };

    const ctx = document.getElementById('servicesChart');

    if (charts.services) charts.services.destroy();

    const serviceColors = [
        'rgba(0, 102, 204, 0.8)',   
        'rgba(220, 53, 69, 0.8)',   
        'rgba(40, 167, 69, 0.8)',   
        'rgba(253, 126, 20, 0.8)',  
        'rgba(111, 66, 193, 0.8)'   
    ];

    const serviceBorders = [
        'rgba(0, 102, 204, 1)',
        'rgba(220, 53, 69, 1)',
        'rgba(40, 167, 69, 1)',
        'rgba(253, 126, 20, 1)',
        'rgba(111, 66, 193, 1)'
    ];

    charts.services = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(services),
            datasets: [{
                label: 'Кількість закладів',
                data: Object.values(services),
                backgroundColor: serviceColors,
                borderColor: serviceBorders,
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true,
                    position: 'bottom',
                    labels: {
                        generateLabels: function(chart) {
                            const serviceLabels = Object.keys(services);
                            const serviceColors = [
                                'rgba(0, 102, 204, 0.8)',  
                                'rgba(220, 53, 69, 0.8)',   
                                'rgba(40, 167, 69, 0.8)',   
                                'rgba(253, 126, 20, 0.8)',  
                                'rgba(111, 66, 193, 0.8)'   
                            ];
                            
                            return serviceLabels.map((label, index) => ({
                                text: label,
                                fillStyle: serviceColors[index],
                                strokeStyle: serviceColors[index],
                                lineWidth: 0,
                                hidden: false,
                                index: index
                            }));
                        },
                        usePointStyle: true,
                        pointStyle: 'rect',
                        font: {
                            size: 12
                        },
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: 'Наявність послуг у закладах',
                    font: { size: 14, weight: 600 },
                    padding: { bottom: 20 }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        stepSize: Math.max(1, Math.ceil(Math.max(...Object.values(services)) / 10)),
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    title: {
                        display: true,
                        text: 'Кількість закладів',
                        font: { size: 12, weight: 500 }
                    }
                },
                x: {
                    ticks: {
                        font: { size: 11, weight: 500 },
                        maxRotation: 0,
                        color: 'rgba(0, 0, 0, 0.8)'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10
                }
            }
        }
    });
}

// Infrastructure chart
function updateInfrastructureChart() {
    const infrastructure = {
        'WiFi': filteredData.filter(i => displayValue(i['Вільний Wi-Fi']).toLowerCase() === 'так').length,
        'Пандус': filteredData.filter(i => displayValue(i['Вільний (безперешкодний) вхід або пандус']).toLowerCase() === 'так').length,
        'Санвузол': filteredData.filter(i => displayValue(i['Обладнана санітарна кімната']).toLowerCase() === 'так').length,
        'Стоянка': filteredData.filter(i => displayValue(i['Наявність безоплатної стоянки автотранспорту для осіб з інвалідністю']).toLowerCase() === 'так').length,
        'Ел. черга': filteredData.filter(i => displayValue(i['Електронна черга']).toLowerCase() === 'так').length
    };

    const ctx = document.getElementById('infrastructureChart');

    if (charts.infrastructure) charts.infrastructure.destroy();

    charts.infrastructure = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: Object.keys(infrastructure),
            datasets: [{
                label: 'Кількість закладів',
                data: Object.values(infrastructure),
                backgroundColor: 'rgba(253, 126, 20, 0.2)',
                borderColor: 'rgba(253, 126, 20, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    let displayData = filteredData.slice();

    if (tableSortState === 1) {
        displayData.sort((a, b) => {
            const aName = displayValue(a['Найменування'], '').trim();
            const bName = displayValue(b['Найменування'], '').trim();
            return aName.localeCompare(bName, 'uk', { sensitivity: 'base' });
        });
    } else if (tableSortState === 2) {
        displayData.sort((a, b) => {
            const aName = displayValue(a['Найменування'], '').trim();
            const bName = displayValue(b['Найменування'], '').trim();
            return bName.localeCompare(aName, 'uk', { sensitivity: 'base' });
        });
    }

    const totalItems = displayData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = displayData.slice(startIndex, endIndex);

    pageData.forEach(item => {
        const row = tbody.insertRow();

        row.insertCell(0).textContent = displayValue(item['Найменування'], 'Без назви');
        row.insertCell(1).textContent = displayValue(item['Тип закладу'], '-');
        row.insertCell(2).textContent = displayValue(item['Область'], '-');
        row.insertCell(3).textContent = displayValue(item['Населений пункт'], '-');
        row.insertCell(4).textContent = formatAddress(item);

        const actionsCell = row.insertCell(5);
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn-view';
        viewBtn.textContent = 'Переглянути';
        viewBtn.onclick = () => showModal(item.idf);
        actionsCell.appendChild(viewBtn);
    });

    const start = totalItems > 0 ? startIndex + 1 : 0;
    const end = Math.min(endIndex, totalItems);
    document.getElementById('tableCounter').textContent = 
        `Показано ${start}-${end} з ${totalItems} записів`;

    updatePagination(totalPages);
}

function updatePagination(totalPages) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) {
        createPaginationContainer();
        return updatePagination(totalPages);
    }

    paginationContainer.innerHTML = '';

    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'flex';

    const prevBtn = document.createElement('button');
    prevBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.textContent = '‹ Попередня';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            updateTable();
        }
    };
    paginationContainer.appendChild(prevBtn);

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        const firstBtn = createPageButton(1);
        paginationContainer.appendChild(firstBtn);
        
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = createPageButton(i);
        paginationContainer.appendChild(pageBtn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.className = 'pagination-ellipsis';
            ellipsis.textContent = '...';
            paginationContainer.appendChild(ellipsis);
        }
        
        const lastBtn = createPageButton(totalPages);
        paginationContainer.appendChild(lastBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.textContent = 'Наступна ›';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            updateTable();
        }
    };
    paginationContainer.appendChild(nextBtn);
}

function createPageButton(pageNum) {
    const btn = document.createElement('button');
    btn.className = `pagination-btn ${pageNum === currentPage ? 'active' : ''}`;
    btn.textContent = pageNum;
    btn.onclick = () => {
        currentPage = pageNum;
        updateTable();
    };
    return btn;
}

function createPaginationContainer() {
    const tableSection = document.querySelector('.table-section');
    if (!tableSection) return;
    
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination';
    paginationContainer.className = 'pagination-container';
    
    tableSection.appendChild(paginationContainer);
}

// Format address (без змін)
function formatAddress(item) {
    const parts = [
        displayValue(item['Вулиця']),
        isValidField(item['Будинок']) ? `буд. ${item['Будинок']}` : null,
        isValidField(item['Корпус']) ? `корп. ${item['Корпус']}` : null
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Адреса не вказана';
}

// Show modal (без змін)
function showModal(idf) {
    const item = allData.find(i => i.idf === idf);
    if (!item) return;

    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');

    modalBody.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">${displayValue(item['Найменування'], 'Без назви')}</h2>
            <div class="modal-subtitle">${displayValue(item['Тип закладу'], 'Тип не вказано')}</div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Адреса
            </div>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <div class="modal-info-label">Повна адреса</div>
                    <div class="modal-info-value">
                                ${displayValue(item['Індекс'])} ${displayValue(item['Область'])}${isValidField(item['Район']) ? ', ' + displayValue(item['Район']) : ''}
                                ${isValidField(item['Тип населеного пункту']) ? ', ' + displayValue(item['Тип населеного пункту']) : ''} ${displayValue(item['Населений пункт'])}
                                ${formatAddress(item)}
                            </div>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                Контактна інформація
            </div>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <div class="modal-info-label">Керівник</div>
                    <div class="modal-info-value">${displayValue(item['Керівник'], 'Не вказано')}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">Телефон</div>
                    <div class="modal-info-value">${displayValue(item['Телефон'], 'Не вказано')}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">Email</div>
                    <div class="modal-info-value">${displayValue(item['Електронна скринька'], 'Не вказано')}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">Веб-сайт</div>
                    <div class="modal-info-value">
                        ${isValidField(item['Веб-сайт'])
                            ? `<a href="${displayValue(item['Веб-сайт'])}" target="_blank" style="color: var(--color-blue);">${displayValue(item['Веб-сайт'])}</a>`
                            : 'Не вказано'}
                    </div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">Графік роботи</div>
                    <div class="modal-info-value" style="white-space: pre-line;">${displayValue(item['Графік роботи'], 'Не вказано')}</div>
                </div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Доступні послуги
            </div>
            <div>
                ${createBadge('Паспортні послуги', item['Паспортні послуги'])}
                ${createBadge('Послуги ДРАЦС', item['Послуги ДРАЦС'])}
                ${createBadge('Соціальні послуги', item['Соціальні послуги'])}
                ${createBadge('Послуги водіям', item['Послуги водіям'])}
                ${createBadge('Онлайн-консультування', item['Онлайн-консультування'])}
                ${createBadge('Консультування телефоном', item['Консультування телефоном'])}
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Доступність та зручності
            </div>
            <div>
                ${createBadge('Безбар\'єрний вхід/пандус', item['Вільний (безперешкодний) вхід або пандус'])}
                ${createBadge('Сходи з поручнями', item['Сходи з поручнями'])}
                ${createBadge('Санітарна кімната', item['Обладнана санітарна кімната'])}
                ${createBadge('Стоянка для осіб з інвалідністю', item['Наявність безоплатної стоянки автотранспорту для осіб з інвалідністю'])}
                ${createBadge('Зупинка транспорту поруч', item['Наявність зупинок громадського транспорту в радіусі 100м'])}
                ${createBadge('Вільний Wi-Fi', item['Вільний Wi-Fi'])}
                ${createBadge('Електронна черга', item['Електронна черга'])}
                ${createBadge('Місце для колясок', item['Місце для тимчасового розміщення дитячих колясок'])}
            </div>
        </div>
    `;

    modal.classList.add('active');
}

// Close modal (без змін)
function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// Create badge (без змін)
function createBadge(label, value) {
    if (!isValidField(value)) {
        return `<span class="modal-badge badge-no">${label}: ✗</span>`;
    }
    const isYes = String(value).trim().toLowerCase() === 'так';
    const badgeClass = isYes ? 'badge-yes' : 'badge-no';
    return `<span class="modal-badge ${badgeClass}">${label}: ${isYes ? '✓' : '✗'}</span>`;
}

// Make showModal global for onclick handlers (без змін)
window.showModal = showModal;