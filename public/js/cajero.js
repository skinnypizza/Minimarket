document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    window.cart = []; // Make cart globally accessible for reservation import
    const user = JSON.parse(document.body.dataset.user || '{}');

    // --- DOM ELEMENTS ---
    const searchInput = document.getElementById('productSearch');
    const searchResultsContainer = document.getElementById('searchResults');
    const cartItemsContainer = document.getElementById('cartItems');
    const cartItemCountEl = document.getElementById('cartItemCount');
    const totalAmountEl = document.getElementById('totalAmount');

    // Modal Elements
    const paymentModal = document.getElementById('paymentModal');
    const modalTotalEl = document.getElementById('modalTotal');
    const cashReceivedInput = document.getElementById('cashReceived');
    const changeAmountEl = document.getElementById('changeAmount');

    // --- API FUNCTIONS ---
    const searchProducts = async (query) => {
        if (query.length < 2) {
            searchResultsContainer.innerHTML = `
                <div class="col-span-full text-center py-16 text-gray-400">
                    <i class="fas fa-barcode text-5xl mb-3 opacity-20"></i>
                    <p class="text-base">Escanea un producto o busca por nombre</p>
                </div>`;
            return;
        }
        try {
            const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) {
                console.error('API error:', res.status, res.statusText);
                throw new Error('Error en la respuesta del servidor');
            }
            const products = await res.json();
            console.log('Products found:', products);
            renderSearchResults(products);
        } catch (error) {
            console.error('Error buscando productos:', error);
            searchResultsContainer.innerHTML = '<p class="col-span-full text-center text-red-500">Error al buscar productos.</p>';
        }
    };

    window.processSale = () => {
        const total = calculateTotal();
        if (window.cart.length === 0) {
            alert('El carrito está vacío.');
            return;
        }
        modalTotalEl.textContent = total.toFixed(2);
        paymentModal.classList.remove('hidden');
        paymentModal.classList.add('flex');
        cashReceivedInput.value = '';
        changeAmountEl.textContent = '0.00';
        cashReceivedInput.focus();
    };

    window.confirmSale = async () => {
        const cashReceived = parseFloat(cashReceivedInput.value) || 0;
        const totalAmount = calculateTotal();

        if (cashReceived < totalAmount) {
            alert('El efectivo recibido no puede ser menor que el total a pagar.');
            return;
        }

        try {
            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id || 1,
                    cart: window.cart,
                    totalAmount: totalAmount,
                    cashReceived: cashReceived,
                    changeGiven: cashReceived - totalAmount
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al registrar la venta.');
            }

            alert('¡Venta registrada con éxito!');
            window.closeModal();
            window.clearCart();

        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    window.closeModal = () => {
        paymentModal.classList.add('hidden');
        paymentModal.classList.remove('flex');
    };

    window.clearCart = () => {
        window.cart = [];
        renderCart();
    };

    // --- RENDER/UI FUNCTIONS ---
    const renderSearchResults = (products) => {
        if (products.length === 0) {
            searchResultsContainer.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">No se encontraron productos.</p>';
            return;
        }
        searchResultsContainer.innerHTML = products.map(p => `
            <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer product-result-item group" data-product='${JSON.stringify(p).replace(/'/g, "&#39;")}'>
                <div class="h-24 bg-gray-100 rounded-lg mb-2 overflow-hidden relative">
                    <img src="${p.image || '/img/logo.png'}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform">
                    <div class="absolute top-1 right-1 bg-white/90 backdrop-blur px-2 py-0.5 rounded-md text-xs font-bold shadow-sm">
                        ${p.totalStock || 0}
                    </div>
                </div>
                <h4 class="font-bold text-gray-800 leading-tight text-sm mb-1 truncate">${p.name}</h4>
                <p class="text-brand-600 font-bold">Bs. ${p.price.toFixed(2)}</p>
            </div>
        `).join('');
    };

    window.renderCart = () => {
        const totalItems = window.cart.reduce((acc, item) => acc + item.quantity, 0);
        cartItemCountEl.textContent = totalItems;

        if (window.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                    <i class="fas fa-shopping-basket text-6xl mb-4"></i>
                    <p>Carrito Vacío</p>
                </div>`;
        } else {
            cartItemsContainer.innerHTML = window.cart.map((p, index) => `
                <div class="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div class="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 shrink-0">
                        <img src="${p.image || '/img/logo.png'}" class="w-10 h-10 object-contain">
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-gray-800 truncate text-sm">${p.name}</h4>
                        <p class="text-brand-600 font-bold text-sm">Bs. ${(p.price * p.quantity).toFixed(2)}</p>
                    </div>
                    <div class="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 p-1">
                        <button onclick="updateQuantity(${index}, ${p.quantity - 1})" class="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded transition-colors">
                            <i class="fas fa-minus text-xs"></i>
                        </button>
                        <span class="font-bold text-sm w-8 text-center">${p.quantity}</span>
                        <button onclick="updateQuantity(${index}, ${p.quantity + 1})" class="w-6 h-6 flex items-center justify-center text-brand-600 hover:bg-brand-50 rounded transition-colors">
                            <i class="fas fa-plus text-xs"></i>
                        </button>
                    </div>
                    <button onclick="removeFromCart(${index})" class="text-red-400 hover:text-red-600 p-2 transition-colors">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `).join('');
        }
        updateTotals();
    };

    const updateTotals = () => {
        const total = calculateTotal();
        totalAmountEl.textContent = total.toFixed(2);
    };

    const updateChange = () => {
        const total = calculateTotal();
        const cash = parseFloat(cashReceivedInput.value) || 0;
        const change = cash - total;
        changeAmountEl.textContent = (change > 0 ? change.toFixed(2) : '0.00');
    };

    // --- CART LOGIC ---
    const addToCart = (product) => {
        const existingProduct = window.cart.find(item => item.id === product.id);
        if (existingProduct) {
            const availableStock = product.totalStock || product.totalStock === 0 ? product.totalStock : 1000;
            if (existingProduct.quantity < availableStock) {
                existingProduct.quantity++;
            } else {
                alert('Stock insuficiente');
                return;
            }
        } else {
            window.cart.push({ ...product, quantity: 1 });
        }
        render

        Cart();
    };

    window.updateQuantity = (index, quantity) => {
        const product = window.cart[index];
        const availableStock = product.totalStock || product.totalStock === 0 ? product.totalStock : 1000;

        if (quantity > availableStock) {
            alert(`Stock máximo para ${product.name} es ${availableStock}.`);
            return;
        }
        if (quantity < 1) {
            removeFromCart(index);
            return;
        }
        product.quantity = quantity;
        renderCart();
    };

    window.removeFromCart = (index) => {
        window.cart.splice(index, 1);
        renderCart();
    };

    const calculateTotal = () => {
        return window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    // --- EVENT LISTENERS ---
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchProducts(e.target.value);
        }, 300);
    });

    // Handle Enter key for barcode scanners
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(debounceTimer);
            searchProducts(e.target.value);
        }
    });

    searchResultsContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.product-result-item');
        if (item) {
            try {
                const product = JSON.parse(item.dataset.product.replace(/&#39;/g, "'"));
                console.log('Adding product:', product);
                addToCart(product);
                searchInput.value = '';
                searchInput.focus();
                // Clear search results after adding
                searchResultsContainer.innerHTML = `
                    <div class="col-span-full text-center py-16 text-gray-400">
                        <i class="fas fa-barcode text-5xl mb-3 opacity-20"></i>
                        <p class="text-base">Escanea un producto o busca por nombre</p>
                    </div>`;
            } catch (err) {
                console.error('Error parsing product:', err);
            }
        }
    });

    cashReceivedInput.addEventListener('input', updateChange);
    cashReceivedInput.addEventListener('change', updateChange);

    // --- INITIALIZATION ---
    renderCart();
    searchInput.focus();
});
