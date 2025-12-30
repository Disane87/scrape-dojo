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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveAuthor', () => {
    it('should resolve GitHub user', async () => {
      const result = await service.resolveAuthor('gh:@octocat', undefined);
      expect(result.name).toBeDefined();
      expect(result.raw).toBe('gh:@octocat');
    });

    it('should resolve author with email', async () => {
      const result = await service.resolveAuthor('John Doe', 'john@example.com');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
    });

    it('should handle direct URL', async () => {
      const url = 'https://example.com/avatar.png';
      const result = await service.resolveAuthor(url, undefined);
      expect(result.avatar).toBe(url);
    });

    it('should handle plain name', async () => {
      const result = await service.resolveAuthor('John Doe', undefined);
      expect(result.name).toBe('John Doe');
    });
  });


});
