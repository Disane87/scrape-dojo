import { SecretRedactionService } from './secret-redaction.service';

describe('SecretRedactionService', () => {
  let service: SecretRedactionService;

  beforeEach(() => {
    service = new SecretRedactionService();
  });

  describe('registerSecret', () => {
    it('should register a secret value', () => {
      service.registerSecret('my-secret-password');
      expect(service.hasSecrets()).toBe(true);
    });

    it('should ignore empty strings', () => {
      service.registerSecret('');
      expect(service.hasSecrets()).toBe(false);
    });

    it('should ignore very short strings (< 2 chars)', () => {
      service.registerSecret('x');
      expect(service.hasSecrets()).toBe(false);
    });

    it('should accept strings with 2+ characters', () => {
      service.registerSecret('ab');
      expect(service.hasSecrets()).toBe(true);
    });
  });

  describe('redact', () => {
    it('should replace registered secret values with ***', () => {
      service.registerSecret('super-secret');
      expect(service.redact('Password is super-secret here')).toBe(
        'Password is *** here',
      );
    });

    it('should replace multiple occurrences', () => {
      service.registerSecret('password123');
      expect(service.redact('value=password123&confirm=password123')).toBe(
        'value=***&confirm=***',
      );
    });

    it('should replace multiple different secrets', () => {
      service.registerSecret('user@example.com');
      service.registerSecret('P@ssw0rd!');
      expect(service.redact('Login: user@example.com / P@ssw0rd!')).toBe(
        'Login: *** / ***',
      );
    });

    it('should return message unchanged when no secrets registered', () => {
      const message = 'No secrets here';
      expect(service.redact(message)).toBe(message);
    });

    it('should return message unchanged when secret not found', () => {
      service.registerSecret('other-secret');
      const message = 'No match here';
      expect(service.redact(message)).toBe(message);
    });

    it('should handle secrets in JSON strings', () => {
      service.registerSecret('my-api-key-123');
      const json = '{"apiKey":"my-api-key-123","name":"test"}';
      expect(service.redact(json)).toBe('{"apiKey":"***","name":"test"}');
    });
  });

  describe('redactObject', () => {
    it('should redact string values in objects', () => {
      service.registerSecret('secret-value');
      const obj = { key: 'secret-value', other: 'safe' };
      expect(service.redactObject(obj)).toEqual({
        key: '***',
        other: 'safe',
      });
    });

    it('should redact nested objects', () => {
      service.registerSecret('deep-secret');
      const obj = { level1: { level2: 'deep-secret' } };
      expect(service.redactObject(obj)).toEqual({
        level1: { level2: '***' },
      });
    });

    it('should redact arrays', () => {
      service.registerSecret('array-secret');
      const arr = ['safe', 'array-secret', 'also-safe'];
      expect(service.redactObject(arr)).toEqual(['safe', '***', 'also-safe']);
    });

    it('should handle null and undefined', () => {
      expect(service.redactObject(null)).toBeNull();
      expect(service.redactObject(undefined)).toBeUndefined();
    });

    it('should preserve non-string values', () => {
      service.registerSecret('secret');
      const obj = { count: 42, active: true, name: 'secret' };
      expect(service.redactObject(obj)).toEqual({
        count: 42,
        active: true,
        name: '***',
      });
    });

    it('should redact secrets embedded in longer strings', () => {
      service.registerSecret('token123');
      const obj = { url: 'https://api.example.com?token=token123&foo=bar' };
      expect(service.redactObject(obj)).toEqual({
        url: 'https://api.example.com?token=***&foo=bar',
      });
    });
  });

  describe('clear', () => {
    it('should remove all registered secrets', () => {
      service.registerSecret('secret1');
      service.registerSecret('secret2');
      expect(service.hasSecrets()).toBe(true);

      service.clear();
      expect(service.hasSecrets()).toBe(false);
      expect(service.redact('secret1 and secret2')).toBe('secret1 and secret2');
    });
  });
});
