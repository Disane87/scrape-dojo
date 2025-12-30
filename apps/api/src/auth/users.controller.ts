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
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './services/user.service';
import { JwtAuthGuard, RolesGuard } from './guards';
import { Roles, CurrentUser } from './decorators';
import { UserEntity, UserRole } from './entities/user.entity';
import { UpdateUserDto, UserResponseDto } from './dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly userService: UserService) {}

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
