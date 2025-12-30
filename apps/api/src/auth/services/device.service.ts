import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrustedDeviceEntity } from '../entities/trusted-device.entity';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class DeviceService {
    private readonly logger = new Logger(DeviceService.name);

    constructor(
        @InjectRepository(TrustedDeviceEntity)
        private readonly deviceRepository: Repository<TrustedDeviceEntity>,
    ) {}

    /**
     * Generate a device fingerprint from user agent and IP
     */
    generateFingerprint(userAgent: string, ipAddress: string): string {
        const combined = `${userAgent}:${ipAddress}`;
        return crypto.createHash('sha256').update(combined).digest('hex');
    }

    /**
     * Check if a device is trusted for the given user
     */
    async isDeviceTrusted(userId: string, deviceFingerprint: string): Promise<boolean> {
        const device = await this.deviceRepository.findOne({
            where: { userId, deviceFingerprint },
        });
        return !!device;
    }

    /**
     * Mark a device as trusted
     */
    async trustDevice(
        userId: string,
        deviceFingerprint: string,
        deviceName: string,
        ipAddress: string
    ): Promise<TrustedDeviceEntity> {
        // Check if device already exists
        let device = await this.deviceRepository.findOne({
            where: { userId, deviceFingerprint },
        });

        if (device) {
            // Update existing device
            device.lastUsedAt = Date.now();
            device.lastIpAddress = ipAddress;
            device.deviceName = deviceName;
            await this.deviceRepository.save(device);
            this.logger.log(`Updated trusted device ${device.id} for user ${userId}`);
        } else {
            // Create new trusted device
            device = this.deviceRepository.create({
                id: uuidv4(),
                userId,
                deviceFingerprint,
                deviceName,
                lastIpAddress: ipAddress,
                lastUsedAt: Date.now(),
            });
            await this.deviceRepository.save(device);
            this.logger.log(`Created new trusted device ${device.id} for user ${userId}`);
        }

        return device;
    }

    /**
     * Update last used timestamp for a device
     */
    async updateDeviceLastUsed(userId: string, deviceFingerprint: string, ipAddress: string): Promise<void> {
        const device = await this.deviceRepository.findOne({
            where: { userId, deviceFingerprint },
        });

        if (device) {
            device.lastUsedAt = Date.now();
            device.lastIpAddress = ipAddress;
            await this.deviceRepository.save(device);
        }
    }

    /**
     * Get all trusted devices for a user
     */
    async getUserDevices(userId: string): Promise<TrustedDeviceEntity[]> {
        return this.deviceRepository.find({
            where: { userId },
            order: { lastUsedAt: 'DESC' },
        });
    }

    /**
     * Remove a trusted device
     */
    async removeTrustedDevice(userId: string, deviceId: string): Promise<void> {
        await this.deviceRepository.delete({ id: deviceId, userId });
        this.logger.log(`Removed trusted device ${deviceId} for user ${userId}`);
    }

    /**
     * Parse user agent to extract device name
     */
    parseDeviceName(userAgent: string): string {
        if (!userAgent) return 'Unknown Device';

        // Extract browser
        let browser = 'Unknown Browser';
        if (userAgent.includes('Chrome')) browser = 'Chrome';
        else if (userAgent.includes('Firefox')) browser = 'Firefox';
        else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
        else if (userAgent.includes('Edge')) browser = 'Edge';
        else if (userAgent.includes('Opera')) browser = 'Opera';

        // Extract OS
        let os = 'Unknown OS';
        if (userAgent.includes('Windows')) os = 'Windows';
        else if (userAgent.includes('Mac OS')) os = 'macOS';
        else if (userAgent.includes('Linux')) os = 'Linux';
        else if (userAgent.includes('Android')) os = 'Android';
        else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

        return `${browser} on ${os}`;
    }
}
