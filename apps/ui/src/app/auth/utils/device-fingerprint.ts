/**
 * Generate a simple device fingerprint based on browser properties
 * Note: This is a basic implementation. For production use, consider using
 * a library like FingerprintJS for more accurate fingerprinting.
 */

// Cache the fingerprint to ensure consistency across the session
let cachedFingerprint: string | null = null;

export function generateDeviceFingerprint(): string {
    // Return cached fingerprint if available
    if (cachedFingerprint) {
        return cachedFingerprint;
    }

    const components: string[] = [];

    // User Agent
    components.push(navigator.userAgent);

    // Screen resolution
    components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

    // Timezone offset
    components.push(new Date().getTimezoneOffset().toString());

    // Language
    components.push(navigator.language);

    // Platform
    components.push(navigator.platform);

    // Hardware concurrency (number of CPU cores)
    if (navigator.hardwareConcurrency) {
        components.push(navigator.hardwareConcurrency.toString());
    }

    // Device memory (in GB)
    if ('deviceMemory' in navigator) {
        components.push((navigator as any).deviceMemory.toString());
    }

    // Canvas fingerprint (basic)
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('ScrapeDojo', 2, 15);
            components.push(canvas.toDataURL());
        }
    } catch (e) {
        // Canvas fingerprinting might fail in some browsers
        components.push('canvas-error');
    }

    // Combine all components and hash
    const combined = components.join('|');
    const fingerprint = simpleHash(combined);
    
    // Cache the fingerprint for this session
    cachedFingerprint = fingerprint;
    
    return fingerprint;
}

/**
 * Simple hash function (djb2)
 */
function simpleHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
}

/**
 * Clear the cached device fingerprint
 * Call this on logout or when you want to regenerate the fingerprint
 */
export function clearDeviceFingerprintCache(): void {
    cachedFingerprint = null;
}
