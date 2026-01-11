import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class LoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email address' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123', description: 'User password', minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiPropertyOptional({ description: 'TOTP code from authenticator app (required when MFA is enabled)', example: '123456' })
    @IsOptional()
    @IsString()
    mfaCode?: string;

    @ApiPropertyOptional({ description: 'Device fingerprint for device tracking' })
    @IsOptional()
    @IsString()
    deviceFingerprint?: string;
}

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email address' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123', description: 'User password', minLength: 8 })
    @IsString()
    @MinLength(8)
    password: string;

    @ApiPropertyOptional({ example: 'johndoe', description: 'Username' })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiPropertyOptional({ example: 'John Doe', description: 'Display name' })
    @IsOptional()
    @IsString()
    displayName?: string;

    @ApiPropertyOptional({ description: 'Device fingerprint for device tracking' })
    @IsOptional()
    @IsString()
    deviceFingerprint?: string;
}

export class RefreshTokenDto {
    @ApiProperty({ description: 'Refresh token' })
    @IsString()
    refreshToken: string;
}

export class TokenResponseDto {
    @ApiProperty({ description: 'JWT access token' })
    accessToken: string;

    @ApiProperty({ description: 'JWT refresh token' })
    refreshToken: string;

    @ApiProperty({ description: 'Token type', example: 'Bearer' })
    tokenType: string;

    @ApiProperty({ description: 'Access token expiration in seconds' })
    expiresIn: number;
}

export class MfaChallengeResponseDto {
    @ApiPropertyOptional({ description: 'True when user must enter an MFA code' })
    @IsOptional()
    mfaRequired?: boolean;

    @ApiPropertyOptional({ description: 'True when user must set up MFA first' })
    @IsOptional()
    mfaSetupRequired?: boolean;

    @ApiProperty({ description: 'Short-lived JWT used to perform MFA setup/complete' })
    @IsString()
    mfaChallengeToken: string;
}

export class MfaSetupRequestDto {
    @ApiProperty({ description: 'MFA challenge token from login/register/OIDC callback' })
    @IsString()
    mfaChallengeToken: string;
}

export class MfaSetupResponseDto {
    @ApiProperty({ description: 'otpauth:// URL for authenticator apps' })
    otpauthUrl: string;

    @ApiProperty({ description: 'QR code as data URL (image/png)' })
    qrCodeDataUrl: string;

    @ApiProperty({ description: 'Base32 secret (for manual entry)' })
    secret: string;
}

export class MfaCompleteRequestDto {
    @ApiProperty({ description: 'MFA challenge token' })
    @IsString()
    mfaChallengeToken: string;

    @ApiProperty({ description: 'TOTP code' })
    @IsString()
    code: string;

    @ApiPropertyOptional({ description: 'Device fingerprint for device tracking' })
    @IsOptional()
    @IsString()
    deviceFingerprint?: string;
}

export class UserResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    email: string;

    @ApiPropertyOptional()
    username?: string;

    @ApiPropertyOptional()
    displayName?: string;

    @ApiProperty({ enum: UserRole })
    role: UserRole;

    @ApiPropertyOptional()
    avatarUrl?: string;

    @ApiProperty()
    provider: string;

    @ApiProperty()
    isActive: boolean;

    @ApiPropertyOptional()
    lastLoginAt?: number;

    @ApiProperty()
    createdAt: number;
}

export class OidcCallbackDto {
    @ApiProperty({ description: 'Authorization code from OIDC provider' })
    @IsString()
    code: string;

    @ApiPropertyOptional({ description: 'State parameter for CSRF protection' })
    @IsOptional()
    @IsString()
    state?: string;
}

export class UpdateUserDto {
    @ApiPropertyOptional({ example: 'johndoe', description: 'Username' })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiPropertyOptional({ example: 'John Doe', description: 'Display name' })
    @IsOptional()
    @IsString()
    displayName?: string;

    @ApiPropertyOptional({ enum: UserRole, description: 'User role (admin only)' })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}

export class ChangePasswordDto {
    @ApiProperty({ description: 'Current password' })
    @IsString()
    currentPassword: string;

    @ApiProperty({ description: 'New password', minLength: 8 })
    @IsString()
    @MinLength(8)
    newPassword: string;
}

export class CreateUserApiKeyDto {
    @ApiProperty({ description: 'Human-readable name for the API key', example: 'CI / Scripts', maxLength: 64 })
    @IsString()
    @MaxLength(64)
    name: string;
}

export class UserApiKeyListItemDto {
    @ApiProperty()
    id: string;

    @ApiProperty({ description: 'Human-readable name' })
    name: string;

    @ApiProperty({ description: 'Non-sensitive prefix shown to identify the key', example: 'sdj_12ab34cd56ef' })
    keyPrefix: string;

    @ApiPropertyOptional({ description: 'Last time this key was used (epoch ms)' })
    lastUsedAt?: number | null;

    @ApiPropertyOptional({ description: 'Revoked timestamp (epoch ms), if revoked' })
    revokedAt?: number | null;

    @ApiProperty()
    createdAt: number;
}

export class CreateUserApiKeyResponseDto {
    @ApiProperty({ description: 'The plaintext API key. This is only returned once on creation.' })
    apiKey: string;

    @ApiProperty({ description: 'Metadata for the created key' })
    item: UserApiKeyListItemDto;
}
