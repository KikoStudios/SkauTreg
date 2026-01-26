import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const keyPath = path.resolve('jwt.key');

try {
    console.log(`Reading key from: ${keyPath}`);
    const original = fs.readFileSync(keyPath, 'utf8');

    console.log(`Original length: ${original.length}`);
    console.log(`Original includes literal \\n: ${original.includes('\\n')}`);
    console.log(`Original includes actual newline: ${original.includes('\n')}`);

    function normalizeJwtKey(key) {
        if (!key) return key;

        let normalized = String(key);

        // Remove surrounding quotes if present
        normalized = normalized.trim();
        if ((normalized.startsWith('"') && normalized.endsWith('"')) || (normalized.startsWith("'") && normalized.endsWith("'"))) {
            normalized = normalized.slice(1, -1);
        }

        // Replace ALL literal backslash-n sequences with actual newlines using regex
        normalized = normalized.replace(/\\n/g, "\n");

        // Further cleanup if needed (e.g. double escapes)
        normalized = normalized.replace(/\\\\n/g, "\n");

        return normalized;
    }

    const normalized = normalizeJwtKey(original);

    console.log(`Normalized length: ${normalized.length}`);
    console.log(`Normalized includes actual newline: ${normalized.includes('\n')}`);

    // Try to parse it
    try {
        const keyObject = crypto.createPrivateKey(normalized);
        console.log("SUCCESS: Key is valid PKCS#8 or compatible format.");
        console.log("Key type:", keyObject.type);
        console.log("Key algorithm:", keyObject.asymmetricKeyType);
    } catch (err) {
        console.error("ERROR: Failed to parse key with crypto.createPrivateKey");
        console.error(err.message);

        // Try fallback normalization
        const fallback = original.split("\\n").join("\n");
        console.log("Trying fallback normalization...");
        try {
            const keyObjectFallback = crypto.createPrivateKey(fallback);
            console.log("SUCCESS: Key is valid with fallback normalization.");
        } catch (err2) {
            console.error("ERROR: Fallback normalization also failed.");
            console.error(err2.message);
        }
    }

} catch (err) {
    console.error("Failed to read file:", err.message);
}
