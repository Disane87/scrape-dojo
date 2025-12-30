import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Decorator to require specific roles for a route
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
