// User Management JavaScript
document.addEventListener('DOMContentLoaded', () => {
    console.log('User management script loaded');
});

// Delete user function
function handleDeleteUser(userId, userName) {
    showConfirm(
        'Eliminar Usuario',
        `¿Estás seguro de que deseas eliminar al usuario "${userName}"?\nEsta acción no se puede deshacer.`,
        async () => {
            try {
                const response = await fetch(`/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (data.success) {
                    showToast(data.message || 'Usuario eliminado correctamente', 'success');
                    // Reload after a short delay to let the toast be seen
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showToast(data.message || 'Error al eliminar el usuario', 'error');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                showToast('Error al eliminar el usuario. Por favor, intenta de nuevo.', 'error');
            }
        }
    );
}

// Edit user function - opens modal
function handleEditUser(userId) {
    // Get user data
    fetch(`/users`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const user = data.users.find(u => u.id === userId);
                if (user) {
                    openEditModal(user);
                }
            }
        })
        .catch(error => {
            console.error('Error fetching user:', error);
            showToast('Error al cargar los datos del usuario', 'error');
        });
}

// Open edit modal
function openEditModal(user) {
    const modal = document.getElementById('editUserModal');
    if (!modal) {
        console.error('Edit modal not found');
        return;
    }

    // Populate form fields
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserRole').value = user.role;
    document.getElementById('editUserPassword').value = '';

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Save edited user
async function saveEditedUser(event) {
    event.preventDefault();

    const userId = document.getElementById('editUserId').value;
    const name = document.getElementById('editUserName').value;
    const email = document.getElementById('editUserEmail').value;
    const role = document.getElementById('editUserRole').value;
    const password = document.getElementById('editUserPassword').value;

    const updateData = { name, email, role };
    if (password) {
        updateData.password = password;
    }

    try {
        const response = await fetch(`/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message || 'Usuario actualizado correctamente', 'success');
            closeEditModal();
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast(data.message || 'Error al actualizar el usuario', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showToast('Error al actualizar el usuario. Por favor, intenta de nuevo.', 'error');
    }
}

// Make functions globally accessible
window.handleDeleteUser = handleDeleteUser;
window.handleEditUser = handleEditUser;
window.closeEditModal = closeEditModal;
window.saveEditedUser = saveEditedUser;
