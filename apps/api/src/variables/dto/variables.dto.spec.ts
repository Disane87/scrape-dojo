import { validate } from 'class-validator';
import { CreateVariableDto } from './create-variable.dto';
import { UpdateVariableDto } from './update-variable.dto';

describe('Variables DTOs', () => {
  describe('CreateVariableDto', () => {
    it('should validate global variable', async () => {
      const dto = Object.assign(new CreateVariableDto(), {
        name: 'myVar',
        value: 'myValue',
        scope: 'global',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate workflow variable with workflowId', async () => {
      const dto = Object.assign(new CreateVariableDto(), {
        name: 'myVar',
        value: 'myValue',
        scope: 'workflow',
        workflowId: 'wf-1',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid scope', async () => {
      const dto = Object.assign(new CreateVariableDto(), {
        name: 'myVar',
        value: 'myValue',
        scope: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateVariableDto', () => {
    it('should validate with optional fields', async () => {
      const dto = Object.assign(new UpdateVariableDto(), {
        value: 'newValue',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate empty dto', async () => {
      const dto = new UpdateVariableDto();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
