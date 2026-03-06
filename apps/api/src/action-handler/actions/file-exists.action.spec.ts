import { vi } from 'vitest';
import { FileExistsAction } from './file-exists.action';
import { createActionInstance } from 'src/_test/test-utils';
import * as fs from 'fs';
import * as fastGlob from 'fast-glob';

vi.mock('fs');
vi.mock('fast-glob', () => ({
  glob: vi.fn(),
}));

describe('FileExistsAction', () => {
  let action: FileExistsAction;

  beforeEach(() => {
    action = createActionInstance(FileExistsAction);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(FileExistsAction).toBeDefined();
  });

  describe('run', () => {
    it('should return true when file exists', async () => {
      action.params = { path: './downloads/file.pdf' } as any;
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = await action.run();

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('./downloads/file.pdf');
    });

    it('should return false when file does not exist', async () => {
      action.params = { path: './downloads/missing.pdf' } as any;
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await action.run();

      expect(result).toBe(false);
    });

    it('should use glob when pattern is provided', async () => {
      action.params = { path: './downloads', pattern: '*.pdf' } as any;
      vi.mocked(fastGlob.glob).mockResolvedValue([
        './downloads/file1.pdf',
      ] as any);

      const result = await action.run();

      expect(result).toBe(true);
    });

    it('should return false when no glob matches found', async () => {
      action.params = { path: './downloads', pattern: '*.doc' } as any;
      vi.mocked(fastGlob.glob).mockResolvedValue([] as any);

      const result = await action.run();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      action.params = { path: './invalid' } as any;
      vi.mocked(fs.existsSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await action.run();

      expect(result).toBe(false);
      expect((action as any).logger.error).toHaveBeenCalled();
    });
  });
});
