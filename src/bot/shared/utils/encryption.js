import crypto from "crypto";

/**
 * Хеширует данные с помощью секретного ключа и вектора инициализации, указанных в .env
 * @param {string} data
 * @returns {string} хеш переданной строки
 */
export function encryptData(data) {
    const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        process.env.HASH_KEY,
        process.env.HASH_IV
    );
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    return encrypted;
}

/**
 * Расшифровывает хеш с данными с помощью секретного ключа в .env
 * @param {string} data
 * @returns {string} исходная (расшифрованная)
 */
export function decryptData(hash) {
    const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        process.env.HASH_KEY,
        process.env.HASH_IV
    );
    let decrypted = decipher.update(hash, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}
