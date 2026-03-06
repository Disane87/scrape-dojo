import { vi } from 'vitest';
import { ScreenshotAction } from './screenshot.action';
import { createActionInstance } from 'src/_test/test-utils';
import * as fs from 'fs';

vi.mock('fs');

describe('ScreenshotAction', () => {
  let action: ScreenshotAction;

  beforeEach(() => {
    action = createActionInstance(ScreenshotAction);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(ScreenshotAction).toBeDefined();
  });

  describe('run', () => {
    it('should create screenshots directory if not exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
      (action as any).page.title.mockResolvedValue('Test Page');
      (action as any).page.screenshot.mockResolvedValue(undefined);

      await action.run();

      expect(fs.mkdirSync).toHaveBeenCalledWith('./screenshots', {
        recursive: true,
      });
    });

    it('should not create directory if already exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      (action as any).page.title.mockResolvedValue('Test Page');
      (action as any).page.screenshot.mockResolvedValue(undefined);

      await action.run();

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should take screenshot with generated filename', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      (action as any).page.title.mockResolvedValue('My Test Page!');
      (action as any).page.screenshot.mockResolvedValue(undefined);

      const result = await action.run();

      expect(result).toMatch(
        /^\.\/screenshots\/\d{8}-\d{6}-my-test-page-\.png$/,
      );
      expect((action as any).page.screenshot).toHaveBeenCalled();
    });

    it('should normalize page title in filename', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      (action as any).page.title.mockResolvedValue('Hello World 123!@#');
      (action as any).page.screenshot.mockResolvedValue(undefined);

      const result = await action.run();

      expect(result).toContain('hello-world-123---');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with timestamp and normalized title', async () => {
      const mockPage = { title: vi.fn().mockResolvedValue('Test') } as any;
      const filename = await action.generateFilename(mockPage);
      expect(filename).toMatch(/^\d{8}-\d{6}-test$/);
    });
  });
});
