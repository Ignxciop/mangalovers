// Solo se permiten estos proveedores de correo
const ALLOWED_DOMAINS = [
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "yahoo.com",
    "yahoo.com.ar",
    "yahoo.com.mx",
    "yahoo.com.co",
    "yahoo.es",
    "yahoo.com.br",
];

export const extractDomain = (email) => {
    const parts = email.toLowerCase().trim().split("@");
    return parts.length === 2 ? parts[1] : null;
};

/**
 * Valida que el email sea de un proveedor permitido
 * @param {string} email - Email a validar
 * @returns {object} { valid: boolean, reason?: string }
 */
export const validateEmailDomain = (email) => {
    if (!email || typeof email !== "string") {
        return { valid: false, reason: "Email inválido" };
    }

    const domain = extractDomain(email);

    if (!domain) {
        return { valid: false, reason: "Formato de email inválido" };
    }

    if (!ALLOWED_DOMAINS.includes(domain)) {
        return {
            valid: false,
            reason: "Solo se permiten correos de Gmail, Outlook, Hotmail o Yahoo",
        };
    }

    return { valid: true };
};

export const validateEmailFormat = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validateEmail = (email) => {
    if (!validateEmailFormat(email)) {
        return { valid: false, reason: "Formato de email inválido" };
    }

    return validateEmailDomain(email);
};
