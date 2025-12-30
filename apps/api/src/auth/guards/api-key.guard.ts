import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard that checks for API key in header when auth is disabled
 * or for specific endpoints that need API key access
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
    private readonly apiKey: string | undefined;
    private readonly authEnabled: boolean;

    constructor(
        private reflector: Reflector,
        private configService: ConfigService,
    ) {
        this.apiKey = this.configService.get<string>('SCRAPE_DOJO_AUTH_API_KEY');
        this.authEnabled = this.configService.get<string>('SCRAPE_DOJO_AUTH_ENABLED', 'true') === 'true';
    }

    canActivate(context: ExecutionContext): boolean {
        // Check if route is marked as public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        // If no API key configured, skip this guard
        if (!this.apiKey) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const providedKey = request.headers['x-api-key'];

        if (providedKey === this.apiKey) {
            // Set a flag to indicate API key auth was used
            request.apiKeyAuth = true;
            return true;
        }

        // If auth is disabled and API key is configured but not provided
        if (!this.authEnabled && this.apiKey && !providedKey) {
            throw new ForbiddenException('API key required');
        }

        return true;
    }
}
