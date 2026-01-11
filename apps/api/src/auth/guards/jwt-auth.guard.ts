import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiKeysService } from '../services/api-keys.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(
        private reflector: Reflector,
        private apiKeysService: ApiKeysService,
    ) {
        super();
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        // Check if route is marked as public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const providedKey = request?.headers?.['x-api-key'];
        if (typeof providedKey === 'string' && providedKey.trim().length > 0) {
            return this.apiKeysService.validateApiKey(providedKey.trim()).then((user) => {
                if (!user) {
                    throw new UnauthorizedException('Invalid API key');
                }
                request.user = user;
                request.apiKeyAuth = true;
                return true;
            });
        }

        return super.canActivate(context);
    }
}
