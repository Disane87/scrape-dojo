import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { ApiKeyEntity } from '../entities/api-key.entity';
import { UserService } from './user.service';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepository: Repository<ApiKeyEntity>,
    private readonly userService: UserService,
  ) {}

  async listForUser(userId: string): Promise<ApiKeyEntity[]> {
    return this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createForUser(
    userId: string,
    name: string,
  ): Promise<{ apiKey: string; entity: ApiKeyEntity }> {
    const apiKey = this.generateApiKey();
    const keyHash = this.hashApiKey(apiKey);
    const keyPrefix = apiKey.slice(0, 12);

    const entity = this.apiKeyRepository.create({
      id: uuidv4(),
      userId,
      name,
      keyPrefix,
      keyHash,
      lastUsedAt: null,
      revokedAt: null,
    });

    await this.apiKeyRepository.save(entity);

    return { apiKey, entity };
  }

  async revokeForUser(userId: string, apiKeyId: string): Promise<void> {
    await this.apiKeyRepository.update(
      { id: apiKeyId, userId },
      { revokedAt: Date.now() },
    );
  }

  async validateApiKey(apiKey: string): Promise<UserEntity | null> {
    const keyHash = this.hashApiKey(apiKey);

    const match = await this.apiKeyRepository.findOne({
      where: { keyHash, revokedAt: IsNull() },
    });

    if (!match) {
      return null;
    }

    await this.apiKeyRepository.update(
      { id: match.id },
      { lastUsedAt: Date.now() },
    );

    const user = await this.userService.findById(match.userId);
    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  private generateApiKey(): string {
    const random = crypto.randomBytes(24).toString('hex');
    return `sdj_${random}`;
  }

  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}
