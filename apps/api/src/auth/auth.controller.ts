import {
    Controller,
    Post,
    Get,
    Body,
    Res,
    Query,
    HttpCode,
    HttpStatus,
    UseGuards,
    Logger,
    BadRequestException,
    Req,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiBody,
    ApiQuery,
} from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from './services/auth.service';
import { OidcService } from './services/oidc.service';
import { UserService } from './services/user.service';
import { JwtAuthGuard, LocalAuthGuard } from './guards';
import { Public, CurrentUser } from './decorators';
import { UserEntity } from './entities/user.entity';
import {
    LoginDto,
    RegisterDto,
    RefreshTokenDto,
    TokenResponseDto,
    UserResponseDto,
    ChangePasswordDto,
} from './dto';
import {
    MfaChallengeResponseDto,
    MfaSetupRequestDto,
    MfaSetupResponseDto,
    MfaCompleteRequestDto,
} from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private readonly authService: AuthService,
        private readonly oidcService: OidcService,
        private readonly userService: UserService,
    ) {}

    // ==================== Public Endpoints ====================

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email and password' })
    @ApiResponse({ status: 200, description: 'Login successful', type: TokenResponseDto })
    @ApiResponse({ status: 200, description: 'MFA required/setup required', type: MfaChallengeResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() dto: LoginDto, @Req() req: Request): Promise<TokenResponseDto | MfaChallengeResponseDto> {
        this.logger.log(`Login attempt for: ${dto.email}`);
        const userAgent = req.headers['user-agent'] || '';
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
        return this.authService.login(dto, userAgent, ipAddress);
    }

    @Public()
    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    @ApiResponse({ status: 201, description: 'Registration successful', type: TokenResponseDto })
    @ApiResponse({ status: 201, description: 'MFA setup required', type: MfaChallengeResponseDto })
    @ApiResponse({ status: 409, description: 'User already exists' })
    async register(@Body() dto: RegisterDto): Promise<TokenResponseDto | MfaChallengeResponseDto> {
        this.logger.log(`Registration attempt for: ${dto.email}`);
        return this.authService.register(dto);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'Token refreshed', type: TokenResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
        return this.authService.refreshTokens(dto.refreshToken);
    }

    @Public()
    @Get('setup-required')
    @ApiOperation({ summary: 'Check if initial admin setup is required' })
    @ApiResponse({ status: 200, description: 'Setup status' })
    async checkSetupRequired(): Promise<{ required: boolean }> {
        const required = await this.authService.needsInitialSetup();
        return { required };
    }

    @Public()
    @Post('setup')
    @ApiOperation({ summary: 'Create initial admin user' })
    @ApiResponse({ status: 201, description: 'Admin created', type: TokenResponseDto })
    @ApiResponse({ status: 201, description: 'MFA setup required', type: MfaChallengeResponseDto })
    @ApiResponse({ status: 409, description: 'Admin already exists' })
    async initialSetup(@Body() dto: RegisterDto): Promise<TokenResponseDto | MfaChallengeResponseDto> {
        this.logger.log(`Initial admin setup for: ${dto.email}`);
        return this.authService.createInitialAdmin(dto);
    }

    // ==================== MFA Endpoints ====================

    @Public()
    @Post('mfa/setup')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Start MFA setup (returns QR + secret)' })
    @ApiBody({ type: MfaSetupRequestDto })
    @ApiResponse({ status: 200, description: 'MFA setup payload', type: MfaSetupResponseDto })
    async mfaSetup(@Body() dto: MfaSetupRequestDto): Promise<MfaSetupResponseDto> {
        const { otpauthUrl, qrCodeDataUrl, secret } = await this.authService.setupMfaFromChallenge(dto.mfaChallengeToken);
        return { otpauthUrl, qrCodeDataUrl, secret };
    }

    @Public()
    @Post('mfa/complete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Complete MFA (verify code, enable if needed, mint tokens)' })
    @ApiBody({ type: MfaCompleteRequestDto })
    @ApiResponse({ status: 200, description: 'Tokens', type: TokenResponseDto })
    async mfaComplete(@Body() dto: MfaCompleteRequestDto, @Req() req: Request): Promise<TokenResponseDto> {
        const userAgent = req.headers['user-agent'] || '';
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
        return this.authService.completeMfaFromChallenge(dto.mfaChallengeToken, dto.code, dto.deviceFingerprint, userAgent, ipAddress);
    }

    // ==================== OIDC Endpoints ====================

    @Public()
    @Get('oidc/config')
    @ApiOperation({ summary: 'Get OIDC provider configuration' })
    @ApiResponse({ status: 200, description: 'OIDC configuration' })
    getOidcConfig() {
        return this.oidcService.getProviderInfo();
    }

    @Public()
    @Get('oidc/login')
    @ApiOperation({ summary: 'Initiate OIDC login flow' })
    @ApiQuery({ name: 'redirect', required: false, description: 'Post-login redirect URL' })
    @ApiResponse({ status: 302, description: 'Redirect to OIDC provider' })
    async oidcLogin(
        @Query('redirect') redirectUrl: string,
        @Res() res: Response,
    ) {
        if (!this.oidcService.isEnabled()) {
            throw new BadRequestException('OIDC authentication is not enabled');
        }

        // Generate state with optional redirect URL.
        // IMPORTANT: We must pass the *exact* returned state into the callback handler,
        // because the PKCE verifier is stored in-memory keyed by this state.
        // Do NOT encode the redirectUrl here; it would be decoded by the query parser on callback
        // and then no longer match the in-memory key.
        const state = uuidv4() + (redirectUrl ? `|${redirectUrl}` : '');
        const authUrl = await this.oidcService.getAuthorizationUrl(state);
        
        this.logger.log('Redirecting to OIDC provider');
        return res.redirect(authUrl);
    }

    @Public()
    @Get('oidc/callback')
    @ApiOperation({ summary: 'OIDC callback endpoint' })
    @ApiResponse({ status: 200, description: 'Authentication successful' })
    @ApiResponse({ status: 400, description: 'Authentication failed' })
    async oidcCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Query() allQuery: Record<string, any>,
        @Query('error') error: string,
        @Query('error_description') errorDescription: string,
        @Res() res: Response,
    ) {
        if (error) {
            this.logger.error(`OIDC error: ${error} - ${errorDescription}`);
            return res.redirect(
                `http://localhost:4200/oidc/callback?auth_error=${encodeURIComponent(errorDescription || error)}`,
            );
        }

        if (!code || !state) {
            throw new BadRequestException('Missing code or state parameter');
        }

        try {
            // Extract redirect URL from state if present, but pass the full state to the OIDC service
            // so the PKCE verifier lookup works.
            const parts = state.split('|');
            const redirectUrl = parts.length > 1 ? parts.slice(1).join('|') : '/';

            // Pass through any extra callback params (e.g. iss/session_state) to satisfy openid-client validation.
            const extraParams: Record<string, string> = {};
            for (const [key, value] of Object.entries(allQuery ?? {})) {
                if (typeof value === 'string') {
                    extraParams[key] = value;
                }
            }

            const userInfo = await this.oidcService.handleCallback(code, state, extraParams);
            const tokens = await this.authService.handleOidcUser(userInfo);

            // Redirect to frontend callback route with tokens
            // NOTE: Must not start with '/auth' because the Angular dev proxy forwards '/auth' to the API.
            const frontendCallbackUrl = 'http://localhost:4200/oidc/callback';
            const separator = '?';

            if ('accessToken' in tokens) {
                return res.redirect(
                    `${frontendCallbackUrl}${separator}access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}&expires_in=${tokens.expiresIn}&return_url=${encodeURIComponent(redirectUrl)}`
                );
            }

            // MFA flow: redirect with challenge token
            const mfaSetupRequired = tokens.mfaSetupRequired ? '1' : '0';
            return res.redirect(
                `${frontendCallbackUrl}${separator}mfa_challenge_token=${encodeURIComponent(tokens.mfaChallengeToken)}&mfa_setup_required=${mfaSetupRequired}&return_url=${encodeURIComponent(redirectUrl)}`
            );
        } catch (err) {
            const message = err?.message ? String(err.message) : String(err);
            this.logger.error(`OIDC callback failed: ${message}`, err?.stack);

            // TypeORM QueryFailedError often includes query + parameters. Logging them makes DB issues debuggable.
            const anyErr = err as any;
            if (anyErr?.query) {
                this.logger.error(
                    `OIDC callback DB query failed: ${String(anyErr.query)} params=${JSON.stringify(anyErr.parameters ?? [])}`,
                );
            }

            return res.redirect(`http://localhost:4200/oidc/callback?auth_error=${encodeURIComponent(message)}`);
        }
    }

    // ==================== Protected Endpoints ====================

    @UseGuards(JwtAuthGuard)
    @Get('me')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile', type: UserResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    getProfile(@CurrentUser() user: UserEntity): UserResponseDto {
        return this.toUserResponse(user);
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout current user' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    async logout(@CurrentUser() user: UserEntity) {
        await this.authService.logout(user.id);
        return { message: 'Logged out successfully' };
    }

    @UseGuards(JwtAuthGuard)
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Change password (local auth only)' })
    @ApiResponse({ status: 200, description: 'Password changed' })
    @ApiResponse({ status: 400, description: 'Invalid current password' })
    async changePassword(
        @CurrentUser() user: UserEntity,
        @Body() dto: ChangePasswordDto,
    ) {
        await this.userService.changePassword(user.id, dto.currentPassword, dto.newPassword);
        return { message: 'Password changed successfully' };
    }

    // ==================== Helper Methods ====================

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
