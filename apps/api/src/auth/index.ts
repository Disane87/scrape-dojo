// Auth Module
export { AuthModule } from './auth.module';

// Entities
export { UserEntity, UserRole, AuthProvider } from './entities';

// Services
export { AuthService, JwtPayload } from './services';
export { UserService } from './services';
export { OidcService, OidcConfig, OidcUserInfo } from './services';

// Guards
export {
  JwtAuthGuard,
  LocalAuthGuard,
  RolesGuard,
  ApiKeyGuard,
} from './guards';

// Decorators
export {
  Public,
  IS_PUBLIC_KEY,
  Roles,
  ROLES_KEY,
  CurrentUser,
} from './decorators';

// DTOs
export {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  TokenResponseDto,
  UserResponseDto,
  OidcCallbackDto,
  UpdateUserDto,
  ChangePasswordDto,
} from './dto';
