const ALLOWED_DOMAINS = [
    "gmail.com",
    "googlemail.com",
    "hotmail.com",
    "outlook.com",
    "live.com",
    "msn.com",
    "yahoo.com",
    "yahoo.es",
    "yahoo.com.mx",
    "yahoo.com.ar",
    "icloud.com",
    "me.com",
    "mac.com",
    "hotmail.es",
    "outlook.es",
    "mail.com",
];

const TEMPORARY_DOMAINS = [
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "tempmail.com",
    "throwaway.email",
    "temp-mail.org",
    "yopmail.com",
    "maildrop.cc",
    "trashmail.com",
    "dispostable.com",
    "fakeinbox.com",
    "getnada.com",
    "mintemail.com",
    "mytrashmail.com",
    "sharklasers.com",
    "spam4.me",
    "tempinbox.com",
    "tempr.email",
    "throwam.com",
];

export const extractDomain = (email) => {
    const parts = email.toLowerCase().trim().split("@");
    return parts.length === 2 ? parts[1] : null;
};

/**
 * Valida que el email sea de un proveedor legítimo
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

    if (TEMPORARY_DOMAINS.includes(domain)) {
        return {
            valid: false,
            reason: "No se permiten correos temporales o desechables",
        };
    }

    if (!ALLOWED_DOMAINS.includes(domain)) {
        return {
            valid: false,
            reason: `El dominio ${domain} no está en la lista de proveedores permitidos. Usa Gmail, Hotmail, Yahoo, iCloud u otro proveedor reconocido.`,
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
