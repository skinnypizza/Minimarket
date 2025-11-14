document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let cart = []; // Array de objetos de producto
    const user = JSON.parse(document.body.dataset.user || '{}');

    // --- DOM ELEMENTS ---
    const searchInput = document.getElementById('product-search-input');
    const searchResultsContainer = document.getElementById('product-search-results');
    const cartBody = document.getElementById('cart-items-body');
    const emptyCartRow = document.getElementById('empty-cart-row');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const cashReceivedInput = document.getElementById('cash-received');
    const changeDueEl = document.getElementById('change-due');
    const confirmSaleBtn = document.getElementById('confirm-sale-btn');
    const cancelSaleBtn = document.getElementById('cancel-sale-btn');
    
    // Modal elements
    const modal = document.getElementById('sale-success-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const newSaleBtn = document.getElementById('new-sale-btn');
    const modalTotalEl = document.getElementById('modal-total');
    const modalChangeEl = document.getElementById('modal-change');


    // --- API FUNCTIONS ---
    const searchProducts = async (query) => {
        if (query.length < 1) {
            searchResultsContainer.innerHTML = '';
            return;
        }
        try {
            const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error('Error en la respuesta del servidor');
            const products = await res.json();
            renderSearchResults(products);
        } catch (error) {
            console.error('Error buscando productos:', error);
            searchResultsContainer.innerHTML = '<p class="error">No se pudieron buscar productos.</p>';
        }
    };

    const submitSale = async () => {
        const cashReceived = parseFloat(cashReceivedInput.value) || 0;
        const totalAmount = calculateTotal();

        if (cashReceived < totalAmount) {
            alert('El efectivo recibido no puede ser menor que el total a pagar.');
            return;
        }

        confirmSaleBtn.disabled = true;
        confirmSaleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

        try {
            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    cart: cart,
                    totalAmount: totalAmount,
                    cashReceived: cashReceived,
                    changeGiven: cashReceived - totalAmount
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al registrar la venta.');
            }
            
            const result = await res.json();
            showSuccessModal(totalAmount, cashReceived - totalAmount);

        } catch (error) {
            alert(`Error: ${error.message}`);
            confirmSaleBtn.disabled = false;
            confirmSaleBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Venta';
        }
    };

    // --- RENDER/UI FUNCTIONS ---
    const renderSearchResults = (products) => {
        if (products.length === 0) {
            searchResultsContainer.innerHTML = '<p class="no-results">No se encontraron productos.</p>';
            return;
        }
        searchResultsContainer.innerHTML = products.map(p => `
            <div class="product-result-item" data-product-id="${p.id}">
                <img src="${p.image || '/img/logo.png'}" alt="${p.name}">
                <div class="product-result-info">
                    <h4>${p.name}</h4>
                    <p>Stock: ${p.totalStock}</p>
                </div>
                <span class="product-result-price">Bs. ${p.price.toFixed(2)}</span>
            </div>
        `).join('');
    };

    const renderCart = () => {
        if (cart.length === 0) {
            emptyCartRow.style.display = 'table-row';
            cartBody.innerHTML = '';
            cartBody.appendChild(emptyCartRow);
        } else {
            emptyCartRow.style.display = 'none';
            cartBody.innerHTML = cart.map((p, index) => `
                <tr data-product-id="${p.id}">
                    <td>${p.name}</td>
                    <td>Bs. ${p.price.toFixed(2)}</td>
                    <td class="cart-item-quantity">
                        <input type="number" value="${p.quantity}" min="1" max="${p.totalStock}" data-index="${index}" class="quantity-input">
                    </td>
                    <td>Bs. ${(p.price * p.quantity).toFixed(2)}</td>
                    <td>
                        <button class="cart-item-remove" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
                    </td>
                </tr>
            `).join('');
        }
        updateTotals();
    };

    const updateTotals = () => {
        const subtotal = calculateTotal();
        subtotalEl.textContent = `Bs. ${subtotal.toFixed(2)}`;
        totalEl.textContent = `Bs. ${subtotal.toFixed(2)}`;
        updateChange();
        updateConfirmButtonState();
    };
    
    const updateChange = () => {
        const total = calculateTotal();
        const cash = parseFloat(cashReceivedInput.value) || 0;
        const change = cash - total;
        console.log('--- Update Change ---');
        console.log('cashReceivedInput.value:', cashReceivedInput.value);
        console.log('Parsed Cash:', cash);
        console.log('Total:', total);
        console.log('Change:', change);
        changeDueEl.textContent = `Bs. ${change > 0 ? change.toFixed(2) : '0.00'}`;
        changeDueEl.style.color = change >= 0 ? '#28a745' : '#dc3545';
        updateConfirmButtonState(); // Ensure this is called after change is updated
    };

    const updateConfirmButtonState = () => {
        const total = calculateTotal();
        const cash = parseFloat(cashReceivedInput.value) || 0;
        const isDisabled = cart.length === 0 || cash < total;
        confirmSaleBtn.disabled = isDisabled;
    };

    const showSuccessModal = (total, change) => {
        modalTotalEl.textContent = `Bs. ${total.toFixed(2)}`;
        modalChangeEl.textContent = `Bs. ${change.toFixed(2)}`;
        modal.style.display = 'flex';
    };

    const resetSale = () => {
        cart = [];
        cashReceivedInput.value = '';
        renderCart();
        confirmSaleBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Venta';
        modal.style.display = 'none';
    };

    // --- CART LOGIC ---
    const addToCart = (product) => {
        const existingProduct = cart.find(item => item.id === product.id);
        if (existingProduct) {
            if (existingProduct.quantity < existingProduct.totalStock) {
                existingProduct.quantity++;
            }
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        renderCart();
    };

    const updateQuantity = (index, quantity) => {
        const product = cart[index];
        if (quantity > product.totalStock) {
            alert(`Stock máximo para ${product.name} es ${product.totalStock}.`);
            quantity = product.totalStock;
        }
        if (quantity < 1) {
            quantity = 1;
        }
        product.quantity = quantity;
        renderCart();
    };

    const removeFromCart = (index) => {
        cart.splice(index, 1);
        renderCart();
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    // --- EVENT LISTENERS ---
    let debounceTimer;
    searchInput.addEventListener('keyup', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            searchProducts(e.target.value);
        }, 300); // Debounce de 300ms
    });

    searchResultsContainer.addEventListener('click', async (e) => {
        const item = e.target.closest('.product-result-item');
        if (item) {
            const productId = item.dataset.productId;
            // Necesitamos obtener el producto completo de nuevo para asegurar el stock
            const res = await fetch(`/api/products/search?q=${productId}`);
            const products = await res.json();
            if (products.length > 0) {
                addToCart(products[0]);
                searchInput.value = '';
                searchResultsContainer.innerHTML = '';
            }
        }
    });

    cartBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const index = parseInt(e.target.dataset.index, 10);
            const quantity = parseInt(e.target.value, 10);
            updateQuantity(index, quantity);
        }
    });

    cartBody.addEventListener('click', (e) => {
        const button = e.target.closest('.cart-item-remove');
        if (button) {
            const index = parseInt(button.dataset.index, 10);
            removeFromCart(index);
        }
    });

    cashReceivedInput.addEventListener('keyup', updateChange);
    cashReceivedInput.addEventListener('change', updateChange);

    confirmSaleBtn.addEventListener('click', submitSale);
    cancelSaleBtn.addEventListener('click', resetSale);
    
    // Modal listeners
    closeModalBtn.addEventListener('click', resetSale);
    newSaleBtn.addEventListener('click', resetSale);
    window.addEventListener('click', (e) => {
        if (e.target === modal) resetSale();
    });

    // --- INITIALIZATION ---
    renderCart();
});
