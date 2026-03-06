import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseAction } from './base.action';
import { PreviousData } from '../../types/previous-data.type';

// Concrete test subclass to test abstract BaseAction
class TestAction extends BaseAction<Record<string, any>> {
  async run(): Promise<any> {
    return 'test-result';
  }
}

describe('BaseAction', () => {
  let mockPage: any;
  let mockActionHandlerService: any;
  let mockPuppeteerService: any;

  beforeEach(() => {
    mockPage = {};
    mockActionHandlerService = {};
    mockPuppeteerService = {};
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function createTestAction(
    params: Record<string, any>,
    previousData?: PreviousData,
    data?: any,
    storedData?: any,
    variables?: Record<string, string>,
  ) {
    const scrapeAction = {
      name: 'testAction',
      action: 'test' as any,
      params,
    };

    return new TestAction(
      mockPage,
      previousData || new Map(),
      scrapeAction,
      mockActionHandlerService,
      mockPuppeteerService,
      data,
      storedData,
      variables,
    );
  }

  it('should be defined', () => {
    const action = createTestAction({ key: 'value' });
    expect(action).toBeDefined();
  });

  it('should set name from scrapeAction', () => {
    const action = createTestAction({ key: 'value' });
    expect(action.name).toBe('testAction');
  });

  it('should copy params as originalParams', () => {
    const action = createTestAction({ url: 'https://example.com' });
    expect((action as any).originalParams).toEqual({
      url: 'https://example.com',
    });
  });

  describe('handlebars template resolution', () => {
    it('should resolve handlebars templates in params', () => {
      const previousData: PreviousData = new Map();
      previousData.set('extractedUrl', 'https://resolved.com');

      const action = createTestAction(
        { url: '{{previousData.extractedUrl}}' },
        previousData,
      );

      expect(action.params.url).toBe('https://resolved.com');
    });

    it('should skip the "template" key', () => {
      const action = createTestAction({
        template: '{{previousData.something}}',
      });

      // template key should remain unresolved
      expect(action.params.template).toBe('{{previousData.something}}');
    });

    it('should skip strings without template syntax', () => {
      const action = createTestAction({ plain: 'no-template-here' });

      expect(action.params.plain).toBe('no-template-here');
    });

    it('should resolve direct references to their original type', () => {
      const previousData: PreviousData = new Map();
      previousData.set('items', [1, 2, 3]);

      const action = createTestAction(
        { list: '{{previousData.items}}' },
        previousData,
      );

      // Direct reference should preserve the array type
      expect(Array.isArray(action.params.list)).toBe(true);
      expect(action.params.list).toEqual([1, 2, 3]);
    });

    it('should resolve direct references to objects', () => {
      const previousData: PreviousData = new Map();
      previousData.set('config', { host: 'localhost', port: 3000 });

      const action = createTestAction(
        { serverConfig: '{{ previousData.config }}' },
        previousData,
      );

      expect(action.params.serverConfig).toEqual({
        host: 'localhost',
        port: 3000,
      });
    });

    it('should coerce "true" string result to boolean true', () => {
      const previousData: PreviousData = new Map();
      previousData.set('val', 'yes');

      // Use isDefined helper which returns a boolean rendered as "true"/"false" string by Handlebars
      const action = createTestAction(
        { enabled: '{{isDefined previousData.val}}' },
        previousData,
      );

      expect(action.params.enabled).toBe(true);
    });

    it('should coerce "false" string result to boolean false', () => {
      const previousData: PreviousData = new Map();

      // isDefined on undefined value returns false, rendered as "false" string
      const action = createTestAction(
        { enabled: '{{isDefined previousData.missing}}' },
        previousData,
      );

      expect(action.params.enabled).toBe(false);
    });

    it('should resolve variables in templates', () => {
      const action = createTestAction(
        { greeting: '{{variables.name}}' },
        new Map(),
        undefined,
        undefined,
        { name: 'World' },
      );

      expect(action.params.greeting).toBe('World');
    });

    it('should resolve currentData in templates', () => {
      const action = createTestAction(
        { index: '{{currentData.loop.index}}' },
        new Map(),
        { currentData: { loop: { index: '5' } } },
      );

      expect(action.params.index).toBe('5');
    });

    it('should resolve storedData in templates', () => {
      const action = createTestAction(
        { token: '{{storedData.authToken}}' },
        new Map(),
        undefined,
        { authToken: 'abc123' },
      );

      expect(action.params.token).toBe('abc123');
    });

    it('should not modify non-string params', () => {
      const action = createTestAction({
        count: 42,
        active: true,
        items: [1, 2],
      });

      expect(action.params.count).toBe(42);
      expect(action.params.active).toBe(true);
      expect(action.params.items).toEqual([1, 2]);
    });

    it('should handle mixed resolved and plain params', () => {
      const previousData: PreviousData = new Map();
      previousData.set('host', 'example.com');

      const action = createTestAction(
        {
          url: 'https://{{previousData.host}}/api',
          method: 'GET',
          timeout: 5000,
        },
        previousData,
      );

      expect(action.params.url).toBe('https://example.com/api');
      expect(action.params.method).toBe('GET');
      expect(action.params.timeout).toBe(5000);
    });
  });

  describe('run', () => {
    it('should call the abstract run method on the concrete subclass', async () => {
      const action = createTestAction({});
      const result = await action.run();
      expect(result).toBe('test-result');
    });
  });
});
