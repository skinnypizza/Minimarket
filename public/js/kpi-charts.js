/**
 * Advanced KPI Dashboard Logic (HU-02)
 * Handles fetching and rendering of real-time analytics
 */

let salesChart, topProductsChart, salesByCategoryChart, fifoLifoChart;
let currentPeriod = 'month'; // Default period

document.addEventListener('DOMContentLoaded', () => {
    initializeFilters();
    fetchKPIs();
});

function initializeFilters() {
    // Period buttons
    const periodBtns = document.querySelectorAll('.period-btn');
    periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            periodBtns.forEach(b => {
                b.classList.remove('bg-brand-50', 'text-brand-700', 'shadow-sm');
                b.classList.add('text-gray-600', 'hover:bg-gray-50');
            });
            btn.classList.remove('text-gray-600', 'hover:bg-gray-50');
            btn.classList.add('bg-brand-50', 'text-brand-700', 'shadow-sm');

            currentPeriod = btn.dataset.period;

            // Clear custom dates if using preset period
            document.getElementById('startDate').value = '';
            document.getElementById('endDate').value = '';

            fetchKPIs();
        });
    });

    // Custom date form
    const filterForm = document.getElementById('kpiFilterForm');
    if (filterForm) {
        filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            currentPeriod = 'custom';

            // Reset period buttons
            periodBtns.forEach(b => {
                b.classList.remove('bg-brand-50', 'text-brand-700', 'shadow-sm');
                b.classList.add('text-gray-600', 'hover:bg-gray-50');
            });

            fetchKPIs();
        });
    }
}

function fetchKPIs() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    let query = `?period=${currentPeriod}`;
    if (startDate && endDate) {
        query = `?startDate=${startDate}&endDate=${endDate}`;
    }

    // Show loading state if needed (optional)

    fetch(`/api/kpis${query}`)
        .then(res => res.json())
        .then(data => {
            updateSummaryCards(data.summaryKPIs, data.stockAlerts);
            updateCharts(data);
            updateTables(data);

            // Update period label
            const label = document.getElementById('salesChartPeriodLabel');
            if (label) label.textContent = data.periodLabel;
        })
        .catch(err => console.error('Error loading KPIs:', err));
}

