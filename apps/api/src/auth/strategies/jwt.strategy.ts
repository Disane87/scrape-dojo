import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../services/auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly requireMfa: boolean;

  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    const authEnabled =
      configService.get<string>('SCRAPE_DOJO_AUTH_ENABLED', 'true') === 'true';
    const requireMfa =
      configService.get<string>('SCRAPE_DOJO_AUTH_REQUIRE_MFA', 'true') ===
      'true';
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          if (!req) return null;
          const path = String(req.path || req.url || '');
          // Only allow query-string token for SSE endpoint. EventSource can't set headers.
          if (!path.includes('/events')) return null;
          const query = req.query || {};
          const token = query.access_token || query.token;
          return typeof token === 'string' && token.length > 0 ? token : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'SCRAPE_DOJO_AUTH_JWT_SECRET',
        'jwt-secret-change-me',
      ),
    });

    this.requireMfa = authEnabled && requireMfa;
  }

  async validate(payload: JwtPayload) {
    if (this.requireMfa && payload?.mfa !== true) {
      throw new UnauthorizedException('MFA required');
    }
    const user = await this.authService.validateJwtPayload(payload);
    if (!user) {
      throw new UnauthorizedException('Invalid token or user not found');
    }
    return user;
  }
}
