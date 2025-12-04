async function handleDelete(event) {
    event.preventDefault();

    if (!confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
        return;
    }

    const form = event.target;
    const productId = form.dataset.productId;
    const button = form.querySelector('button');
    const originalContent = button.innerHTML;

    try {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const response = await fetch(`/products/${productId}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            // Show success message and reload
            // Ideally we would use a toast, but reload is safer to update the list
            window.location.reload();
        } else {
            alert(data.message || 'Error al eliminar el producto');
            button.disabled = false;
            button.innerHTML = originalContent;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Ocurrió un error al intentar eliminar el producto');
        button.disabled = false;
        button.innerHTML = originalContent;
    }
}
