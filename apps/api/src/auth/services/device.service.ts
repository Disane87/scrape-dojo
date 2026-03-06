import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrustedDeviceEntity } from '../entities/trusted-device.entity';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as net from 'net';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generateFingerprint(userAgent: string, ipAddress: string): string {
    // IP addresses are unstable (NAT, mobile networks, IPv6 privacy addresses).
    // Do not bake them into trusted-device identifiers.
    const combined = `${userAgent}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Check if a device is trusted for the given user
   */
  async isDeviceTrusted(
    userId: string,
    deviceFingerprint: string,
  ): Promise<boolean> {
    const device = await this.deviceRepository.findOne({
      where: { userId, deviceFingerprint },
    });
    return !!device;
  }

  async getTrustedDevice(
    userId: string,
    deviceFingerprint: string,
  ): Promise<TrustedDeviceEntity | null> {
    return this.deviceRepository.findOne({
      where: { userId, deviceFingerprint },
    });
  }

  /**
   * Risk signal: treat a significant network change as higher risk.
   * - IPv4: compare /24
   * - IPv6: compare /64
   * - Ignore private/loopback addresses to avoid noisy dev/proxy setups
   */
  isNetworkChangeRisky(
    previousIp: string | null | undefined,
    currentIp: string | null | undefined,
  ): boolean {
    const prev = this.normalizeIp(previousIp);
    const curr = this.normalizeIp(currentIp);
    if (!prev || !curr) return false;

    const prevVersion = net.isIP(prev);
    const currVersion = net.isIP(curr);
    if (!prevVersion || !currVersion) return false;

    if (
      this.isPrivateOrLoopback(prev, prevVersion) ||
      this.isPrivateOrLoopback(curr, currVersion)
    ) {
      return false;
    }

    const prevKey = this.networkKey(prev, prevVersion);
    const currKey = this.networkKey(curr, currVersion);
    if (!prevKey || !currKey) return false;

    return prevKey !== currKey;
  }

  /**
   * Mark a device as trusted
   */
  async trustDevice(
    userId: string,
    deviceFingerprint: string,
    deviceName: string,
    ipAddress: string,
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
      this.logger.log(
        `Created new trusted device ${device.id} for user ${userId}`,
      );
    }

    return device;
  }

  /**
   * Update last used timestamp for a device
   */
  async updateDeviceLastUsed(
    userId: string,
    deviceFingerprint: string,
    ipAddress: string,
  ): Promise<void> {
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
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome'))
      browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    // Extract OS
    let os = 'Unknown OS';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (
      userAgent.includes('iOS') ||
      userAgent.includes('iPhone') ||
      userAgent.includes('iPad')
    )
      os = 'iOS';

    return `${browser} on ${os}`;
  }

  private normalizeIp(value: string | null | undefined): string | null {
    if (!value) return null;

    const raw = String(value).split(',')[0]?.trim();
    if (!raw) return null;

    // Strip IPv6 brackets like [::1]
    const unbracketed = raw.startsWith('[')
      ? raw.replace(/^\[([^\]]+)\].*$/, '$1')
      : raw;

    // Strip zone id (e.g. fe80::1%lo0)
    const noZone = unbracketed.split('%')[0]?.trim();

    // Handle IPv4:port
    const v4PortMatch = noZone.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)$/);
    if (v4PortMatch) return v4PortMatch[1];

    // Handle IPv4-mapped IPv6 (e.g. ::ffff:192.0.2.1)
    if (noZone.toLowerCase().startsWith('::ffff:') && noZone.includes('.')) {
      const maybeV4 = noZone.split(':').pop();
      if (maybeV4 && net.isIP(maybeV4) === 4) return maybeV4;
    }

    return noZone;
  }

  private isPrivateOrLoopback(ip: string, version: number): boolean {
    const lower = ip.toLowerCase();
    if (version === 4) {
      const parts = ip.split('.').map((p) => Number(p));
      if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n)))
        return false;
      const [a, b] = parts;
      if (a === 10) return true;
      if (a === 127) return true;
      if (a === 192 && b === 168) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      return false;
    }

    // IPv6
    if (lower === '::1') return true;
    if (lower.startsWith('fe80:')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
    return false;
  }

  private networkKey(ip: string, version: number): string | null {
    if (version === 4) {
      const parts = ip.split('.');
      if (parts.length !== 4) return null;
      return `v4:${parts[0]}.${parts[1]}.${parts[2]}`;
    }

    const hextets = this.expandIpv6ToHextets(ip);
    if (!hextets) return null;
    return `v6:${hextets.slice(0, 4).join(':')}`;
  }

  private expandIpv6ToHextets(ip: string): string[] | null {
    const raw = ip.toLowerCase().split('%')[0];

    // IPv4-mapped tail inside IPv6
    const hasIpv4Tail = raw.includes('.') && raw.includes(':');
    const partsForSplit = hasIpv4Tail
      ? raw.replace(/(\d+\.\d+\.\d+\.\d+)$/, '0:0')
      : raw;

    const [leftRaw, rightRaw] = partsForSplit.split('::');
    const left = leftRaw ? leftRaw.split(':').filter(Boolean) : [];
    const right = rightRaw ? rightRaw.split(':').filter(Boolean) : [];

    const missing = 8 - (left.length + right.length);
    if (missing < 0) return null;

    const hextets = [...left, ...Array(missing).fill('0'), ...right].map((h) =>
      h.padStart(4, '0'),
    );

    if (hasIpv4Tail) {
      const v4 = raw.split(':').pop();
      if (!v4 || net.isIP(v4) !== 4) return null;
      const nums = v4.split('.').map((p) => Number(p));
      if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n)))
        return null;
      const hi = ((nums[0] << 8) | nums[1]).toString(16).padStart(4, '0');
      const lo = ((nums[2] << 8) | nums[3]).toString(16).padStart(4, '0');
      hextets[6] = hi;
      hextets[7] = lo;
    }

    return hextets.length === 8 ? hextets : null;
  }
}
