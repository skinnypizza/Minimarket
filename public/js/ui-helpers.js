// UI Helper Functions

/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {string} type - 'success' | 'error' | 'info'
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');

    // Icon and colors based on type
    let icon = 'fa-check-circle';
    let bgClass = 'bg-white';
    let borderClass = 'border-l-4 border-green-500';
    let textClass = 'text-gray-800';
    let iconClass = 'text-green-500';

    if (type === 'error') {
        icon = 'fa-exclamation-circle';
        borderClass = 'border-l-4 border-red-500';
        iconClass = 'text-red-500';
    } else if (type === 'info') {
        icon = 'fa-info-circle';
        borderClass = 'border-l-4 border-blue-500';
        iconClass = 'text-blue-500';
    }

    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-y-4 opacity-0 ${bgClass} ${borderClass} min-w-[300px]`;
    toast.innerHTML = `
        <i class="fas ${icon} ${iconClass} text-xl"></i>
        <p class="font-medium ${textClass}">${message}</p>
    `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
    });

    // Auto remove
    setTimeout(() => {
        toast.classList.add('translate-y-4', 'opacity-0');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}

/**
 * Shows a confirmation modal
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {Function} onConfirm - Callback when confirmed
 * @param {string} confirmText - Text for confirm button (default: 'Eliminar')
 * @param {string} confirmColor - Tailwind color class for confirm button (default: 'bg-red-600')
 */
function showConfirm(title, message, onConfirm, confirmText = 'Eliminar', confirmColor = 'bg-red-600') {
    const modal = document.getElementById('confirmation-modal');
    const content = document.getElementById('confirmation-modal-content');
    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const cancelBtn = document.getElementById('confirm-cancel-btn');
    const okBtn = document.getElementById('confirm-ok-btn');

    if (!modal) return;

    // Set content
    titleEl.textContent = title;
    messageEl.textContent = message;
    okBtn.textContent = confirmText;

    // Update confirm button color if needed (simple reset and add)
    okBtn.className = `flex-1 py-3 text-white rounded-xl font-bold transition-colors shadow-lg ${confirmColor} hover:opacity-90`;

    // Show modal
    modal.classList.remove('hidden');
    // Small delay for transition
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        content.classList.add('scale-100');
    });

    // Handlers
    const close = () => {
        modal.classList.add('opacity-0');
        content.classList.remove('scale-100');
        content.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 200);

        // Cleanup listeners to avoid duplicates
        cancelBtn.removeEventListener('click', close);
        okBtn.removeEventListener('click', handleConfirm);
    };

    const handleConfirm = () => {
        close();
        if (onConfirm) onConfirm();
    };

    cancelBtn.addEventListener('click', close);
    okBtn.addEventListener('click', handleConfirm);
}

// Expose to window
window.showToast = showToast;
window.showConfirm = showConfirm;
