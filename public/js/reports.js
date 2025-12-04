/**
 * Reports Module - Client-side JavaScript
 * Handles UI interactions for report generation
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const singleDateBtn = document.getElementById('singleDateBtn');
    const rangeDateBtn = document.getElementById('rangeDateBtn');
    const singleDateInput = document.getElementById('singleDateInput');
    const rangeDateInput = document.getElementById('rangeDateInput');
    const reportForm = document.getElementById('reportForm');
    const kpiPreview = document.getElementById('kpiPreview');
    const reportLoading = document.getElementById('reportLoading');
    const reportNoData = document.getElementById('reportNoData');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const downloadCsvBtn = document.getElementById('downloadCsvBtn');

    // Date inputs
    const reportDate = document.getElementById('reportDate');
    const reportStartDate = document.getElementById('reportStartDate');
    const reportEndDate = document.getElementById('reportEndDate');

    // State
    let isRangeMode = false;
    let currentDates = { startDate: null, endDate: null };

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    reportDate.value = today;
    reportStartDate.value = today;
    reportEndDate.value = today;

    // Toggle date mode
    singleDateBtn.addEventListener('click', () => {
        isRangeMode = false;
        singleDateBtn.classList.add('border-brand-500', 'bg-brand-50', 'text-brand-700');
        singleDateBtn.classList.remove('border-gray-200', 'bg-gray-50', 'text-gray-600');
        rangeDateBtn.classList.remove('border-brand-500', 'bg-brand-50', 'text-brand-700');
        rangeDateBtn.classList.add('border-gray-200', 'bg-gray-50', 'text-gray-600');
        singleDateInput.classList.remove('hidden');
        rangeDateInput.classList.add('hidden');
    });

    rangeDateBtn.addEventListener('click', () => {
        isRangeMode = true;
        rangeDateBtn.classList.add('border-brand-500', 'bg-brand-50', 'text-brand-700');
        rangeDateBtn.classList.remove('border-gray-200', 'bg-gray-50', 'text-gray-600');
        singleDateBtn.classList.remove('border-brand-500', 'bg-brand-50', 'text-brand-700');
        singleDateBtn.classList.add('border-gray-200', 'bg-gray-50', 'text-gray-600');
        rangeDateInput.classList.remove('hidden');
        singleDateInput.classList.add('hidden');
    });

    // Form submit - Get preview
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get dates
        if (isRangeMode) {
            currentDates.startDate = reportStartDate.value;
            currentDates.endDate = reportEndDate.value;

            if (!currentDates.startDate || !currentDates.endDate) {
                showToast('Por favor selecciona ambas fechas', 'error');
                return;
            }

            if (new Date(currentDates.startDate) > new Date(currentDates.endDate)) {
                showToast('La fecha de inicio debe ser anterior a la fecha fin', 'error');
                return;
            }
        } else {
            currentDates.startDate = reportDate.value;
            currentDates.endDate = null;

            if (!currentDates.startDate) {
                showToast('Por favor selecciona una fecha', 'error');
                return;
            }
        }

        // Show loading
        kpiPreview.classList.add('hidden');
        reportNoData.classList.add('hidden');
        reportLoading.classList.remove('hidden');

        try {
            const queryParams = new URLSearchParams({ startDate: currentDates.startDate });
            if (currentDates.endDate) {
                queryParams.append('endDate', currentDates.endDate);
            }

            const response = await fetch(`/reports/preview?${queryParams.toString()}`);
            const data = await response.json();

            reportLoading.classList.add('hidden');

            if (data.success && data.data.totalTransactions > 0) {
                // Update KPI values
                document.getElementById('kpiTotalSales').textContent =
                    'Bs. ' + data.data.totalSales.toLocaleString('es-CL', { minimumFractionDigits: 0 });
                document.getElementById('kpiTransactions').textContent =
                    data.data.totalTransactions.toLocaleString('es-CL');
                document.getElementById('kpiAvgTicket').textContent =
                    'Bs. ' + data.data.averageTicket.toLocaleString('es-CL', { minimumFractionDigits: 0 });
                document.getElementById('kpiProducts').textContent =
                    data.data.totalProductsSold.toLocaleString('es-CL');

                kpiPreview.classList.remove('hidden');
            } else {
                reportNoData.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error fetching preview:', error);
            reportLoading.classList.add('hidden');
            showToast('Error al cargar vista previa', 'error');
        }
    });

    // Download PDF
    downloadPdfBtn.addEventListener('click', () => {
        if (!currentDates.startDate) {
            showToast('Primero genera la vista previa', 'error');
            return;
        }

        const queryParams = new URLSearchParams({ startDate: currentDates.startDate });
        if (currentDates.endDate) {
            queryParams.append('endDate', currentDates.endDate);
        }

        // Trigger download
        window.location.href = `/reports/pdf?${queryParams.toString()}`;
        showToast('Descargando PDF...', 'success');
    });

    // Download CSV
    downloadCsvBtn.addEventListener('click', () => {
        if (!currentDates.startDate) {
            showToast('Primero genera la vista previa', 'error');
            return;
        }

        const queryParams = new URLSearchParams({ startDate: currentDates.startDate });
        if (currentDates.endDate) {
            queryParams.append('endDate', currentDates.endDate);
        }

        // Trigger download
        window.location.href = `/reports/csv?${queryParams.toString()}`;
        showToast('Descargando CSV...', 'success');
    });

    // Toast helper (uses global showToast if available, or creates simple alert)
    function showToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            // Fallback: create a simple toast
            const toast = document.createElement('div');
            toast.className = `fixed bottom-20 md:bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all ${type === 'error' ? 'bg-red-500' : 'bg-brand-600'
                }`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }
});
