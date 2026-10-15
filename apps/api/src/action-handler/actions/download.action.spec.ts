import { vi } from 'vitest';

vi.mock('../../_decorators/action.decorator', () => ({
  Action: () => (constructor: any) => constructor,
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    copyFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    statSync: vi.fn().mockReturnValue({ size: 1024 }),
    openSync: vi.fn().mockReturnValue(3),
    readSync: vi.fn().mockReturnValue(0),
    closeSync: vi.fn(),
  };
});

import * as fs from 'fs';
import { DownloadAction } from './download.actions';

describe('DownloadAction', () => {
  function createAction(
    params: any,
    opts: Partial<{ scrapeId: string; pageUrl: string }> = {},
  ) {
    const action = Object.create(DownloadAction.prototype);
    action.params = params;
    action.data = { scrapeId: opts.scrapeId || 'test-scrape' };
    action.previousData = new Map();
    action.page = {
      url: vi
        .fn()
        .mockResolvedValue(opts.pageUrl || 'https://example.com/page'),
      cookies: vi.fn().mockResolvedValue([]),
      evaluate: vi.fn().mockResolvedValue([]),
    };
    action.logger = {
      log: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };
    return action as InstanceType<typeof DownloadAction>;
  }

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('expectMagic', () => {
    function bytesOf(text: string) {
      return Array.from(new Uint8Array(Buffer.from(text, 'latin1')));
    }

    it('writes the file when the remote content starts with the signature', async () => {
      const action = createAction({
        url: 'https://example.com/invoice.pdf',
        path: './downloads',
        filename: 'invoice.pdf',
        expectMagic: '%PDF',
      });
      action.page.evaluate.mockResolvedValue(bytesOf('%PDF-1.7 …'));

      const result = await action.run();

      expect(result).toBeDefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('refuses to write an HTML error page served as a PDF', async () => {
      const action = createAction({
        url: 'https://example.com/invoice.pdf',
        path: './downloads',
        filename: 'invoice.pdf',
        expectMagic: '%PDF',
      });
      action.page.evaluate.mockResolvedValue(bytesOf('<!DOCTYPE html><html>'));

      const result = await action.run();

      expect(result).toBeNull();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(action.logger.error).toHaveBeenCalled();
    });

    it('leaves behaviour unchanged when expectMagic is not set', async () => {
      const action = createAction({
        url: 'https://example.com/invoice.pdf',
        path: './downloads',
        filename: 'invoice.pdf',
      });
      action.page.evaluate.mockResolvedValue(bytesOf('<!DOCTYPE html>'));

      const result = await action.run();

      expect(result).toBeDefined();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('does not copy a local file whose signature does not match', async () => {
      const action = createAction({
        url: 'file:///tmp/invoice.pdf',
        path: './downloads',
        filename: 'invoice.pdf',
        expectMagic: '%PDF',
      });
      vi.mocked(fs.openSync).mockReturnValue(7 as never);
      vi.mocked(fs.readSync).mockImplementation(((
        _fd: number,
        buffer: Buffer,
      ) => {
        Buffer.from('<htm', 'latin1').copy(buffer);
        return 4;
      }) as never);

      const result = await action.run();

      expect(result).toBeNull();
      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });
  });

  it('should return null for empty filename', async () => {
    const action = createAction({
      url: 'https://example.com/file.pdf',
      path: './downloads',
      filename: '',
    });

    const result = await action.run();
    expect(result).toBeNull();
  });

  it('should return null for whitespace-only filename', async () => {
    const action = createAction({
      url: 'https://example.com/file.pdf',
      path: './downloads',
      filename: '   ',
    });

    const result = await action.run();
    expect(result).toBeNull();
  });

  it('should handle download errors gracefully', async () => {
    const action = createAction({
      url: 'https://example.com/file.pdf',
      path: './downloads',
      filename: 'test.pdf',
    });

    action.page.evaluate.mockRejectedValue(new Error('Network error'));

    const result = await action.run();
    expect(result).toBeNull();
    expect(action.logger.error).toHaveBeenCalled();
  });

  it('should handle local file:// URLs where source does not exist', async () => {
    const action = createAction({
      url: 'file:///tmp/test.pdf',
      path: './downloads',
      filename: 'test.pdf',
    });

    // Mock existsSync to return false for the local source file
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      if (String(p).includes('tmp')) return false;
      return true;
    });

    const result = await action.run();
    // Should return null since the source doesn't exist
    expect(result).toBeNull();
  });

  it('should successfully copy local file:// URLs when source exists', async () => {
    const action = createAction({
      url: 'file:///tmp/source.pdf',
      path: './downloads',
      filename: 'output.pdf',
    });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.copyFileSync).mockReturnValue(undefined);
    vi.mocked(fs.statSync).mockReturnValue({ size: 2048 } as any);

    const result = await action.run();

    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(fs.copyFileSync).toHaveBeenCalled();
    expect(action.logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Copied local file'),
    );
  });

  it('should successfully download remote file', async () => {
    const action = createAction({
      url: 'https://example.com/doc.pdf',
      path: './downloads',
      filename: 'doc.pdf',
    });

    const fileBytes = Array.from(new Uint8Array([0x25, 0x50, 0x44, 0x46])); // %PDF
    action.page.evaluate.mockResolvedValue(fileBytes);

    const result = await action.run();

    expect(result).toBeDefined();
    expect(result).not.toBeNull();
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(action.logger.log).toHaveBeenCalledWith(
      expect.stringContaining('Downloaded'),
    );
  });

  it('should return null when remote download returns empty buffer', async () => {
    const action = createAction({
      url: 'https://example.com/empty.pdf',
      path: './downloads',
      filename: 'empty.pdf',
    });

    action.page.evaluate.mockResolvedValue([]);

    const result = await action.run();
    expect(result).toBeNull();
  });

  it('should return null when remote download returns null', async () => {
    const action = createAction({
      url: 'https://example.com/null.pdf',
      path: './downloads',
      filename: 'null.pdf',
    });

    action.page.evaluate.mockResolvedValue(null);

    const result = await action.run();
    expect(result).toBeNull();
  });

  it('should extract filename from URL when filename is a URL', async () => {
    const action = createAction({
      url: 'https://example.com/files/report.pdf',
      path: './downloads',
      filename: 'https://cdn.example.com/path/to/report.pdf',
    });

    const fileBytes = Array.from(new Uint8Array([1, 2, 3]));
    action.page.evaluate.mockResolvedValue(fileBytes);

    const result = await action.run();

    expect(result).toBeDefined();
    // The write path should contain 'report.pdf', not the full URL
    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    expect(writeCalls[0][0]).toContain('report.pdf');
  });

  it('should extract filename from file:// URL in filename param', async () => {
    const action = createAction({
      url: 'https://example.com/files/doc.pdf',
      path: './downloads',
      filename: 'file:///tmp/local-name.pdf',
    });

    const fileBytes = Array.from(new Uint8Array([1, 2, 3]));
    action.page.evaluate.mockResolvedValue(fileBytes);

    const result = await action.run();
    expect(result).toBeDefined();
    const writeCalls = vi.mocked(fs.writeFileSync).mock.calls;
    expect(writeCalls[0][0]).toContain('local-name.pdf');
  });

  it('should create target directory if it does not exist', async () => {
    const action = createAction({
      url: 'https://example.com/file.pdf',
      path: './downloads/subdir',
      filename: 'file.pdf',
    });

    vi.mocked(fs.existsSync).mockReturnValue(false);
    const fileBytes = Array.from(new Uint8Array([1, 2, 3]));
    action.page.evaluate.mockResolvedValue(fileBytes);

    await action.run();

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), {
      recursive: true,
    });
  });

  it('should not create directory if it already exists', async () => {
    const action = createAction({
      url: 'https://example.com/file.pdf',
      path: './downloads',
      filename: 'file.pdf',
    });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    const fileBytes = Array.from(new Uint8Array([1, 2, 3]));
    action.page.evaluate.mockResolvedValue(fileBytes);

    await action.run();

    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('should organize files in scrapeId subfolder', async () => {
    const action = createAction(
      {
        url: 'https://example.com/file.pdf',
        path: './downloads',
        filename: 'file.pdf',
      },
      { scrapeId: 'my-scraper' },
    );

    vi.mocked(fs.existsSync).mockReturnValue(true);
    const fileBytes = Array.from(new Uint8Array([1, 2, 3]));
    action.page.evaluate.mockResolvedValue(fileBytes);

    const result = await action.run();

    // The path should include the scrapeId
    expect(result).toContain('my-scraper');
  });

  it('should handle no scrapeId gracefully', async () => {
    const action = createAction({
      url: 'https://example.com/file.pdf',
      path: './downloads',
      filename: 'file.pdf',
    });
    action.data = { scrapeId: undefined };

    vi.mocked(fs.existsSync).mockReturnValue(true);
    const fileBytes = Array.from(new Uint8Array([1, 2, 3]));
    action.page.evaluate.mockResolvedValue(fileBytes);

    const result = await action.run();
    expect(result).toBeDefined();
    expect(result).not.toBeNull();
  });

  describe('resolveDownloadUrl', () => {
    it('should return absolute HTTP URLs as-is', async () => {
      const action = createAction({ url: '', path: '', filename: '' });
      const result = await (action as any).resolveDownloadUrl(
        'https://example.com/file.pdf',
      );
      expect(result).toBe('https://example.com/file.pdf');
    });

    it('should return file:// URLs as-is', async () => {
      const action = createAction({ url: '', path: '', filename: '' });
      const result = await (action as any).resolveDownloadUrl(
        'file:///tmp/test.pdf',
      );
      expect(result).toBe('file:///tmp/test.pdf');
    });

    it('should resolve scheme-relative URLs', async () => {
      const action = createAction(
        { url: '', path: '', filename: '' },
        { pageUrl: 'https://example.com/page' },
      );
      const result = await (action as any).resolveDownloadUrl(
        '//cdn.example.com/file.pdf',
      );
      expect(result).toBe('https://cdn.example.com/file.pdf');
    });

    it('should resolve relative URLs against page URL', async () => {
      const action = createAction(
        { url: '', path: '', filename: '' },
        { pageUrl: 'https://example.com/dir/page' },
      );
      const result = await (action as any).resolveDownloadUrl('file.pdf');
      expect(result).toBe('https://example.com/dir/file.pdf');
    });

    it('should return falsy input as-is', async () => {
      const action = createAction({ url: '', path: '', filename: '' });
      const result = await (action as any).resolveDownloadUrl('');
      expect(result).toBe('');
    });
  });
});