function updateSummaryCards(summary, alerts) {
    // Helper for currency formatting
    const formatMoney = (amount) => `Bs. ${parseFloat(amount).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;

    // Update cards
    document.getElementById('kpiTotalSales').textContent = formatMoney(summary.totalSales);
    document.getElementById('kpiTotalTransactions').textContent = summary.totalTransactions;
    document.getElementById('kpiAvgTicket').textContent = formatMoney(summary.avgTicket);
    document.getElementById('kpiInventoryValue').textContent = formatMoney(summary.inventoryValue);
    document.getElementById('kpiTotalStock').textContent = summary.totalStock;

    // Alerts
    document.getElementById('kpiLowStockCount').textContent = alerts.lowStockCount;
    document.getElementById('kpiOutOfStockCount').textContent = alerts.outOfStockCount;
}

function updateCharts(data) {
    // 1. Sales Trend Chart
    const salesCtx = document.getElementById('salesOverTimeChart');
    if (salesCtx) {
        if (salesChart) salesChart.destroy();
        salesChart = new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: data.salesOverTime.labels,
                datasets: [{
                    label: 'Ventas (Bs.)',
                    data: data.salesOverTime.data,
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => `Ventas: Bs. ${context.raw.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { borderDash: [2, 4], color: '#f3f4f6' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // 2. Top Products Chart
    const topCtx = document.getElementById('topSellingProductsChart');
    if (topCtx) {
        if (topProductsChart) topProductsChart.destroy();
        topProductsChart = new Chart(topCtx, {
            type: 'bar',
            data: {
                labels: data.topSellingProducts.labels,
                datasets: [{
                    label: 'Unidades',
                    data: data.topSellingProducts.data,
                    backgroundColor: '#3b82f6',
                    borderRadius: 6,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    // 3. Sales by Category Chart
    const catCtx = document.getElementById('salesByCategoryChart');
    if (catCtx) {
        if (salesByCategoryChart) salesByCategoryChart.destroy();

        const colors = ['#16a34a', '#3b82f6', '#8b5cf6', '#f97316', '#ef4444', '#06b6d4'];

        salesByCategoryChart = new Chart(catCtx, {
            type: 'doughnut',
            data: {
                labels: data.salesByCategory.labels,
                datasets: [{
                    data: data.salesByCategory.data,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { display: false } }
            }
        });

        // Custom Legend
        const legendContainer = document.getElementById('categoryLegend');
        if (legendContainer) {
            legendContainer.innerHTML = data.salesByCategory.labels.map((label, i) => `
                <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full" style="background-color: ${colors[i % colors.length]}"></span>
                        <span class="text-gray-600">${label}</span>
                    </div>
                    <span class="font-bold text-gray-800">Bs. ${data.salesByCategory.data[i].toFixed(2)}</span>
                </div>
            `).join('');
        }
    }

    // 4. FIFO/LIFO Chart
    const fifoLifoCtx = document.getElementById('fifoLifoChart');
    if (fifoLifoCtx) {
        if (fifoLifoChart) fifoLifoChart.destroy();

        // Prepare data for chart (top 5 products by FIFO value)
        const products = data.fifoLifoAnalysis.products.slice(0, 5);

        fifoLifoChart = new Chart(fifoLifoCtx, {
            type: 'bar',
            data: {
                labels: products.map(p => p.name),
                datasets: [
                    {
                        label: 'Valor FIFO',
                        data: products.map(p => p.fifoValue),
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    },
                    {
                        label: 'Valor LIFO',
                        data: products.map(p => p.lifoValue),
                        backgroundColor: '#8b5cf6',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                    x: { grid: { display: false } }
                }
            }
        });

        // Update summary values
        document.getElementById('fifoTotalValue').textContent = `Bs. ${data.fifoLifoAnalysis.totalFifoValue.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
        document.getElementById('lifoTotalValue').textContent = `Bs. ${data.fifoLifoAnalysis.totalLifoValue.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
        document.getElementById('fifoLifoDiff').textContent = `Bs. ${data.fifoLifoAnalysis.difference.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`;
    }
}

function updateTables(data) {
    // Rotation Table
    const rotationBody = document.getElementById('rotationTableBody');
    if (rotationBody) {
        rotationBody.innerHTML = data.inventoryRotation.details.map(item => `
            <tr class="border-b border-gray-50 hover:bg-gray-50">
                <td class="px-3 py-3 font-medium text-gray-800">${item.name}</td>
                <td class="px-3 py-3 text-center">${item.rotation.toFixed(2)}x</td>
                <td class="px-3 py-3 text-center">
                    <span class="px-2 py-1 rounded-full text-xs font-bold 
                        ${item.status === 'alta' ? 'bg-green-100 text-green-700' :
                item.status === 'media' ? 'bg-blue-100 text-blue-700' :
                    'bg-orange-100 text-orange-700'}">
                        ${item.status.toUpperCase()}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // Alerts List
    const alertsList = document.getElementById('alertsList');
    if (alertsList) {
        if (data.stockAlerts.outOfStock.length === 0 && data.stockAlerts.lowStock.length === 0) {
            alertsList.innerHTML = '<div class="text-center text-green-600 py-4 text-sm"><i class="fas fa-check-circle"></i> Todo en orden</div>';
        } else {
            let html = '';

            // Out of stock
            data.stockAlerts.outOfStock.forEach(item => {
                html += `
                    <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-red-600">
                                <i class="fas fa-times"></i>
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-800">${item.name}</p>
                                <p class="text-xs text-red-600 font-medium">Agotado</p>
                            </div>
                        </div>
                        <span class="text-xs font-bold bg-white px-2 py-1 rounded text-gray-600">0 un.</span>
                    </div>
                `;
            });

            // Low stock
            data.stockAlerts.lowStock.forEach(item => {
                html += `
                    <div class="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center text-orange-600">
                                <i class="fas fa-exclamation"></i>
                            </div>
                            <div>
                                <p class="text-sm font-bold text-gray-800">${item.name}</p>
                                <p class="text-xs text-orange-600 font-medium">Stock Bajo</p>
                            </div>
                        </div>
                        <span class="text-xs font-bold bg-white px-2 py-1 rounded text-gray-600">${item.stock} un.</span>
                    </div>
                `;
            });

            alertsList.innerHTML = html;
        }
    }
}
