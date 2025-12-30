/**
 * Auth Types & Interfaces
 */

export interface User {
    id: string;
    email: string;
    username?: string;
    displayName?: string;
    role: UserRole;
    avatarUrl?: string;
    provider: AuthProvider;
    isActive: boolean;
    lastLoginAt?: number;
    createdAt: number;
}

export enum UserRole {
    USER = 'user',
    ADMIN = 'admin',
}

export enum AuthProvider {
    LOCAL = 'local',
    OIDC = 'oidc',
}

export interface LoginRequest {
    email: string;
    password: string;
    /** Optional: future inline MFA code support */
    mfaCode?: string;
    /** Optional: device fingerprint for device tracking */
    deviceFingerprint?: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    username?: string;
    displayName?: string;
    /** Optional: device fingerprint for device tracking */
    deviceFingerprint?: string;
}

export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
}

export interface MfaChallengeResponse {
    mfaChallengeToken: string;
    mfaRequired?: boolean;
    mfaSetupRequired?: boolean;
}

export interface MfaSetupRequest {
    mfaChallengeToken: string;
}

export interface MfaSetupResponse {
    otpauthUrl: string;
    qrCodeDataUrl: string;
    secret: string;
}

export interface MfaCompleteRequest {
    mfaChallengeToken: string;
    code: string;
    /** Optional: device fingerprint for device tracking */
    deviceFingerprint?: string;
}

export type AuthFlowResult =
    | { type: 'authenticated'; user: User }
    | { type: 'mfa'; challenge: MfaChallengeResponse };

export interface OidcConfig {
    enabled: boolean;
    name: string;
    loginUrl?: string;
}

export interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    oidcConfig: OidcConfig | null;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface SetupStatus {
    required: boolean;
}
