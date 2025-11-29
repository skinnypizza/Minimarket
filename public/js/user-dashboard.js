// User Dashboard Logic
let cart = [];
let products = []; // Store products for search if needed client-side, or just rely on DOM

document.addEventListener('DOMContentLoaded', () => {
    initCart();
    loadReservations(); // Pre-load history

    // Search listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterProducts(e.target.value));
    }
});

// --- Cart Logic ---

async function initCart() {
    try {
        const response = await fetch('/cart/my-cart');
        const data = await response.json();
        if (data.success && data.cart && data.cart.items) {
            cart = data.cart.items.map(item => ({
                productId: item.productId,
                name: item.product.name,
                price: item.unitPrice,
                quantity: item.quantity,
                maxStock: item.product.totalStock || 0,
                image: item.product.image || '/img/no-image.png'
            }));
            updateUI();
        }
    } catch (err) {
        console.error('Error loading cart:', err);
    }
}

function addToCart(id, name, price, maxStock) {
    const existing = cart.find(item => item.productId == id);
    if (existing) {
        if (existing.quantity < maxStock) {
            existing.quantity++;
            showToast(`+1 ${name}`, 'success');
        } else {
            showToast('Stock máximo alcanzado', 'warning');
            return;
        }
    } else {
        cart.push({ productId: id, name, price, quantity: 1, maxStock, image: '/img/no-image.png' }); // Image is placeholder here, ideally passed in
        showToast(`${name} agregado`, 'success');
    }
    updateUI();
}

function updateQuantity(id, delta) {
    const item = cart.find(i => i.productId == id);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        removeFromCart(id);
    } else if (newQty <= item.maxStock) {
        item.quantity = newQty;
        updateUI();
    } else {
        showToast('No hay más stock disponible', 'warning');
    }
}

function removeFromCart(id) {
    cart = cart.filter(i => i.productId != id);
    updateUI();
}

function updateUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);

    // Update Badges
    ['desktopCartCount', 'mobileCartCount', 'navCartBadge', 'sidebarCartCount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = totalItems;
            el.classList.toggle('hidden', totalItems === 0);
        }
    });

    // Update Totals
    ['sidebarTotal', 'drawerTotal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = totalPrice;
    });

    // Render Items (Sidebar & Drawer)
    const html = cart.length ? cart.map(item => `
        <div class="flex gap-3 items-center bg-white p-2 rounded-xl border border-gray-50">
            <div class="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                <img src="${item.image}" class="w-full h-full object-cover">
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="font-medium text-gray-800 text-sm truncate">${item.name}</h4>
                <p class="text-brand-600 font-bold text-sm">Bs. ${(item.price * item.quantity).toFixed(2)}</p>
                <div class="flex items-center gap-3 mt-1">
                    <button onclick="updateQuantity('${item.productId}', -1)" class="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200">-</button>
                    <span class="text-sm font-medium w-4 text-center">${item.quantity}</span>
                    <button onclick="updateQuantity('${item.productId}', 1)" class="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200">+</button>
                </div>
            </div>
            <button onclick="removeFromCart('${item.productId}')" class="text-gray-400 hover:text-red-500 p-2">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('') : `
        <div class="text-center py-10 text-gray-400">
            <i class="fas fa-shopping-basket text-4xl mb-3 opacity-50"></i>
            <p>Tu carrito está vacío</p>
        </div>
    `;

    ['sidebarCartItems', 'drawerCartItems'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    });

    // Disable checkout if empty
    ['sidebarCheckoutBtn', 'drawerCheckoutBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = cart.length === 0;
    });
}

// --- Checkout ---

async function saveReservation() {
    if (cart.length === 0) return;

    const btns = ['sidebarCheckoutBtn', 'drawerCheckoutBtn'].map(id => document.getElementById(id)).filter(b => b);
    btns.forEach(b => {
        b.disabled = true;
        b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    });

    try {
        const items = cart.map(item => ({ productId: item.productId, quantity: item.quantity }));
        const response = await fetch('/cart/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
        });
        const data = await response.json();

        if (data.success) {
            showToast('¡Reserva confirmada!', 'success');
            cart = [];
            updateUI();
            toggleCart(false); // Close drawer
            loadReservations(); // Refresh history
        } else {
            showToast(data.message || 'Error al reservar', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error de conexión', 'error');
    } finally {
        btns.forEach(b => {
            b.disabled = false;
            b.innerHTML = 'Confirmar Reserva';
        });
    }
}

// --- UI Interactions ---

function toggleCart(forceState) {
    const drawer = document.getElementById('cartDrawer');
    if (typeof forceState === 'boolean') {
        if (forceState) drawer.classList.remove('translate-x-full');
        else drawer.classList.add('translate-x-full');
    } else {
        drawer.classList.toggle('translate-x-full');
    }
}

function switchTab(tab) {
    // Mobile bottom nav logic
    const historyView = document.getElementById('historyView');
    const navItems = document.querySelectorAll('.bottom-nav-item');

    navItems.forEach(item => item.classList.remove('active', 'text-brand-600'));

    if (tab === 'history') {
        historyView.classList.remove('translate-y-full');
        navItems[1].classList.add('active', 'text-brand-600');
        loadReservations();
    } else {
        historyView.classList.add('translate-y-full');
        navItems[0].classList.add('active', 'text-brand-600');
    }
}

function filterByCategory(category) {
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('bg-brand-600', 'text-white');
        btn.classList.add('bg-white', 'text-gray-600');
        if (btn.id === `cat-${category}`) {
            btn.classList.remove('bg-white', 'text-gray-600');
            btn.classList.add('bg-brand-600', 'text-white');
        }
    });

    // Filter grid
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const cat = card.dataset.productCategory;
        if (category === 'all' || cat === category) {
            card.parentElement.classList.remove('hidden'); // Assuming wrapper if needed, but here card is direct child
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

function filterProducts(query) {
    const term = query.toLowerCase();
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
        const name = card.dataset.productName.toLowerCase();
        if (name.includes(term)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

// --- History ---

async function loadReservations() {
    const container = document.getElementById('mobileReservationsList');
    if (!container) return;

    try {
        const response = await fetch('/cart/history');
        const data = await response.json();

        if (data.success && data.carts.length > 0) {
            container.innerHTML = data.carts.map(cart => `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <span class="text-xs font-bold text-gray-400">#${cart.reservationNumber}</span>
                            <h4 class="font-bold text-gray-800">Reserva</h4>
                        </div>
                        <span class="px-2 py-1 rounded-full text-[10px] font-bold ${getStatusColor(cart.status)}">
                            ${cart.status === 'pending' ? 'Pendiente' : cart.status === 'completed' ? 'Completada' : 'Cancelada'}
                        </span>
                    </div>
                    <div class="space-y-1 mb-3">
                        ${cart.items.slice(0, 2).map(i => `
                            <div class="flex justify-between text-sm">
                                <span class="text-gray-600">${i.quantity}x ${i.product ? i.product.name : 'Item'}</span>
                                <span class="font-medium">Bs. ${i.totalPrice.toFixed(2)}</span>
                            </div>
                        `).join('')}
                        ${cart.items.length > 2 ? `<span class="text-xs text-gray-400">+${cart.items.length - 2} más...</span>` : ''}
                    </div>
                    <div class="flex justify-between items-center pt-2 border-t border-gray-50">
                        <span class="font-bold text-brand-600">Total: Bs. ${cart.totalAmount.toFixed(2)}</span>
                        ${cart.status === 'pending' ? `
                            <button onclick="cancelReservation(${cart.id})" class="text-red-500 text-xs font-medium hover:underline">Cancelar</button>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-64 text-gray-400">
                    <i class="fas fa-history text-4xl mb-2 opacity-30"></i>
                    <p>No hay historial</p>
                </div>
            `;
        }
    } catch (err) {
        console.error(err);
    }
}

function getStatusColor(status) {
    switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-700';
        case 'completed': return 'bg-green-100 text-green-700';
        case 'cancelled': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
    }
}

async function cancelReservation(id) {
    if (!confirm('¿Cancelar esta reserva?')) return;
    try {
        const res = await fetch(`/cart/cancel/${id}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast('Reserva cancelada', 'success');
            loadReservations();
        } else {
            showToast('Error al cancelar', 'error');
        }
    } catch (e) {
        showToast('Error de conexión', 'error');
    }
}

// --- Toast ---

function showToast(msg, type) {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const text = document.getElementById('toastMessage');

    text.textContent = msg;
    icon.innerHTML = type === 'success' ? '<i class="fas fa-check-circle text-green-500"></i>' :
        type === 'error' ? '<i class="fas fa-exclamation-circle text-red-500"></i>' :
            '<i class="fas fa-info-circle text-blue-500"></i>';

    toast.classList.remove('-translate-y-20');
    toast.classList.add('translate-y-4');

    setTimeout(() => {
        toast.classList.remove('translate-y-4');
        toast.classList.add('-translate-y-20');
    }, 3000);
}
