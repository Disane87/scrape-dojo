/**
 * Generate a stable device identifier for the current browser.
 *
 * Important: A "trusted device" identifier must be stable across sessions.
 * Deriving it from browser properties (canvas, screen, etc.) is too volatile
 * and causes unnecessary MFA prompts.
 */

const STORAGE_KEY = 'scrape_dojo_device_id';

let cachedFingerprint: string | null = null;

export function generateDeviceFingerprint(): string {
    if (cachedFingerprint) {
        return cachedFingerprint;
    }

    try {
        const existing = localStorage.getItem(STORAGE_KEY);
        if (existing && existing.trim().length > 0) {
            cachedFingerprint = existing;
            return existing;
        }

        const next = generateId();
        localStorage.setItem(STORAGE_KEY, next);
        cachedFingerprint = next;
        return next;
    } catch {
        // If storage is unavailable (privacy mode), fall back to an in-memory id.
        cachedFingerprint = generateId();
        return cachedFingerprint;
    }
}

export function clearDeviceFingerprintCache(): void {
    cachedFingerprint = null;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}

function generateId(): string {
    const cryptoAny = globalThis.crypto as Crypto | undefined;
    if (cryptoAny?.randomUUID) {
        return cryptoAny.randomUUID();
    }

    const bytes = new Uint8Array(16);
    cryptoAny?.getRandomValues?.(bytes);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = bytes[i] ?? Math.floor(Math.random() * 256);
    }

    // hex string (not a full UUID format, but stable enough)
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
