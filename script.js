// Global variables
let allData = [];
let filteredData = [];
let map;
let markersLayer;
let charts = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initTheme();
    initMap();
    initFilters();
    initEventListeners();
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
        'default': '#6f42c1'
    };

    const color = iconColors[type] || iconColors['default'];

    return L.divIcon({
        html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 30]
    });
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
                    <div class="popup-title">${item['Найменування'] || 'Без назви'}</div>
                    <div class="popup-info"><strong>Тип:</strong> ${item['Тип закладу'] || 'Не вказано'}</div>
                    <div class="popup-info"><strong>Адреса:</strong> ${formatAddress(item)}</div>
                    <div class="popup-info"><strong>Телефон:</strong> ${item['Телефон'] || 'Не вказано'}</div>
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
    const regions = [...new Set(allData.map(item => item['Область']).filter(Boolean))].sort();
    const regionFilter = document.getElementById('regionFilter');
    regions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionFilter.appendChild(option);
    });

    // Type filter
    const types = [...new Set(allData.map(item => item['Тип закладу']).filter(Boolean))].sort();
    const typeFilter = document.getElementById('typeFilter');
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });

    // District filter
    const districts = [...new Set(allData.map(item => item['Район']).filter(Boolean))].sort();
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
        if (region && item['Область'] !== region) return false;
        if (type && item['Тип закладу'] !== type) return false;
        if (district && item['Район'] !== district) return false;

        if (search) {
            const searchFields = [
                item['Найменування'],
                item['Населений пункт'],
                item['Вулиця']
            ].join(' ').toLowerCase();
            if (!searchFields.includes(search)) return false;
        }

        if (wifiOnly && item['Вільний Wi-Fi'] !== 'так') return false;
        if (accessibleOnly && item['Вільний (безперешкодний) вхід або пандус'] !== 'так') return false;
        if (onlineOnly && item['Онлайн-консультування'] !== 'так') return false;
        if (dractsOnly && item['Послуги ДРАЦС'] !== 'так') return false;

        return true;
    });

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

    const regions = new Set(filteredData.map(item => item['Область']).filter(Boolean));
    document.getElementById('regionCount').textContent = regions.size;

    const accessible = filteredData.filter(item =>
        item['Вільний (безперешкодний) вхід або пандус'] === 'так'
    ).length;
    document.getElementById('accessibleCount').textContent = accessible;

    const wifi = filteredData.filter(item => item['Вільний Wi-Fi'] === 'так').length;
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
// ЗМІНЕНО: Логіка для побудови графіка за районами
function updateDistrictChart() {
    const districtCounts = {};
    filteredData.forEach(item => {
        const district = item['Район'] || 'Не вказано'; // ВИКОРИСТОВУЄМО 'Район'
        districtCounts[district] = (districtCounts[district] || 0) + 1;
    });

    // Показуємо топ-10 районів для кращої візуалізації
    const sortedDistricts = Object.entries(districtCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const ctx = document.getElementById('regionChart'); // Зберігаємо ID елемента як 'regionChart'

    if (charts.region) charts.region.destroy(); // Зберігаємо посилання як 'charts.region'

    charts.region = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedDistricts.map(([district]) => district),
            datasets: [{
                label: 'Кількість закладів',
                data: sortedDistricts.map(([, count]) => count),
                backgroundColor: 'rgba(0, 102, 204, 0.7)',
                borderColor: 'rgba(0, 102, 204, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Розподіл за районами (Топ-10)', // ЗМІНЕНО ЗАГОЛОВОК
                    font: { size: 16 }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// Type chart (без змін)
function updateTypeChart() {
    const typeCounts = {};
    filteredData.forEach(item => {
        const type = item['Тип закладу'] || 'Не вказано';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const ctx = document.getElementById('typeChart');

    if (charts.type) charts.type.destroy();

    charts.type = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(typeCounts),
            datasets: [{
                data: Object.values(typeCounts),
                backgroundColor: [
                    'rgba(0, 102, 204, 0.8)',
                    'rgba(40, 167, 69, 0.8)',
                    'rgba(253, 126, 20, 0.8)',
                    'rgba(111, 66, 193, 0.8)'
                ]
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

// Services chart (без змін)
function updateServicesChart() {
    const services = {
        'Паспортні': filteredData.filter(i => i['Паспортні послуги'] === 'так').length,
        'ДРАЦС': filteredData.filter(i => i['Послуги ДРАЦС'] === 'так').length,
        'Соціальні': filteredData.filter(i => i['Соціальні послуги'] === 'так').length,
        'Водіям': filteredData.filter(i => i['Послуги водіям'] === 'так').length,
        'Онлайн': filteredData.filter(i => i['Онлайн-консультування'] === 'так').length
    };

    const ctx = document.getElementById('servicesChart');

    if (charts.services) charts.services.destroy();

    charts.services = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(services),
            datasets: [{
                label: 'Кількість закладів',
                data: Object.values(services),
                backgroundColor: 'rgba(40, 167, 69, 0.7)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

// Infrastructure chart (без змін)
function updateInfrastructureChart() {
    const infrastructure = {
        'WiFi': filteredData.filter(i => i['Вільний Wi-Fi'] === 'так').length,
        'Пандус': filteredData.filter(i => i['Вільний (безперешкодний) вхід або пандус'] === 'так').length,
        'Санвузол': filteredData.filter(i => i['Обладнана санітарна кімната'] === 'так').length,
        'Стоянка': filteredData.filter(i => i['Наявність безоплатної стоянки автотранспорту для осіб з інвалідністю'] === 'так').length,
        'Ел. черга': filteredData.filter(i => i['Електронна черга'] === 'так').length
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

// Update table (без змін)
function updateTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    // Show only first 100 for performance
    const displayData = filteredData.slice(0, 100);

    displayData.forEach(item => {
        const row = tbody.insertRow();

        row.insertCell(0).textContent = item['Найменування'] || 'Без назви';
        row.insertCell(1).textContent = item['Тип закладу'] || '-';
        row.insertCell(2).textContent = item['Область'] || '-';
        row.insertCell(3).textContent = item['Населений пункт'] || '-';
        row.insertCell(4).textContent = formatAddress(item);

        const actionsCell = row.insertCell(5);
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn-view';
        viewBtn.textContent = 'Переглянути';
        viewBtn.onclick = () => showModal(item.idf);
        actionsCell.appendChild(viewBtn);
    });

    document.getElementById('tableCounter').textContent =
        `Знайдено: ${filteredData.length}${filteredData.length > 100 ? ' (показано перші 100)' : ''}`;
}

// Format address (без змін)
function formatAddress(item) {
    const parts = [
        item['Вулиця'],
        item['Будинок'] && item['Будинок'] !== 'null' ? `буд. ${item['Будинок']}` : null,
        item['Корпус'] && item['Корпус'] !== 'null' ? `корп. ${item['Корпус']}` : null
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
            <h2 class="modal-title">${item['Найменування'] || 'Без назви'}</h2>
            <div class="modal-subtitle">${item['Тип закладу'] || 'Тип не вказано'}</div>
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
                        ${item['Індекс'] || ''} ${item['Область'] || ''}, ${item['Район'] || ''},
                        ${item['Тип населеного пункту'] || ''} ${item['Населений пункт'] || ''},
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
                    <div class="modal-info-value">${item['Керівник'] || 'Не вказано'}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">Телефон</div>
                    <div class="modal-info-value">${item['Телефон'] || 'Не вказано'}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">Email</div>
                    <div class="modal-info-value">${item['Електронна скринька'] || 'Не вказано'}</div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">Веб-сайт</div>
                    <div class="modal-info-value">
                        ${item['Веб-сайт'] && item['Веб-сайт'] !== 'null'
                            ? `<a href="${item['Веб-сайт']}" target="_blank" style="color: var(--color-blue);">${item['Веб-сайт']}</a>`
                            : 'Не вказано'}
                    </div>
                </div>
                <div class="modal-info-item">
                    <div class="modal-info-label">Графік роботи</div>
                    <div class="modal-info-value" style="white-space: pre-line;">${item['Графік роботи'] || 'Не вказано'}</div>
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
    const isYes = value === 'так';
    const badgeClass = isYes ? 'badge-yes' : 'badge-no';
    return `<span class="modal-badge ${badgeClass}">${label}: ${isYes ? '✓' : '✗'}</span>`;
}

// Make showModal global for onclick handlers (без змін)
window.showModal = showModal;