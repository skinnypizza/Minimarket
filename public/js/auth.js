// Utilidades para manejo de autenticación JWT en el frontend

class AuthManager {
    constructor() {
        this.token = this.getToken();
        this.user = this.getUser();
    }

    // Obtener token de localStorage o cookies
    getToken() {
        return localStorage.getItem('token') || this.getCookie('token');
    }

    // Obtener usuario de localStorage
    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // Obtener cookie por nombre
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Guardar token y usuario
    saveAuth(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    // Limpiar autenticación
    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    // Verificar si está autenticado
    isAuthenticated() {
        return !!this.token;
    }

    // Verificar si es admin
    isAdmin() {
        return this.user && this.user.role === 'admin';
    }

    // Obtener headers para peticiones autenticadas
    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    // Hacer petición autenticada
    async authenticatedFetch(url, options = {}) {
        const headers = {
            ...this.getAuthHeaders(),
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        // Si el token expiró, limpiar autenticación
        if (response.status === 401) {
            this.clearAuth();
            window.location.href = '/auth/login';
        }

        return response;
    }

    // Login con AJAX
    async login(email, password) {
        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
            });

            const data = await response.json();
            
            if (data.success) {
                this.saveAuth(data.token, data.user);
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // Registro con AJAX
    async register(name, email, password) {
        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: `name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
            });

            const data = await response.json();
            
            if (data.success) {
                this.saveAuth(data.token, data.user);
                return { success: true, user: data.user };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    // Logout
    async logout() {
        try {
            await fetch('/auth/logout', {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
            window.location.href = '/';
        }
    }
}

// Instancia global
window.authManager = new AuthManager();

// Función helper para verificar autenticación en páginas
window.checkAuth = function() {
    if (!window.authManager.isAuthenticated()) {
        window.location.href = '/auth/login';
        return false;
    }
    return true;
};

// Función helper para verificar admin
window.checkAdmin = function() {
    if (!window.authManager.isAuthenticated() || !window.authManager.isAdmin()) {
        window.location.href = '/dashboard';
        return false;
    }
    return true;
};
