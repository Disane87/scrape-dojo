import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authenticator } from 'otplib';
import * as crypto from 'crypto';
import * as qrcode from 'qrcode';

export interface MfaChallengePayload {
    sub: string;
    purpose: 'mfa_challenge';
    iat?: number;
    exp?: number;
}

export interface MfaChallengeResponse {
    mfaRequired?: boolean;
    mfaSetupRequired?: boolean;
    mfaChallengeToken: string;
}

export interface MfaSetupResponse {
    otpauthUrl: string;
    qrCodeDataUrl: string;
    secret: string;
}

@Injectable()
export class MfaService {
    private readonly logger = new Logger(MfaService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,
    ) {
        authenticator.options = {
            window: 1,
        };
    }

    isMfaRequired(): boolean {
        const authEnabled = this.configService.get<string>('SCRAPE_DOJO_AUTH_ENABLED', 'true') === 'true';
        if (!authEnabled) return false;
        return this.configService.get<string>('SCRAPE_DOJO_AUTH_REQUIRE_MFA', 'true') === 'true';
    }

    createChallengeToken(userId: string): string {
        const secret = this.getChallengeSecret();
        return this.jwtService.sign(
            { sub: userId, purpose: 'mfa_challenge' satisfies MfaChallengePayload['purpose'] },
            { secret, expiresIn: '10m' },
        );
    }

    verifyChallengeToken(token: string): MfaChallengePayload {
        try {
            const payload = this.jwtService.verify<MfaChallengePayload>(token, {
                secret: this.getChallengeSecret(),
            });

            if (payload?.purpose !== 'mfa_challenge' || !payload?.sub) {
                throw new UnauthorizedException('Invalid MFA challenge token');
            }

            return payload;
        } catch (err: any) {
            const msg = err?.message ? String(err.message) : String(err);
            this.logger.warn(`MFA challenge token verification failed: ${msg}`);
            throw new UnauthorizedException('Invalid or expired MFA challenge token');
        }
    }

    generateSecret(): string {
        return authenticator.generateSecret();
    }

    buildOtpAuthUrl(email: string, issuer: string, secret: string): string {
        // "Scrape Dojo" issuer is safe; clients display issuer/account.
        return authenticator.keyuri(email, issuer, secret);
    }

    async buildQrCodeDataUrl(otpauthUrl: string): Promise<string> {
        return qrcode.toDataURL(otpauthUrl, { margin: 1, scale: 6 });
    }

    verifyTotp(code: string, secret: string): boolean {
        const normalized = String(code ?? '').replace(/\s+/g, '');
        if (!normalized) return false;
        return authenticator.check(normalized, secret);
    }

    encryptSecret(plain: string): string {
        const key = this.getEncryptionKey();
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        const ciphertext = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()]);
        const tag = cipher.getAuthTag();

        return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.');
    }

    decryptSecret(encrypted: string): string {
        const parts = String(encrypted || '').split('.');
        if (parts.length !== 3) {
            throw new UnauthorizedException('Invalid MFA secret format');
        }

        const [ivB64, tagB64, dataB64] = parts;
        const key = this.getEncryptionKey();

        const iv = Buffer.from(ivB64, 'base64');
        const tag = Buffer.from(tagB64, 'base64');
        const data = Buffer.from(dataB64, 'base64');

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);

        const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
        return plain;
    }

    private getChallengeSecret(): string {
        const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
        const secret = this.configService.get<string>('SCRAPE_DOJO_AUTH_MFA_CHALLENGE_SECRET', 'mfa-challenge-secret-change-me');
        if (nodeEnv === 'production' && secret === 'mfa-challenge-secret-change-me') {
            throw new Error('SCRAPE_DOJO_AUTH_MFA_CHALLENGE_SECRET must be set in production');
        }
        return secret;
    }

    private getEncryptionKey(): Buffer {
        const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
        const raw = this.configService.get<string>('SCRAPE_DOJO_AUTH_MFA_ENCRYPTION_KEY');

        if (!raw) {
            // Dev fallback: derive from JWT secret (still better than plaintext in DB).
            const jwtSecret = this.configService.get<string>('SCRAPE_DOJO_AUTH_JWT_SECRET', 'jwt-secret-change-me');
            if (nodeEnv === 'production') {
                throw new Error('SCRAPE_DOJO_AUTH_MFA_ENCRYPTION_KEY must be set in production');
            }
            return crypto.createHash('sha256').update(jwtSecret).digest();
        }

        // Accept either base64(32 bytes) or a raw string; normalize via sha256 to 32 bytes.
        try {
            const asBuf = Buffer.from(raw, 'base64');
            if (asBuf.length === 32) return asBuf;
        } catch {
            // ignore
        }

        return crypto.createHash('sha256').update(raw).digest();
    }
}
