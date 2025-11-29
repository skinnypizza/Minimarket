/**
 * Helper para obtener el token CSRF del DOM
 * @returns {string} Token CSRF
 */
function getCsrfToken() {
    // Buscar en meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }

    // Buscar en input hidden
    const input = document.querySelector('input[name="_csrf"]');
    if (input) {
        return input.value;
    }

    console.error('[CSRF] No se encontró token CSRF en el DOM');
    return '';
}

/**
 * Agregar token CSRF a headers de fetch
 * @param {object} options - Opciones de fetch
 * @returns {object} Opciones con CSRF token
 */
function addCsrfToken(options = {}) {
    const token = getCsrfToken();

    return {
        ...options,
        headers: {
            ...options.headers,
            'X-CSRF-Token': token
        }
    };
}
