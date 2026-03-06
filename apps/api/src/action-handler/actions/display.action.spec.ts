import { vi } from 'vitest';
import { DisplayAction } from './display.action';
import { createActionInstance } from 'src/_test/test-utils';

describe('DisplayAction', () => {
  let action: DisplayAction;

  beforeEach(() => {
    action = createActionInstance(DisplayAction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(DisplayAction).toBeDefined();
  });

  describe('run', () => {
    it('should create artifact with auto-detected text type for string', async () => {
      action.params = { data: 'hello world' } as any;
      const result = await action.run();
      expect(result.type).toBe('text');
      expect(result.data).toBe('hello world');
      expect(result.metadata.dataType).toBe('string');
    });

    it('should auto-detect json type for objects', async () => {
      action.params = { data: { key: 'value' } } as any;
      const result = await action.run();
      expect(result.type).toBe('json');
      expect(result.metadata.itemCount).toBe(1);
    });

    it('should auto-detect table type for array of objects', async () => {
      action.params = { data: [{ a: 1 }, { a: 2 }] } as any;
      const result = await action.run();
      expect(result.type).toBe('table');
      expect(result.metadata.itemCount).toBe(2);
    });

    it('should auto-detect json type for array of primitives', async () => {
      action.params = { data: [1, 2, 3] } as any;
      const result = await action.run();
      expect(result.type).toBe('json');
    });

    it('should auto-detect image type for image paths', async () => {
      action.params = { data: 'photo.png' } as any;
      const result = await action.run();
      expect(result.type).toBe('image');
    });

    it('should auto-detect file type for pdf paths', async () => {
      action.params = { data: 'document.pdf' } as any;
      const result = await action.run();
      expect(result.type).toBe('file');
    });

    it('should auto-detect link type for URLs', async () => {
      action.params = { data: 'https://example.com' } as any;
      const result = await action.run();
      expect(result.type).toBe('link');
    });

    it('should auto-detect json type for JSON strings', async () => {
      action.params = { data: '{"key":"value"}' } as any;
      const result = await action.run();
      expect(result.type).toBe('json');
    });

    it('should auto-detect text type for null', async () => {
      action.params = { data: null } as any;
      const result = await action.run();
      expect(result.type).toBe('text');
    });

    it('should auto-detect text type for numbers', async () => {
      action.params = { data: 42 } as any;
      const result = await action.run();
      expect(result.type).toBe('text');
    });

    it('should use explicit type when not auto', async () => {
      action.params = { data: 'hello', type: 'json' } as any;
      const result = await action.run();
      expect(result.type).toBe('json');
    });

    it('should include title and description', async () => {
      action.params = {
        data: 'test',
        title: 'My Title',
        description: 'My Desc',
      } as any;
      const result = await action.run();
      expect(result.title).toBe('My Title');
      expect(result.description).toBe('My Desc');
    });

    it('should render handlebars template for card type', async () => {
      action.params = {
        data: { name: 'World' },
        type: 'card',
        template: 'Hello {{name}}',
      } as any;
      const result = await action.run();
      expect(result.type).toBe('card');
      expect(result.template).toBe('Hello World');
    });

    it('should include flush property', async () => {
      action.params = { data: 'test', flush: true } as any;
      const result = await action.run();
      expect(result.flush).toBe(true);
    });
  });
});
