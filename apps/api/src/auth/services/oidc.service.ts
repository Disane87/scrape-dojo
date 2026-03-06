import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as openidClient from 'openid-client';

export interface OidcConfig {
  enabled: boolean;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  providerName: string;
}

export interface OidcTokens {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface OidcUserInfo {
  sub: string;
  email: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  iss: string;
}

@Injectable()
export class OidcService implements OnModuleInit {
  private readonly logger = new Logger(OidcService.name);
  private config: openidClient.Configuration | null = null;
  private oidcConfig: OidcConfig;
  private codeVerifiers: Map<string, string> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.oidcConfig = {
      enabled:
        this.configService.get<string>(
          'SCRAPE_DOJO_AUTH_OIDC_ENABLED',
          'false',
        ) === 'true',
      issuerUrl: this.configService.get<string>(
        'SCRAPE_DOJO_AUTH_OIDC_ISSUER_URL',
        '',
      ),
      clientId: this.configService.get<string>(
        'SCRAPE_DOJO_AUTH_OIDC_CLIENT_ID',
        '',
      ),
      clientSecret: this.configService.get<string>(
        'SCRAPE_DOJO_AUTH_OIDC_CLIENT_SECRET',
        '',
      ),
      redirectUri: this.configService.get<string>(
        'SCRAPE_DOJO_AUTH_OIDC_REDIRECT_URI',
        'http://localhost:3000/auth/oidc/callback',
      ),
      scopes: this.configService
        .get<string>('SCRAPE_DOJO_AUTH_OIDC_SCOPES', 'openid profile email')
        .split(' '),
      providerName: this.configService.get<string>(
        'SCRAPE_DOJO_AUTH_OIDC_PROVIDER_NAME',
        'OIDC Provider',
      ),
    };
  }

  async onModuleInit() {
    if (!this.oidcConfig.enabled) {
      this.logger.log('🔐 OIDC authentication is disabled');
      return;
    }

    if (!this.oidcConfig.issuerUrl || !this.oidcConfig.clientId) {
      this.logger.warn(
        '⚠️ OIDC enabled but missing configuration (issuer URL or client ID)',
      );
      this.oidcConfig.enabled = false;
      return;
    }

    try {
      this.logger.log(
        `🔐 Discovering OIDC provider: ${this.oidcConfig.issuerUrl}`,
      );

      this.config = await openidClient.discovery(
        new URL(this.oidcConfig.issuerUrl),
        this.oidcConfig.clientId,
        this.oidcConfig.clientSecret || undefined,
      );

      this.logger.log(
        `✅ OIDC provider discovered: ${this.oidcConfig.providerName}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to discover OIDC provider: ${error.message}`,
      );
      this.oidcConfig.enabled = false;
    }
  }

  /**
   * Check if OIDC is enabled and configured
   */
  isEnabled(): boolean {
    return this.oidcConfig.enabled && this.config !== null;
  }

  /**
   * Get OIDC provider info for frontend
   */
  getProviderInfo(): { enabled: boolean; name: string; loginUrl?: string } {
    if (!this.isEnabled()) {
      return { enabled: false, name: '' };
    }

    return {
      enabled: true,
      name: this.oidcConfig.providerName,
      loginUrl: '/auth/oidc/login',
    };
  }

  /**
   * Generate authorization URL with PKCE
   */
  async getAuthorizationUrl(state: string): Promise<string> {
    if (!this.config) {
      throw new BadRequestException('OIDC is not configured');
    }

    // Generate PKCE code verifier
    const codeVerifier = openidClient.randomPKCECodeVerifier();
    const codeChallenge =
      await openidClient.calculatePKCECodeChallenge(codeVerifier);

    // Store code verifier for callback
    this.codeVerifiers.set(state, codeVerifier);

    // Clean up old verifiers after 10 minutes
    setTimeout(() => this.codeVerifiers.delete(state), 10 * 60 * 1000);

    const parameters: Record<string, string> = {
      redirect_uri: this.oidcConfig.redirectUri,
      scope: this.oidcConfig.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    };

    const redirectTo = openidClient.buildAuthorizationUrl(
      this.config,
      parameters,
    );
    return redirectTo.href;
  }

  /**
   * Handle authorization callback
   */
  async handleCallback(
    code: string,
    state: string,
    extraCallbackParams: Record<string, string> = {},
  ): Promise<OidcUserInfo> {
    if (!this.config) {
      throw new BadRequestException('OIDC is not configured');
    }

    const codeVerifier = this.codeVerifiers.get(state);
    if (!codeVerifier) {
      throw new BadRequestException('Invalid or expired state parameter');
    }

    // Clean up used verifier
    this.codeVerifiers.delete(state);

    try {
      const callbackUrl = new URL(this.oidcConfig.redirectUri);
      // Ensure at least code/state are present
      callbackUrl.searchParams.set('code', code);
      callbackUrl.searchParams.set('state', state);
      // Preserve any extra params (e.g. iss/session_state) that some providers expect
      for (const [key, value] of Object.entries(extraCallbackParams)) {
        if (!value) continue;
        if (key === 'code' || key === 'state') continue;
        callbackUrl.searchParams.set(key, value);
      }

      // Exchange code for tokens
      const tokens = await openidClient.authorizationCodeGrant(
        this.config,
        callbackUrl,
        {
          pkceCodeVerifier: codeVerifier,
          expectedState: state,
        },
      );

      // Get user info from ID token claims
      const claims = tokens.claims();
      if (!claims) {
        throw new BadRequestException('No claims in ID token');
      }

      // Fetch additional user info if needed
      const userInfo: OidcUserInfo = {
        sub: claims.sub as string,
        email: (claims.email as string) || '',
        name: claims.name as string,
        preferred_username: claims.preferred_username as string,
        picture: claims.picture as string,
        iss: claims.iss as string,
      };

      // If email not in ID token, try userinfo endpoint
      if (!userInfo.email && tokens.access_token) {
        try {
          const userInfoResponse = await openidClient.fetchUserInfo(
            this.config,
            tokens.access_token,
            claims.sub as string,
          );
          userInfo.email = (userInfoResponse.email as string) || userInfo.email;
          userInfo.name = (userInfoResponse.name as string) || userInfo.name;
          userInfo.picture =
            (userInfoResponse.picture as string) || userInfo.picture;
        } catch (e) {
          this.logger.warn(`Could not fetch userinfo: ${e.message}`);
        }
      }

      if (!userInfo.email) {
        throw new BadRequestException('Email not provided by OIDC provider');
      }

      this.logger.log(`OIDC authentication successful for: ${userInfo.email}`);
      return userInfo;
    } catch (error) {
      this.logger.error(`OIDC callback error: ${error.message}`);
      throw new BadRequestException(
        `OIDC authentication failed: ${error.message}`,
      );
    }
  }

  /**
   * Get logout URL
   */
  getLogoutUrl(
    idTokenHint?: string,
    postLogoutRedirectUri?: string,
  ): string | null {
    if (!this.config) {
      return null;
    }

    const serverMetadata = this.config.serverMetadata();
    const endSessionEndpoint = serverMetadata.end_session_endpoint;

    if (!endSessionEndpoint) {
      return null;
    }

    const params = new URLSearchParams();
    if (idTokenHint) {
      params.set('id_token_hint', idTokenHint);
    }
    if (postLogoutRedirectUri) {
      params.set('post_logout_redirect_uri', postLogoutRedirectUri);
    }

    return `${endSessionEndpoint}?${params.toString()}`;
  }
}
