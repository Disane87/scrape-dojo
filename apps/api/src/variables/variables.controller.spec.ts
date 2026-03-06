import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { VariablesController } from './variables.controller';
import { VariablesService } from './variables.service';
import { ScrapeService } from '../scrape/scrape.service';

describe('VariablesController', () => {
  let controller: VariablesController;
  let variablesService: {
    getAll: ReturnType<typeof vi.fn>;
    getGlobal: ReturnType<typeof vi.fn>;
    getByWorkflow: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let scrapeService: {
    getScrapeDefinitions: ReturnType<typeof vi.fn>;
  };

  const mockVariable = {
    id: 'var-1',
    name: 'testVar',
    value: 'testValue',
    description: 'A test variable',
    scope: 'global' as const,
    createdAt: 1000,
    updatedAt: 2000,
  };

  const mockVariableListItem = {
    id: 'var-1',
    name: 'testVar',
    value: 'testValue',
    description: 'A test variable',
    scope: 'global' as const,
    createdAt: 1000,
    updatedAt: 2000,
  };

  beforeEach(async () => {
    variablesService = {
      getAll: vi.fn(),
      getGlobal: vi.fn(),
      getByWorkflow: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    scrapeService = {
      getScrapeDefinitions: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VariablesController],
      providers: [
        { provide: VariablesService, useValue: variablesService },
        { provide: ScrapeService, useValue: scrapeService },
      ],
    }).compile();

    controller = module.get<VariablesController>(VariablesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAll', () => {
    it('should return all variables without filters', async () => {
      variablesService.getAll.mockResolvedValue([mockVariableListItem]);

      const result = await controller.getAll();

      expect(result).toEqual([mockVariableListItem]);
      expect(variablesService.getAll).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
    });

    it('should pass scope filter', async () => {
      variablesService.getAll.mockResolvedValue([mockVariableListItem]);

      await controller.getAll('global');

      expect(variablesService.getAll).toHaveBeenCalledWith('global', undefined);
    });

    it('should pass scope and workflowId filters', async () => {
      variablesService.getAll.mockResolvedValue([]);

      await controller.getAll('workflow', 'wf-1');

      expect(variablesService.getAll).toHaveBeenCalledWith('workflow', 'wf-1');
    });
  });

  describe('getGlobal', () => {
    it('should return global variables', async () => {
      variablesService.getGlobal.mockResolvedValue([mockVariableListItem]);

      const result = await controller.getGlobal();

      expect(result).toEqual([mockVariableListItem]);
      expect(variablesService.getGlobal).toHaveBeenCalledOnce();
    });
  });

  describe('getWorkflowDefinitions', () => {
    it('should return workflow variable definitions', async () => {
      scrapeService.getScrapeDefinitions.mockReturnValue([
        {
          id: 'scrape-1',
          metadata: {
            variables: [{ name: 'user', type: 'string' }],
          },
        },
        {
          id: 'scrape-2',
          metadata: {},
        },
        {
          id: 'scrape-3',
          metadata: {
            variables: [],
          },
        },
      ]);

      const result = await controller.getWorkflowDefinitions();

      expect(result).toEqual([
        {
          workflowId: 'scrape-1',
          variables: [{ name: 'user', type: 'string' }],
        },
      ]);
    });

    it('should return empty array when no scrapes have variables', async () => {
      scrapeService.getScrapeDefinitions.mockReturnValue([
        { id: 'scrape-1', metadata: {} },
      ]);

      const result = await controller.getWorkflowDefinitions();

      expect(result).toEqual([]);
    });
  });

  describe('getByWorkflow', () => {
    it('should return variables for a workflow', async () => {
      const workflowVar = {
        ...mockVariableListItem,
        scope: 'workflow' as const,
        workflowId: 'wf-1',
      };
      variablesService.getByWorkflow.mockResolvedValue([workflowVar]);

      const result = await controller.getByWorkflow('wf-1');

      expect(result).toEqual([workflowVar]);
      expect(variablesService.getByWorkflow).toHaveBeenCalledWith('wf-1');
    });
  });

  describe('getById', () => {
    it('should return a variable by id', async () => {
      variablesService.getById.mockResolvedValue(mockVariable);

      const result = await controller.getById('var-1');

      expect(result).toEqual(mockVariable);
      expect(variablesService.getById).toHaveBeenCalledWith('var-1');
    });

    it('should throw 404 if variable not found', async () => {
      variablesService.getById.mockResolvedValue(undefined);

      await expect(controller.getById('nonexistent')).rejects.toThrow(
        new HttpException('Variable not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('create', () => {
    it('should create a variable', async () => {
      variablesService.create.mockResolvedValue(mockVariable);

      const dto = {
        name: 'testVar',
        value: 'testValue',
        scope: 'global' as const,
      };

      const result = await controller.create(dto);

      expect(result).toEqual(mockVariable);
      expect(variablesService.create).toHaveBeenCalledWith(dto);
    });

    it('should throw 400 when create throws a sync error', async () => {
      variablesService.create.mockImplementation(() => {
        throw new Error('Variable "testVar" already exists in this scope');
      });

      await expect(
        controller.create({
          name: 'testVar',
          value: 'val',
          scope: 'global' as const,
        }),
      ).rejects.toThrow(
        new HttpException(
          'Variable "testVar" already exists in this scope',
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('update', () => {
    it('should update a variable', async () => {
      const updated = { ...mockVariable, value: 'newValue' };
      variablesService.update.mockResolvedValue(updated);

      const result = await controller.update('var-1', { value: 'newValue' });

      expect(result).toEqual(updated);
      expect(variablesService.update).toHaveBeenCalledWith('var-1', {
        value: 'newValue',
      });
    });

    it('should throw 404 when update throws a sync error', async () => {
      variablesService.update.mockImplementation(() => {
        throw new Error('Variable not found');
      });

      await expect(
        controller.update('nonexistent', { value: 'x' }),
      ).rejects.toThrow(
        new HttpException('Variable not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('delete', () => {
    it('should delete a variable and return success', async () => {
      variablesService.delete.mockResolvedValue(true);

      const result = await controller.delete('var-1');

      expect(result).toEqual({ success: true });
      expect(variablesService.delete).toHaveBeenCalledWith('var-1');
    });

    it('should throw 404 if variable not found on delete', async () => {
      variablesService.delete.mockResolvedValue(false);

      await expect(controller.delete('nonexistent')).rejects.toThrow(
        new HttpException('Variable not found', HttpStatus.NOT_FOUND),
      );
    });
  });
});
