import { vi } from 'vitest';
import { IS_PUBLIC_KEY, Public } from './public.decorator';
import { ROLES_KEY, Roles } from './roles.decorator';
import { UserRole } from '../entities/user.entity';

// We need to test CurrentUser decorator by capturing the factory function.
// We do this by mocking createParamDecorator before importing CurrentUser.
let capturedFactory: (...args: any[]) => any;

vi.mock('@nestjs/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nestjs/common')>();
  return {
    ...actual,
    createParamDecorator: (factory: (...args: any[]) => any) => {
      capturedFactory = factory;
      return actual.createParamDecorator(factory);
    },
  };
});

// Import CurrentUser after the mock is in place
const { CurrentUser } = await import('./current-user.decorator');

describe('Auth Decorators', () => {
  describe('Public', () => {
    it('should set IS_PUBLIC_KEY metadata to true', () => {
      const decorator = Public();

      class TestController {
        handler() {}
      }

      decorator(
        TestController.prototype,
        'handler',
        Object.getOwnPropertyDescriptor(TestController.prototype, 'handler')!,
      );

      const metadata = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        TestController.prototype.handler,
      );
      expect(metadata).toBe(true);
    });

    it('should export the correct metadata key', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic');
    });
  });

  describe('Roles', () => {
    it('should set ROLES_KEY metadata with provided roles', () => {
      const decorator = Roles(UserRole.ADMIN);

      class TestController {
        handler() {}
      }

      decorator(
        TestController.prototype,
        'handler',
        Object.getOwnPropertyDescriptor(TestController.prototype, 'handler')!,
      );

      const metadata = Reflect.getMetadata(
        ROLES_KEY,
        TestController.prototype.handler,
      );
      expect(metadata).toEqual([UserRole.ADMIN]);
    });

    it('should support multiple roles', () => {
      const decorator = Roles(UserRole.ADMIN, UserRole.USER);

      class TestController {
        handler() {}
      }

      decorator(
        TestController.prototype,
        'handler',
        Object.getOwnPropertyDescriptor(TestController.prototype, 'handler')!,
      );

      const metadata = Reflect.getMetadata(
        ROLES_KEY,
        TestController.prototype.handler,
      );
      expect(metadata).toEqual([UserRole.ADMIN, UserRole.USER]);
    });

    it('should export the correct metadata key', () => {
      expect(ROLES_KEY).toBe('roles');
    });
  });

  describe('CurrentUser', () => {
    it('should be defined as a decorator', () => {
      expect(CurrentUser).toBeDefined();
      expect(typeof CurrentUser).toBe('function');
    });

    it('should have captured the factory function', () => {
      expect(capturedFactory).toBeDefined();
      expect(typeof capturedFactory).toBe('function');
    });

    function createMockContext(user: any) {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      };
    }

    it('should return null when no user on request', () => {
      const ctx = createMockContext(undefined);
      const result = capturedFactory(undefined, ctx);
      expect(result).toBeNull();
    });

    it('should return null when user is null', () => {
      const ctx = createMockContext(null);
      const result = capturedFactory(undefined, ctx);
      expect(result).toBeNull();
    });

    it('should return the full user when no data key is specified', () => {
      const mockUser = { id: 'u1', email: 'test@example.com', role: 'user' };
      const ctx = createMockContext(mockUser);
      const result = capturedFactory(undefined, ctx);
      expect(result).toEqual(mockUser);
    });

    it('should return specific field when data key is specified', () => {
      const mockUser = { id: 'u1', email: 'test@example.com', role: 'admin' };
      const ctx = createMockContext(mockUser);

      expect(capturedFactory('email', ctx)).toBe('test@example.com');
      expect(capturedFactory('id', ctx)).toBe('u1');
      expect(capturedFactory('role', ctx)).toBe('admin');
    });

    it('should return undefined for a non-existent field', () => {
      const mockUser = { id: 'u1', email: 'test@example.com' };
      const ctx = createMockContext(mockUser);
      const result = capturedFactory('avatarUrl', ctx);
      expect(result).toBeUndefined();
    });
  });
});
