import { validate } from 'class-validator';
import { CreateSecretDto } from './create-secret.dto';
import { UpdateSecretDto } from './update-secret.dto';

describe('Secrets DTOs', () => {
  describe('CreateSecretDto', () => {
    it('should validate with name and value', async () => {
      const dto = Object.assign(new CreateSecretDto(), {
        name: 'my-secret',
        value: 'secret-value',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow optional description', async () => {
      const dto = Object.assign(new CreateSecretDto(), {
        name: 'my-secret',
        value: 'secret-value',
        description: 'A secret',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty name', async () => {
      const dto = Object.assign(new CreateSecretDto(), {
        name: '',
        value: 'secret-value',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateSecretDto', () => {
    it('should validate with optional fields', async () => {
      const dto = Object.assign(new UpdateSecretDto(), {
        value: 'new-value',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate empty dto', async () => {
      const dto = new UpdateSecretDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
