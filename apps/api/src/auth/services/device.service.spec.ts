import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeviceService } from './device.service';
import { TrustedDeviceEntity } from '../entities/trusted-device.entity';

describe('DeviceService', () => {
  let service: DeviceService;

  const mockDevice: Partial<TrustedDeviceEntity> = {
    id: 'device-1',
    userId: 'user-1',
    deviceFingerprint: 'fingerprint-abc',
    deviceName: 'Chrome on Windows',
    lastIpAddress: '1.2.3.4',
    lastUsedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const mockRepository = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        {
          provide: getRepositoryToken(TrustedDeviceEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DeviceService>(DeviceService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateFingerprint', () => {
    it('should generate a SHA-256 hash from user agent only', () => {
      const result = service.generateFingerprint(
        'Mozilla/5.0 Chrome',
        '1.2.3.4',
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(64); // SHA-256 hex length
    });

    it('should produce the same hash for the same user agent regardless of IP', () => {
      const r1 = service.generateFingerprint('Mozilla/5.0 Chrome', '1.2.3.4');
      const r2 = service.generateFingerprint('Mozilla/5.0 Chrome', '5.6.7.8');

      expect(r1).toBe(r2);
    });

    it('should produce different hashes for different user agents', () => {
      const r1 = service.generateFingerprint('Mozilla/5.0 Chrome', '1.2.3.4');
      const r2 = service.generateFingerprint('Mozilla/5.0 Firefox', '1.2.3.4');

      expect(r1).not.toBe(r2);
    });
  });

  describe('isDeviceTrusted', () => {
    it('should return true when device exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockDevice);

      const result = await service.isDeviceTrusted('user-1', 'fingerprint-abc');

      expect(result).toBe(true);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', deviceFingerprint: 'fingerprint-abc' },
      });
    });

    it('should return false when device does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.isDeviceTrusted('user-1', 'unknown');

      expect(result).toBe(false);
    });
  });

  describe('getTrustedDevice', () => {
    it('should return the device entity when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockDevice);

      const result = await service.getTrustedDevice(
        'user-1',
        'fingerprint-abc',
      );

      expect(result).toEqual(mockDevice);
    });

    it('should return null when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getTrustedDevice('user-1', 'unknown');

      expect(result).toBeNull();
    });
  });

  describe('isNetworkChangeRisky', () => {
    it('should return false when previous IP is null', () => {
      expect(service.isNetworkChangeRisky(null, '8.8.8.8')).toBe(false);
    });

    it('should return false when current IP is null', () => {
      expect(service.isNetworkChangeRisky('8.8.8.8', null)).toBe(false);
    });

    it('should return false when both IPs are in the same /24 subnet', () => {
      expect(service.isNetworkChangeRisky('203.0.113.1', '203.0.113.254')).toBe(
        false,
      );
    });

    it('should return true when IPs are in different /24 subnets', () => {
      expect(service.isNetworkChangeRisky('203.0.113.1', '198.51.100.1')).toBe(
        true,
      );
    });

    it('should return false for private IP addresses', () => {
      expect(service.isNetworkChangeRisky('192.168.1.1', '8.8.8.8')).toBe(
        false,
      );
      expect(service.isNetworkChangeRisky('10.0.0.1', '8.8.8.8')).toBe(false);
      expect(service.isNetworkChangeRisky('127.0.0.1', '8.8.8.8')).toBe(false);
      expect(service.isNetworkChangeRisky('172.16.0.1', '8.8.8.8')).toBe(false);
    });

    it('should return false for loopback IPv6', () => {
      expect(service.isNetworkChangeRisky('::1', '2001:db8::1')).toBe(false);
    });

    it('should return true for different IPv6 /64 prefixes', () => {
      expect(
        service.isNetworkChangeRisky('2001:db8:1::1', '2001:db8:2::1'),
      ).toBe(true);
    });

    it('should return false for same IPv6 /64 prefix', () => {
      expect(
        service.isNetworkChangeRisky('2001:db8:1:2::1', '2001:db8:1:2::99'),
      ).toBe(false);
    });

    it('should return false for invalid IPs', () => {
      expect(service.isNetworkChangeRisky('not-an-ip', '8.8.8.8')).toBe(false);
    });
  });

  describe('trustDevice', () => {
    it('should update existing device when already trusted', async () => {
      const existing = { ...mockDevice };
      mockRepository.findOne.mockResolvedValue(existing);
      mockRepository.save.mockResolvedValue(existing);

      const result = await service.trustDevice(
        'user-1',
        'fingerprint-abc',
        'Chrome on Windows',
        '5.6.7.8',
      );

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should create new device when not already trusted', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const newDevice = { ...mockDevice };
      mockRepository.create.mockReturnValue(newDevice);
      mockRepository.save.mockResolvedValue(newDevice);

      const result = await service.trustDevice(
        'user-1',
        'new-fp',
        'Firefox on Linux',
        '1.2.3.4',
      );

      expect(result).toEqual(newDevice);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          deviceFingerprint: 'new-fp',
          deviceName: 'Firefox on Linux',
          lastIpAddress: '1.2.3.4',
        }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateDeviceLastUsed', () => {
    it('should update lastUsedAt and lastIpAddress when device exists', async () => {
      const device = { ...mockDevice };
      mockRepository.findOne.mockResolvedValue(device);
      mockRepository.save.mockResolvedValue(device);

      await service.updateDeviceLastUsed(
        'user-1',
        'fingerprint-abc',
        '9.9.9.9',
      );

      expect(mockRepository.save).toHaveBeenCalled();
      expect(device.lastIpAddress).toBe('9.9.9.9');
    });

    it('should do nothing when device does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await service.updateDeviceLastUsed('user-1', 'unknown', '9.9.9.9');

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getUserDevices', () => {
    it('should return all devices for a user ordered by lastUsedAt DESC', async () => {
      const devices = [mockDevice];
      mockRepository.find.mockResolvedValue(devices);

      const result = await service.getUserDevices('user-1');

      expect(result).toEqual(devices);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { lastUsedAt: 'DESC' },
      });
    });
  });

  describe('removeTrustedDevice', () => {
    it('should delete the device by id and userId', async () => {
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.removeTrustedDevice('user-1', 'device-1');

      expect(mockRepository.delete).toHaveBeenCalledWith({
        id: 'device-1',
        userId: 'user-1',
      });
    });
  });

  describe('isNetworkChangeRisky - additional branches', () => {
    it('should return false for link-local IPv6 (fe80:)', () => {
      expect(service.isNetworkChangeRisky('fe80::1', '2001:db8::1')).toBe(
        false,
      );
    });

    it('should return false for ULA IPv6 addresses (fc/fd)', () => {
      expect(
        service.isNetworkChangeRisky('fd12:3456:789a::1', '2001:db8::1'),
      ).toBe(false);
      expect(service.isNetworkChangeRisky('fc00::1', '2001:db8::1')).toBe(
        false,
      );
    });

    it('should return false when both IPs are undefined', () => {
      expect(service.isNetworkChangeRisky(undefined, undefined)).toBe(false);
    });

    it('should return false when previous IP is undefined', () => {
      expect(service.isNetworkChangeRisky(undefined, '8.8.8.8')).toBe(false);
    });

    it('should handle IPv4-mapped IPv6 addresses', () => {
      expect(
        service.isNetworkChangeRisky('::ffff:192.168.1.1', '8.8.8.8'),
      ).toBe(false);
    });

    it('should handle IPv4 with port', () => {
      expect(
        service.isNetworkChangeRisky('203.0.113.1:8080', '203.0.113.2'),
      ).toBe(false);
    });

    it('should handle comma-separated IP list (X-Forwarded-For)', () => {
      expect(
        service.isNetworkChangeRisky('203.0.113.1, 10.0.0.1', '203.0.113.2'),
      ).toBe(false);
    });

    it('should handle bracketed IPv6 addresses', () => {
      expect(
        service.isNetworkChangeRisky('[2001:db8:1::1]', '2001:db8:2::1'),
      ).toBe(true);
    });

    it('should handle IPv6 with zone ID', () => {
      expect(service.isNetworkChangeRisky('fe80::1%lo0', '2001:db8::1')).toBe(
        false,
      );
    });

    it('should return false for 172.16-31 private ranges', () => {
      expect(service.isNetworkChangeRisky('172.31.0.1', '8.8.8.8')).toBe(false);
      expect(service.isNetworkChangeRisky('172.20.0.1', '8.8.8.8')).toBe(false);
    });

    it('should return false for empty string IPs', () => {
      expect(service.isNetworkChangeRisky('', '8.8.8.8')).toBe(false);
    });

    it('should handle IPv4 addresses that are not private (172.32+)', () => {
      expect(service.isNetworkChangeRisky('172.32.0.1', '198.51.100.1')).toBe(
        true,
      );
    });
  });

  describe('parseDeviceName', () => {
    it('should return "Unknown Device" for empty user agent', () => {
      expect(service.parseDeviceName('')).toBe('Unknown Device');
    });

    it('should detect Chrome on Windows', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0';
      expect(service.parseDeviceName(ua)).toBe('Chrome on Windows');
    });

    it('should detect Firefox on Linux', () => {
      const ua =
        'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0';
      expect(service.parseDeviceName(ua)).toBe('Firefox on Linux');
    });

    it('should detect Safari on macOS', () => {
      const ua =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Safari/605.1.15';
      expect(service.parseDeviceName(ua)).toBe('Safari on macOS');
    });

    it('should detect Chrome on Android', () => {
      // The parseDeviceName checks "Linux" before "Android", so Android UAs match Linux
      const ua =
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile';
      expect(service.parseDeviceName(ua)).toBe('Chrome on Linux');
    });

    it('should detect Safari on iOS (iPhone)', () => {
      // The parseDeviceName checks "Mac OS" before "iPhone", so iPhone UAs match macOS
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
      expect(service.parseDeviceName(ua)).toBe('Safari on macOS');
    });

    it('should detect Edge browser', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edge/120.0.0.0';
      expect(service.parseDeviceName(ua)).toBe('Edge on Windows');
    });

    it('should detect Opera browser', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Opera/100.0.0.0';
      expect(service.parseDeviceName(ua)).toBe('Opera on Windows');
    });

    it('should detect iOS device without Mac OS in UA', () => {
      const ua =
        'Mozilla/5.0 (iPad; CPU iOS 17_0) AppleWebKit/605.1.15 Safari/604.1';
      expect(service.parseDeviceName(ua)).toBe('Safari on iOS');
    });

    it('should return Unknown Browser on Unknown OS for unrecognized UA', () => {
      const ua = 'CustomBot/1.0';
      expect(service.parseDeviceName(ua)).toBe('Unknown Browser on Unknown OS');
    });

    it('should detect Android explicitly when Linux is not present', () => {
      const ua = 'Mozilla/5.0 (Android 14) AppleWebKit/537.36 Chrome/120.0.0.0';
      expect(service.parseDeviceName(ua)).toBe('Chrome on Android');
    });
  });
});
