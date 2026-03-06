import { vi } from 'vitest';
import { ActionFactory } from './action.factory';

describe('ActionFactory', () => {
  let factory: ActionFactory;
  let mockPuppeteerService: any;

  beforeEach(() => {
    mockPuppeteerService = {};
    factory = new ActionFactory(mockPuppeteerService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('create', () => {
    it('should create an action instance from registered action', () => {
      const mockInstance = { run: vi.fn() };
      // Use a real constructor function so `new` works
      const constructorSpy = vi.fn().mockImplementation(function () {
        return mockInstance;
      });
      const MockActionClass = constructorSpy as any;
      // Make it constructable
      MockActionClass.prototype = {};

      const registeredAction = {
        name: 'testAction',
        actionClass: MockActionClass,
      };
      const context = {
        page: {},
        previousData: new Map(),
        scrapeAction: { name: 'test', action: 'testAction', params: {} },
        services: null,
        data: {},
        storedData: {},
        variables: {},
      };
      const mockActionHandlerService = {};

      const result = factory.create(
        registeredAction as any,
        context as any,
        mockActionHandlerService as any,
      );

      expect(constructorSpy).toHaveBeenCalledWith(
        context.page,
        context.previousData,
        context.scrapeAction,
        mockActionHandlerService,
        mockPuppeteerService,
        context.data,
        context.storedData,
        context.variables,
      );
      expect(result).toBe(mockInstance);
    });
  });

  describe('createWithDependencies', () => {
    it('should create action instance from class directly', () => {
      const mockInstance = { run: vi.fn() };
      const constructorSpy = vi.fn().mockImplementation(function () {
        return mockInstance;
      });
      const MockActionClass = constructorSpy as any;
      MockActionClass.prototype = {};

      const context = {
        page: {},
        previousData: new Map(),
        scrapeAction: { name: 'test', action: 'testAction', params: {} },
        services: null,
        data: {},
        storedData: {},
        variables: {},
      };

      const result = factory.createWithDependencies(
        MockActionClass,
        context as any,
        {} as any,
      );

      expect(result).toBe(mockInstance);
    });
  });
});
