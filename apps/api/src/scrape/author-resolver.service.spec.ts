import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorResolverService } from './author-resolver.service';

describe('AuthorResolverService', () => {
  let service: AuthorResolverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthorResolverService],
    }).compile();

    service = module.get<AuthorResolverService>(AuthorResolverService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveAuthor', () => {
    it('should return Unknown for empty author string', async () => {
      const result = await service.resolveAuthor('', undefined);
      expect(result.name).toBe('Unknown');
      expect(result.raw).toBe('');
    });

    it('should return Unknown for null/undefined author string', async () => {
      const result = await service.resolveAuthor(null as any, undefined);
      expect(result.name).toBe('Unknown');
    });

    it('should resolve GitHub user with gh:@username format', async () => {
      // Mock the global fetch to return a GitHub user
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          login: 'octocat',
          name: 'The Octocat',
          avatar_url: 'https://github.com/images/octocat.png',
          html_url: 'https://github.com/octocat',
          email: null,
        }),
      } as Response);

      const result = await service.resolveAuthor('gh:@octocat', undefined);
      expect(result.name).toBe('The Octocat');
      expect(result.avatar).toBe('https://github.com/images/octocat.png');
      expect(result.url).toBe('https://github.com/octocat');
      expect(result.raw).toBe('gh:@octocat');
    });

    it('should resolve GitHub user with gh:username format (no @)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          login: 'testuser',
          name: null,
          avatar_url: 'https://github.com/images/testuser.png',
          html_url: 'https://github.com/testuser',
          email: 'test@gh.com',
        }),
      } as Response);

      const result = await service.resolveAuthor('gh:testuser', undefined);
      expect(result.name).toBe('testuser'); // Falls back to login when name is null
      expect(result.email).toBe('test@gh.com');
      expect(result.raw).toBe('gh:testuser');
    });

    it('should handle GitHub API returning non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
      } as Response);

      const result = await service.resolveAuthor('gh:@nonexistent', undefined);
      expect(result.name).toBe('nonexistent');
      expect(result.raw).toBe('gh:@nonexistent');
      expect(result.avatar).toBeUndefined();
    });

    it('should handle GitHub API fetch errors', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new Error('Network error'),
      );

      const result = await service.resolveAuthor('gh:@failuser', undefined);
      expect(result.name).toBe('failuser');
      expect(result.raw).toBe('gh:@failuser');
    });

    it('should handle direct HTTP URL', async () => {
      const url = 'https://example.com/avatar.png';
      const result = await service.resolveAuthor(url, undefined);
      expect(result.avatar).toBe(url);
      expect(result.name).toBe('Unknown');
      expect(result.raw).toBe(url);
    });

    it('should handle direct http:// URL (non-https)', async () => {
      const url = 'http://example.com/img.jpg';
      const result = await service.resolveAuthor(url, undefined);
      expect(result.avatar).toBe(url);
      expect(result.name).toBe('Unknown');
    });

    it('should resolve email address to Gravatar', async () => {
      const result = await service.resolveAuthor('test@example.com', undefined);
      expect(result.name).toBe('test');
      expect(result.email).toBe('test@example.com');
      expect(result.avatar).toContain('gravatar.com/avatar/');
      expect(result.raw).toBe('test@example.com');
    });

    it('should handle plain name', async () => {
      const result = await service.resolveAuthor('John Doe', undefined);
      expect(result.name).toBe('John Doe');
      expect(result.raw).toBe('John Doe');
      expect(result.avatar).toBeUndefined();
      expect(result.email).toBeUndefined();
    });

    it('should handle plain name with separate email', async () => {
      const result = await service.resolveAuthor(
        'John Doe',
        'john@example.com',
      );
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.avatar).toContain('gravatar.com/avatar/');
    });

    it('should ignore invalid email when provided separately', async () => {
      const result = await service.resolveAuthor('John Doe', 'not-an-email');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBeUndefined();
      expect(result.avatar).toBeUndefined();
    });

    it('should use cache on second call with same arguments', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          login: 'cached',
          name: 'Cached User',
          avatar_url: 'https://example.com/cached.png',
          html_url: 'https://github.com/cached',
          email: null,
        }),
      } as Response);

      const first = await service.resolveAuthor('gh:@cached', undefined);
      const second = await service.resolveAuthor('gh:@cached', undefined);

      expect(first).toBe(second); // Same reference from cache
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('should cache separately for different email arguments', async () => {
      const result1 = await service.resolveAuthor('John', 'john@a.com');
      const result2 = await service.resolveAuthor('John', 'john@b.com');

      // Different cache keys, so different results
      expect(result1.email).toBe('john@a.com');
      expect(result2.email).toBe('john@b.com');
    });
  });

  describe('resolveMetadata', () => {
    it('should return undefined for undefined metadata', async () => {
      const result = await service.resolveMetadata(undefined);
      expect(result).toBeUndefined();
    });

    it('should return metadata without author when no author specified', async () => {
      const metadata = { description: 'A test scrape' } as any;
      const result = await service.resolveMetadata(metadata);

      expect(result).toBeDefined();
      expect(result!.author).toBeUndefined();
      expect(result!.description).toBe('A test scrape');
    });

    it('should resolve author in metadata', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          login: 'octocat',
          name: 'Octocat',
          avatar_url: 'https://example.com/octocat.png',
          html_url: 'https://github.com/octocat',
          email: null,
        }),
      } as Response);

      const metadata = { author: 'gh:@octocat', description: 'test' } as any;
      const result = await service.resolveMetadata(metadata);

      expect(result).toBeDefined();
      expect(result!.author).toBeDefined();
      expect(result!.author!.name).toBe('Octocat');
    });

    it('should pass email from metadata to resolveAuthor', async () => {
      const metadata = { author: 'John Doe', email: 'john@example.com' } as any;
      const result = await service.resolveMetadata(metadata);

      expect(result!.author!.name).toBe('John Doe');
      expect(result!.author!.email).toBe('john@example.com');
    });

    it('should preserve other metadata properties', async () => {
      const metadata = {
        author: 'Test Author',
        description: 'My description',
        version: '1.0',
        tags: ['web', 'scraper'],
      } as any;
      const result = await service.resolveMetadata(metadata);

      expect(result!.description).toBe('My description');
      expect(result!.version).toBe('1.0');
      expect(result!.tags).toEqual(['web', 'scraper']);
    });
  });
});
