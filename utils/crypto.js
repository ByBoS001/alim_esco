/**
 * utils/crypto.js
 * Cifrado AES-256-CBC determinístico para datos personales sensibles (LOPDP).
 *
 * ¿Por qué determinístico?
 *   La cédula tiene una restricción UNIQUE en la BD. Si cifráramos con IV
 *   aleatorio cada vez, el mismo valor produciría ciphertexts distintos y
 *   la restricción no funcionaría. Derivamos el IV con HMAC(key, plaintext)
 *   para que sea único por valor pero reproducible.
 *
 * ¿Cuándo NO usar esto?
 *   Para contraseñas: usar bcrypt (ya implementado).
 *   Para datos que no necesitan ser únicos en BD: preferir IV aleatorio.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_HEX = process.env.ENCRYPTION_KEY;

if (!KEY_HEX || KEY_HEX.length < 64) {
    console.warn('[crypto.js] ADVERTENCIA: ENCRYPTION_KEY no definida o muy corta. El cifrado de cédula no funcionará correctamente.');
}

// Prepara la clave como Buffer de 32 bytes
const getKey = () => {
    if (!KEY_HEX) throw new Error('ENCRYPTION_KEY no está definida en el .env');
    return Buffer.from(KEY_HEX.slice(0, 64), 'hex'); // 32 bytes = 64 hex chars
};

// Deriva un IV de 16 bytes reproducible a partir del texto usando HMAC-SHA256
const deriveIV = (key, plaintext) => {
    return crypto.createHmac('sha256', key)
        .update(plaintext)
        .digest()
        .slice(0, 16); // AES-CBC requiere IV de 16 bytes
};

/**
 * Cifra un texto con AES-256-CBC.
 * @param {string} plaintext — texto a cifrar (ej: "1234567890")
 * @returns {string} — ciphertext en formato hex
 */
const encrypt = (plaintext) => {
    if (!plaintext) return plaintext;
    const key = getKey();
    const iv = deriveIV(key, plaintext);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);
    return encrypted.toString('hex');
};

/**
 * Descifra un ciphertext previamente cifrado con encrypt().
 * @param {string} ciphertext — texto cifrado en hex
 * @returns {string} — texto original
 */
const decrypt = (ciphertext) => {
    if (!ciphertext) return ciphertext;
    try {
        const key = getKey();
        // Para descifrar necesitamos el IV: lo re-derivamos del ciphertext no,
        // sino del original. Como es determinístico, necesitamos guardarlo.
        // Solución: guardamos iv:ciphertext separados por ':'
        const [ivHex, encHex] = ciphertext.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedBuf = Buffer.from(encHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        const decrypted = Buffer.concat([
            decipher.update(encryptedBuf),
            decipher.final()
        ]);
        return decrypted.toString('utf8');
    } catch {
        // Si el valor no está cifrado (datos legacy), devolverlo tal cual
        return ciphertext;
    }
};

/**
 * Cifra guardando iv:ciphertext para poder descifrar después.
 */
const encryptWithIV = (plaintext) => {
    if (!plaintext) return plaintext;
    const key = getKey();
    const iv = deriveIV(key, plaintext);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
    ]);
    // Formato: ivHex:ciphertextHex
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

module.exports = { encryptWithIV, decrypt };
