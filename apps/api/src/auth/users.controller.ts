import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './services/user.service';
import { DeviceService } from './services/device.service';
import { ApiKeysService } from './services/api-keys.service';
import { JwtAuthGuard, RolesGuard } from './guards';
import { Roles, CurrentUser } from './decorators';
import { UserEntity, UserRole } from './entities/user.entity';
import { UpdateUserDto, UserResponseDto, ChangePasswordDto, CreateUserApiKeyDto, UserApiKeyListItemDto, CreateUserApiKeyResponseDto } from './dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(
        private readonly userService: UserService,
        private readonly deviceService: DeviceService,
        private readonly apiKeysService: ApiKeysService,
    ) {}

    @Get()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get all users (admin only)' })
    @ApiResponse({ status: 200, description: 'List of users', type: [UserResponseDto] })
    async findAll(): Promise<UserResponseDto[]> {
        const users = await this.userService.findAll();
        return users.map(this.toUserResponse);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get user by ID (admin only)' })
    @ApiResponse({ status: 200, description: 'User details', type: UserResponseDto })
    @ApiResponse({ status: 404, description: 'User not found' })
    async findOne(@Param('id') id: string): Promise<UserResponseDto> {
        const user = await this.userService.findById(id);
        if (!user) {
            throw new Error('User not found');
        }
        return this.toUserResponse(user);
    }

    @Put(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Update user (admin only)' })
    @ApiResponse({ status: 200, description: 'User updated', type: UserResponseDto })
    @ApiResponse({ status: 404, description: 'User not found' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        const user = await this.userService.updateUser(id, dto);
        return this.toUserResponse(user);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Deactivate user (admin only)' })
    @ApiResponse({ status: 204, description: 'User deactivated' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async deactivate(
        @Param('id') id: string,
        @CurrentUser() currentUser: UserEntity,
    ) {
        if (id === currentUser.id) {
            throw new Error('Cannot deactivate yourself');
        }
        await this.userService.deactivateUser(id);
    }

    // ==================== API Keys (User Context) ====================

    @Get('me/api-keys')
    @ApiOperation({ summary: 'List API keys for current user' })
    @ApiResponse({ status: 200, description: 'List of API keys', type: [UserApiKeyListItemDto] })
    async listMyApiKeys(@CurrentUser() user: UserEntity): Promise<UserApiKeyListItemDto[]> {
        const keys = await this.apiKeysService.listForUser(user.id);
        return keys.map((k) => ({
            id: k.id,
            name: k.name,
            keyPrefix: k.keyPrefix,
            lastUsedAt: k.lastUsedAt ?? null,
            revokedAt: k.revokedAt ?? null,
            createdAt: k.createdAt,
        }));
    }

    @Post('me/api-keys')
    @ApiOperation({ summary: 'Create an API key for current user (shown once)' })
    @ApiResponse({ status: 201, description: 'API key created', type: CreateUserApiKeyResponseDto })
    async createMyApiKey(
        @CurrentUser() user: UserEntity,
        @Body() dto: CreateUserApiKeyDto,
    ): Promise<CreateUserApiKeyResponseDto> {
        const { apiKey, entity } = await this.apiKeysService.createForUser(user.id, dto.name);
        return {
            apiKey,
            item: {
                id: entity.id,
                name: entity.name,
                keyPrefix: entity.keyPrefix,
                lastUsedAt: entity.lastUsedAt ?? null,
                revokedAt: entity.revokedAt ?? null,
                createdAt: entity.createdAt,
            },
        };
    }

    @Delete('me/api-keys/:apiKeyId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Revoke an API key for current user' })
    @ApiResponse({ status: 204, description: 'API key revoked' })
    async revokeMyApiKey(
        @CurrentUser() user: UserEntity,
        @Param('apiKeyId') apiKeyId: string,
    ): Promise<void> {
        await this.apiKeysService.revokeForUser(user.id, apiKeyId);
    }

    // ==================== Profile Management ====================

    @Get('me/profile')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile', type: UserResponseDto })
    async getProfile(@CurrentUser() user: UserEntity): Promise<UserResponseDto> {
        return this.toUserResponse(user);
    }

    @Put('me/profile')
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated', type: UserResponseDto })
    async updateProfile(
        @CurrentUser() user: UserEntity,
        @Body() dto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        const updated = await this.userService.updateUser(user.id, dto);
        return this.toUserResponse(updated);
    }

    @Put('me/password')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Change password' })
    @ApiResponse({ status: 204, description: 'Password changed successfully' })
    @ApiResponse({ status: 401, description: 'Current password is incorrect' })
    async changePassword(
        @CurrentUser() user: UserEntity,
        @Body() dto: ChangePasswordDto,
    ): Promise<void> {
        await this.userService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    }

    // ==================== Device Management ====================

    @Get('me/devices')
    @ApiOperation({ summary: 'Get trusted devices for current user' })
    @ApiResponse({ status: 200, description: 'List of trusted devices' })
    async getMyDevices(@CurrentUser() user: UserEntity) {
        const devices = await this.deviceService.getUserDevices(user.id);
        return devices.map(device => ({
            id: device.id,
            deviceName: device.deviceName,
            lastIpAddress: device.lastIpAddress,
            lastUsedAt: device.lastUsedAt,
            createdAt: device.createdAt,
        }));
    }

    @Delete('me/devices/:deviceId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remove a trusted device' })
    @ApiResponse({ status: 204, description: 'Device removed' })
    @ApiResponse({ status: 404, description: 'Device not found' })
    async removeDevice(
        @CurrentUser() user: UserEntity,
        @Param('deviceId') deviceId: string,
    ): Promise<void> {
        await this.deviceService.removeTrustedDevice(user.id, deviceId);
    }

    @Delete('me/devices')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remove all trusted devices except current' })
    @ApiResponse({ status: 204, description: 'All devices removed' })
    async removeAllDevices(
        @CurrentUser() user: UserEntity,
        @Req() req: Request,
    ): Promise<void> {
        const headerFingerprint = req.headers['x-device-fingerprint'];
        const currentFingerprint = typeof headerFingerprint === 'string' ? headerFingerprint : null;

        const devices = await this.deviceService.getUserDevices(user.id);

        // If the UI didn't send a fingerprint, keep the most recently used device as a best-effort.
        if (!currentFingerprint) {
            const keepDeviceId = devices[0]?.id;
            for (const device of devices) {
                if (device.id !== keepDeviceId) {
                    await this.deviceService.removeTrustedDevice(user.id, device.id);
                }
            }
            return;
        }

        for (const device of devices) {
            if (device.deviceFingerprint !== currentFingerprint) {
                await this.deviceService.removeTrustedDevice(user.id, device.id);
            }
        }
    }

    private toUserResponse(user: UserEntity): UserResponseDto {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            avatarUrl: user.avatarUrl,
            provider: user.provider,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
        };
    }
}
