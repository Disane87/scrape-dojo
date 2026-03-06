import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { SecretsController } from './secrets.controller';
import { SecretsService } from './secrets.service';

describe('SecretsController', () => {
  let controller: SecretsController;
  let secretsService: {
    listSecrets: ReturnType<typeof vi.fn>;
    getSecret: ReturnType<typeof vi.fn>;
    createSecret: ReturnType<typeof vi.fn>;
    updateSecret: ReturnType<typeof vi.fn>;
    deleteSecret: ReturnType<typeof vi.fn>;
    linkToWorkflow: ReturnType<typeof vi.fn>;
    unlinkFromWorkflow: ReturnType<typeof vi.fn>;
  };

  const mockSecretListItem = {
    id: 'secret-1',
    name: 'test-secret',
    description: 'A test secret',
    createdAt: 1000,
    updatedAt: 2000,
    maskedValue: '********',
  };

  beforeEach(async () => {
    secretsService = {
      listSecrets: vi.fn(),
      getSecret: vi.fn(),
      createSecret: vi.fn(),
      updateSecret: vi.fn(),
      deleteSecret: vi.fn(),
      linkToWorkflow: vi.fn(),
      unlinkFromWorkflow: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecretsController],
      providers: [{ provide: SecretsService, useValue: secretsService }],
    }).compile();

    controller = module.get<SecretsController>(SecretsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listSecrets', () => {
    it('should return all secrets', async () => {
      const secrets = [mockSecretListItem];
      secretsService.listSecrets.mockResolvedValue(secrets);

      const result = await controller.listSecrets();

      expect(result).toEqual(secrets);
      expect(secretsService.listSecrets).toHaveBeenCalledOnce();
    });

    it('should return empty array when no secrets exist', async () => {
      secretsService.listSecrets.mockResolvedValue([]);

      const result = await controller.listSecrets();

      expect(result).toEqual([]);
    });
  });

  describe('getSecret', () => {
    it('should return a secret by id', async () => {
      secretsService.getSecret.mockResolvedValue(mockSecretListItem);

      const result = await controller.getSecret('secret-1');

      expect(result).toEqual(mockSecretListItem);
      expect(secretsService.getSecret).toHaveBeenCalledWith('secret-1');
    });

    it('should throw 404 if secret not found', async () => {
      secretsService.getSecret.mockResolvedValue(null);

      await expect(controller.getSecret('nonexistent')).rejects.toThrow(
        new HttpException('Secret not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('createSecret', () => {
    it('should create a secret', async () => {
      secretsService.createSecret.mockResolvedValue(mockSecretListItem);

      const result = await controller.createSecret({
        name: 'test-secret',
        value: 'secret-value',
        description: 'A test secret',
      });

      expect(result).toEqual(mockSecretListItem);
      expect(secretsService.createSecret).toHaveBeenCalledWith(
        'test-secret',
        'secret-value',
        'A test secret',
      );
    });

    it('should throw 400 when service throws an error', async () => {
      secretsService.createSecret.mockRejectedValue(
        new Error('Secret with name "test-secret" already exists'),
      );

      await expect(
        controller.createSecret({ name: 'test-secret', value: 'val' }),
      ).rejects.toThrow(
        new HttpException(
          'Secret with name "test-secret" already exists',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw 400 with generic message for non-Error throws', async () => {
      secretsService.createSecret.mockRejectedValue('something went wrong');

      await expect(
        controller.createSecret({ name: 'x', value: 'y' }),
      ).rejects.toThrow(
        new HttpException('Failed to create secret', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('updateSecret', () => {
    it('should update a secret', async () => {
      const updated = { ...mockSecretListItem, name: 'updated-name' };
      secretsService.updateSecret.mockResolvedValue(updated);

      const result = await controller.updateSecret('secret-1', {
        name: 'updated-name',
      });

      expect(result).toEqual(updated);
      expect(secretsService.updateSecret).toHaveBeenCalledWith('secret-1', {
        name: 'updated-name',
      });
    });

    it('should throw 404 if secret not found on update', async () => {
      secretsService.updateSecret.mockResolvedValue(null);

      await expect(
        controller.updateSecret('nonexistent', { name: 'new' }),
      ).rejects.toThrow(
        new HttpException('Secret not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should throw 400 for other errors during update', async () => {
      secretsService.updateSecret.mockRejectedValue(
        new Error('Duplicate name'),
      );

      await expect(
        controller.updateSecret('secret-1', { name: 'dup' }),
      ).rejects.toThrow(
        new HttpException('Duplicate name', HttpStatus.BAD_REQUEST),
      );
    });

    it('should re-throw HttpException as-is', async () => {
      secretsService.updateSecret.mockRejectedValue(
        new HttpException('Secret not found', HttpStatus.NOT_FOUND),
      );

      await expect(
        controller.updateSecret('secret-1', { name: 'x' }),
      ).rejects.toThrow(
        new HttpException('Secret not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('deleteSecret', () => {
    it('should delete a secret and return success', async () => {
      secretsService.deleteSecret.mockResolvedValue(true);

      const result = await controller.deleteSecret('secret-1');

      expect(result).toEqual({ success: true });
      expect(secretsService.deleteSecret).toHaveBeenCalledWith('secret-1');
    });

    it('should throw 404 if secret not found on delete', async () => {
      secretsService.deleteSecret.mockResolvedValue(false);

      await expect(controller.deleteSecret('nonexistent')).rejects.toThrow(
        new HttpException('Secret not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('linkToWorkflow', () => {
    it('should link a secret to a workflow', async () => {
      secretsService.linkToWorkflow.mockResolvedValue(undefined);

      const result = await controller.linkToWorkflow('secret-1', 'workflow-1');

      expect(result).toEqual({ success: true });
      expect(secretsService.linkToWorkflow).toHaveBeenCalledWith(
        'secret-1',
        'workflow-1',
      );
    });

    it('should throw 400 when link fails', async () => {
      secretsService.linkToWorkflow.mockRejectedValue(
        new Error('Secret secret-1 not found'),
      );

      await expect(
        controller.linkToWorkflow('secret-1', 'workflow-1'),
      ).rejects.toThrow(
        new HttpException('Secret secret-1 not found', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('unlinkFromWorkflow', () => {
    it('should unlink a secret from a workflow', async () => {
      secretsService.unlinkFromWorkflow.mockResolvedValue(undefined);

      const result = await controller.unlinkFromWorkflow(
        'secret-1',
        'workflow-1',
      );

      expect(result).toEqual({ success: true });
      expect(secretsService.unlinkFromWorkflow).toHaveBeenCalledWith(
        'secret-1',
        'workflow-1',
      );
    });
  });
});
