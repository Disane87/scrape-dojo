/**
 * Icon URL utilities supporting multiple icon providers with dark/light variants
 * 
 * Format: provider:iconname[:variant]
 * - selfhst:amazon → selfh.st amazon icon (dark first, fallback light)
 * - selfhst:amazon:dark → selfh.st amazon dark variant only
 * - selfhst:amazon:light → selfh.st amazon light variant only
 * - dbi:amazon → dashboardicons amazon icon (dark first, fallback light)
 * - dbi:amazon:dark → dashboardicons amazon dark variant only
 * - dbi:amazon:light → dashboardicons amazon light variant only
 * - lucide:globe → Lucide icon "globe"
 * - amazon → legacy format, treated as selfhst:amazon
 * - https://... → direct URL
 */

export type IconProvider = 'selfhst' | 'dbi' | 'lucide';
export type IconVariant = 'dark' | 'light';

export interface ParsedIcon {
    provider: IconProvider;
    name: string;
    variant?: IconVariant;
    isUrl: boolean;
    isLucide: boolean;
    rawValue: string;
}

const CDN_BASES = {
    selfhst: 'https://cdn.jsdelivr.net/gh/selfhst/icons@main/webp',
    dbi: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp'
} as const;

/**
 * Checks if the icon value is a full URL
 */
export function isFullUrl(icon: string): boolean {
    return icon.startsWith('http://') || icon.startsWith('https://');
}

/**
 * Checks if the icon is a Lucide icon
 */
export function isLucideIcon(icon: string): boolean {
    return icon.startsWith('lucide:');
}

/**
 * Parses an icon string into its components
 */
export function parseIcon(icon: string): ParsedIcon {
    if (isFullUrl(icon)) {
        return {
            provider: 'selfhst',
            name: icon,
            isUrl: true,
            isLucide: false,
            rawValue: icon
        };
    }

    const parts = icon.split(':');

    // Check if first part is a known provider
    if (parts[0] === 'lucide') {
        return {
            provider: 'lucide',
            name: parts[1] || '',
            isUrl: false,
            isLucide: true,
            rawValue: icon
        };
    }

    if (parts[0] === 'selfhst' || parts[0] === 'dbi') {
        return {
            provider: parts[0] as IconProvider,
            name: parts[1] || '',
            variant: (parts[2] as IconVariant) || undefined,
            isUrl: false,
            isLucide: false,
            rawValue: icon
        };
    }

    // Legacy format: just icon name, default to selfhst
    return {
        provider: 'selfhst',
        name: icon,
        isUrl: false,
        isLucide: false,
        rawValue: icon
    };
}

/**
 * Gets the Lucide icon name (converts kebab-case to PascalCase)
 */
export function getLucideIconName(icon: string): string {
    const parsed = parseIcon(icon);
    if (!parsed.isLucide) return '';

    // Convert kebab-case to PascalCase for Lucide icons
    // e.g., "arrow-right" -> "ArrowRight"
    return parsed.name
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('');
}

/**
 * Generates URL for selfh.st icons
 * selfh.st: dark = {name}-dark.webp, light = {name}.webp
 */
function getSelfhstUrl(name: string, variant: IconVariant): string {
    const base = CDN_BASES.selfhst;
    return variant === 'dark'
        ? `${base}/${name}-dark.webp`
        : `${base}/${name}.webp`;
}

/**
 * Generates URL for dashboardicons
 * dbi: dark = {name}.webp, light = {name}-light.webp
 */
function getDbiUrl(name: string, variant: IconVariant): string {
    const base = CDN_BASES.dbi;
    return variant === 'dark'
        ? `${base}/${name}.webp`
        : `${base}/${name}-light.webp`;
}

/**
 * Gets the icon URL for a specific variant
 */
export function getIconUrl(icon: string, variant: IconVariant = 'dark'): string {
    const parsed = parseIcon(icon);

    if (parsed.isUrl) {
        return parsed.rawValue;
    }

    // Use specified variant or the requested one
    const targetVariant = parsed.variant || variant;

    switch (parsed.provider) {
        case 'selfhst':
            return getSelfhstUrl(parsed.name, targetVariant);
        case 'dbi':
            return getDbiUrl(parsed.name, targetVariant);
        default:
            return getSelfhstUrl(parsed.name, targetVariant);
    }
}

/**
 * Gets the dark variant URL (primary)
 */
export function getIconDarkUrl(icon: string): string {
    return getIconUrl(icon, 'dark');
}

/**
 * Gets the light variant URL (fallback)
 */
export function getIconLightUrl(icon: string): string {
    return getIconUrl(icon, 'light');
}

/**
 * Gets the fallback URL for an icon
 * Returns null if no fallback is available (explicit variant or URL)
 */
export function getIconFallbackUrl(icon: string): string | null {
    const parsed = parseIcon(icon);

    // URLs and explicit variants have no fallback
    if (parsed.isUrl || parsed.variant) {
        return null;
    }

    // Fallback is light variant
    return getIconUrl(icon, 'light');
}

/**
 * Utility function to convert PascalCase icon names to Iconify format
 * @param name - Icon name in PascalCase (e.g., "CheckCircle")
 * @returns Iconify icon identifier (e.g., "lucide:check-circle")
 */
export function toIconify(name: string): string {
    return `lucide:${name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/(\d+)/g, '-$1')
        .toLowerCase()
        .replace(/--/g, '-')
        .replace(/^-|-$/g, '')}`;
}
