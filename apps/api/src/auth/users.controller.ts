import {
    Controller,
    Get,
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
import { JwtAuthGuard, RolesGuard } from './guards';
import { Roles, CurrentUser } from './decorators';
import { UserEntity, UserRole } from './entities/user.entity';
import { UpdateUserDto, UserResponseDto, ChangePasswordDto } from './dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(
        private readonly userService: UserService,
        private readonly deviceService: DeviceService,
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
        const userAgent = req.headers['user-agent'] || '';
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
        const currentFingerprint = this.deviceService.generateFingerprint(userAgent, ipAddress);
        
        const devices = await this.deviceService.getUserDevices(user.id);
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
