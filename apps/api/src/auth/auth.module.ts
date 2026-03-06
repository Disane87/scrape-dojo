import { Module, Global } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { UserEntity } from './entities/user.entity';
import { TrustedDeviceEntity } from './entities/trusted-device.entity';
import { ApiKeyEntity } from './entities/api-key.entity';

// Services
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { OidcService } from './services/oidc.service';
import { MfaService } from './services/mfa.service';
import { DeviceService } from './services/device.service';
import { ApiKeysService } from './services/api-keys.service';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ApiKeyGuard } from './guards/api-key.guard';

// Controllers
import { AuthController } from './auth.controller';
import { UsersController } from './users.controller';
import type { StringValue } from 'ms';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TrustedDeviceEntity, ApiKeyEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const secret = configService.get<string>(
          'SCRAPE_DOJO_AUTH_JWT_SECRET',
          'jwt-secret-change-me',
        );
        if (nodeEnv === 'production' && secret === 'jwt-secret-change-me') {
          throw new Error(
            'SCRAPE_DOJO_AUTH_JWT_SECRET must be set in production',
          );
        }

        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>(
              'SCRAPE_DOJO_AUTH_ACCESS_TOKEN_EXPIRY',
              '15m',
            ) as StringValue,
          },
        };
      },
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    // Services
    AuthService,
    UserService,
    OidcService,
    MfaService,
    DeviceService,
    ApiKeysService,
    // Strategies
    JwtStrategy,
    LocalStrategy,
    // Guards (available globally via exports)
    JwtAuthGuard,
    RolesGuard,
    ApiKeyGuard,
  ],
  exports: [
    AuthService,
    UserService,
    OidcService,
    MfaService,
    DeviceService,
    ApiKeysService,
    JwtAuthGuard,
    RolesGuard,
    ApiKeyGuard,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
