import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../entities/user.entity';

/**
 * Decorator to inject the current user into a route handler
 */
export const CurrentUser = createParamDecorator(
    (data: keyof UserEntity | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as UserEntity;

        if (!user) {
            return null;
        }

        return data ? user[data] : user;
    },
);
