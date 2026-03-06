import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock puppeteer-extra, stealth plugin, and fs at module level
vi.mock('puppeteer-extra', () => {
  const launch = vi.fn();
  return {
    default: { use: vi.fn(), launch },
    __esModule: true,
    use: vi.fn(),
    launch,
  };
});

vi.mock('puppeteer-extra-plugin-stealth', () => {
  return { default: vi.fn(() => ({})), __esModule: true };
});

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  accessSync: vi.fn().mockImplementation(() => {
    throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  }),
}));

import { PuppeteerService } from './puppeteer.service';

describe('PuppeteerService', () => {
  let service: PuppeteerService;

  beforeEach(() => {
    service = new PuppeteerService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('abort / resetAbort / isAborted', () => {
    it('should not be aborted initially', () => {
      expect(service.isAborted).toBe(false);
    });

    it('should set aborted flag via abort()', () => {
      service.abort();
      expect(service.isAborted).toBe(true);
    });

    it('should reset aborted flag via resetAbort()', () => {
      service.abort();
      expect(service.isAborted).toBe(true);
      service.resetAbort();
      expect(service.isAborted).toBe(false);
    });
  });

  describe('closeBrowser', () => {
    it('should close browser and clear references', async () => {
      const mockClose = vi.fn().mockResolvedValue(undefined);
      const mockBrowser = { close: mockClose } as any;
      (service as any).browser = mockBrowser;
      service.currentPage = {} as any;

      await service.closeBrowser();

      expect(mockClose).toHaveBeenCalled();
      expect((service as any).browser).toBeNull();
      expect(service.currentPage).toBeNull();
    });

    it('should do nothing if browser is null', async () => {
      (service as any).browser = null;
      await service.closeBrowser();
      // no error thrown
      expect((service as any).browser).toBeNull();
    });
  });

  describe('closeAllPages', () => {
    it('should close all pages when browser is connected', async () => {
      const mockPage1 = {
        isClosed: vi.fn().mockReturnValue(false),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockPage2 = {
        isClosed: vi.fn().mockReturnValue(false),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockBrowser = {
        isConnected: vi.fn().mockReturnValue(true),
        pages: vi.fn().mockResolvedValue([mockPage1, mockPage2]),
      };
      (service as any).browser = mockBrowser;
      service.currentPage = mockPage1 as any;

      await service.closeAllPages();

      expect(mockPage1.close).toHaveBeenCalled();
      expect(mockPage2.close).toHaveBeenCalled();
      expect(service.currentPage).toBeNull();
    });

    it('should skip already closed pages', async () => {
      const mockPage = {
        isClosed: vi.fn().mockReturnValue(true),
        close: vi.fn(),
      };
      const mockBrowser = {
        isConnected: vi.fn().mockReturnValue(true),
        pages: vi.fn().mockResolvedValue([mockPage]),
      };
      (service as any).browser = mockBrowser;

      await service.closeAllPages();

      expect(mockPage.close).not.toHaveBeenCalled();
    });

    it('should do nothing if browser is not connected', async () => {
      const mockBrowser = { isConnected: vi.fn().mockReturnValue(false) };
      (service as any).browser = mockBrowser;

      await service.closeAllPages();
      // no error thrown
    });

    it('should do nothing if browser is null', async () => {
      (service as any).browser = null;
      await service.closeAllPages();
    });

    it('should handle page close errors gracefully', async () => {
      const mockPage = {
        isClosed: vi.fn().mockReturnValue(false),
        close: vi.fn().mockRejectedValue(new Error('page error')),
      };
      const mockBrowser = {
        isConnected: vi.fn().mockReturnValue(true),
        pages: vi.fn().mockResolvedValue([mockPage]),
      };
      (service as any).browser = mockBrowser;

      await service.closeAllPages();
      expect(mockPage.close).toHaveBeenCalled();
      expect(service.currentPage).toBeNull();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close browser if it exists', async () => {
      const mockClose = vi.fn().mockResolvedValue(undefined);
      (service as any).browser = { close: mockClose };

      await service.onModuleDestroy();

      expect(mockClose).toHaveBeenCalled();
    });

    it('should do nothing if browser is null', async () => {
      (service as any).browser = null;
      await service.onModuleDestroy();
    });
  });

  describe('getBrowser', () => {
    it('should return cached browser when connected', async () => {
      const mockBrowser = { isConnected: vi.fn().mockReturnValue(true) };
      (service as any).browser = mockBrowser;

      const result = await service.getBrowser();
      expect(result).toBe(mockBrowser);
    });

    it('should throw when aborted', async () => {
      service.abort();
      await expect(service.getBrowser()).rejects.toThrow(
        'Scrape wurde abgebrochen',
      );
    });

    it('should wait for existing browserPromise', async () => {
      const mockBrowser = { isConnected: vi.fn().mockReturnValue(true) };
      const promise = Promise.resolve(mockBrowser);
      (service as any).browserPromise = promise;
      (service as any).browser = null;

      const result = await service.getBrowser();
      expect(result).toBe(mockBrowser);
    });

    it('should call setup() when no browser and no promise', async () => {
      const mockBrowser = { isConnected: vi.fn().mockReturnValue(false) };
      (service as any).browser = null;
      (service as any).browserPromise = null;

      // Mock the private setup method
      const setupMock = vi.fn().mockResolvedValue(mockBrowser);
      (service as any).setup = setupMock;

      const result = await service.getBrowser();
      expect(result).toBe(mockBrowser);
      expect(setupMock).toHaveBeenCalled();
      // browserPromise should be cleared after setup
      expect((service as any).browserPromise).toBeNull();
    });

    it('should clear browserPromise even if setup throws', async () => {
      (service as any).browser = null;
      (service as any).browserPromise = null;

      const setupMock = vi.fn().mockRejectedValue(new Error('launch failed'));
      (service as any).setup = setupMock;

      await expect(service.getBrowser()).rejects.toThrow('launch failed');
      expect((service as any).browserPromise).toBeNull();
    });
  });

  describe('isPageValid', () => {
    it('should return false if currentPage is null', () => {
      service.currentPage = null;
      expect(service.isPageValid()).toBe(false);
    });

    it('should return true if page is valid', () => {
      const mockPage = {
        mainFrame: vi.fn().mockReturnValue({ detached: false }),
        isClosed: vi.fn().mockReturnValue(false),
      };
      service.currentPage = mockPage as any;

      expect(service.isPageValid()).toBe(true);
    });

    it('should return false if frame is detached', () => {
      const mockPage = {
        mainFrame: vi.fn().mockReturnValue({ detached: true }),
        isClosed: vi.fn().mockReturnValue(false),
      };
      service.currentPage = mockPage as any;

      expect(service.isPageValid()).toBe(false);
    });

    it('should return false if page is closed', () => {
      const mockPage = {
        mainFrame: vi.fn().mockReturnValue({ detached: false }),
        isClosed: vi.fn().mockReturnValue(true),
      };
      service.currentPage = mockPage as any;

      expect(service.isPageValid()).toBe(false);
    });

    it('should return false if mainFrame() throws', () => {
      const mockPage = {
        mainFrame: vi.fn().mockImplementation(() => {
          throw new Error('Execution context destroyed');
        }),
      };
      service.currentPage = mockPage as any;

      expect(service.isPageValid()).toBe(false);
    });
  });

  describe('getValidPage', () => {
    it('should return currentPage if valid', async () => {
      const mockPage = {
        mainFrame: vi.fn().mockReturnValue({ detached: false }),
        isClosed: vi.fn().mockReturnValue(false),
      };
      service.currentPage = mockPage as any;

      const result = await service.getValidPage();
      expect(result).toBe(mockPage);
    });

    it('should create new page if current is invalid', async () => {
      service.currentPage = null;

      const newMockPage = {
        isClosed: vi.fn().mockReturnValue(false),
        setViewport: vi.fn().mockResolvedValue(undefined),
        setUserAgent: vi.fn().mockResolvedValue(undefined),
        url: vi.fn().mockReturnValue('about:blank'),
      };
      const mockBrowser = {
        isConnected: vi.fn().mockReturnValue(true),
        pages: vi.fn().mockResolvedValue([]),
        newPage: vi.fn().mockResolvedValue(newMockPage),
        on: vi.fn(),
      };
      (service as any).browser = mockBrowser;

      const result = await service.getValidPage();
      expect(result).toBe(newMockPage);
    });
  });

  describe('newPage', () => {
    const createMockPage = (overrides: any = {}) => ({
      isClosed: vi.fn().mockReturnValue(false),
      close: vi.fn().mockResolvedValue(undefined),
      setViewport: vi.fn().mockResolvedValue(undefined),
      setUserAgent: vi.fn().mockResolvedValue(undefined),
      url: vi.fn().mockReturnValue('about:blank'),
      ...overrides,
    });

    const createMockBrowser = (pages: any[] = []) => ({
      isConnected: vi.fn().mockReturnValue(true),
      pages: vi.fn().mockResolvedValue(pages),
      newPage: vi.fn().mockResolvedValue(createMockPage()),
      on: vi.fn(),
    });

    it('should reuse currentPage if not closed', async () => {
      const existingPage = createMockPage();
      service.currentPage = existingPage as any;
      const mockBrowser = createMockBrowser([existingPage]);
      (service as any).browser = mockBrowser;

      const result = await service.newPage();
      expect(result).toBe(existingPage);
    });

    it('should use existing browser page when no currentPage', async () => {
      service.currentPage = null;
      const existingPage = createMockPage();
      const mockBrowser = createMockBrowser([existingPage]);
      (service as any).browser = mockBrowser;

      const result = await service.newPage();
      expect(result).toBe(existingPage);
      expect(service.currentPage).toBe(existingPage);
    });

    it('should create new page when no pages exist', async () => {
      service.currentPage = null;
      const newPage = createMockPage();
      const mockBrowser = createMockBrowser([]);
      mockBrowser.newPage.mockResolvedValue(newPage);
      (service as any).browser = mockBrowser;

      const result = await service.newPage();
      expect(result).toBe(newPage);
      expect(mockBrowser.newPage).toHaveBeenCalled();
    });

    it('should close extra pages from session restore', async () => {
      service.currentPage = null;
      const page1 = createMockPage();
      const page2 = createMockPage();
      const page3 = createMockPage();
      const mockBrowser = createMockBrowser([page1, page2, page3]);
      (service as any).browser = mockBrowser;

      await service.newPage();

      expect(page2.close).toHaveBeenCalled();
      expect(page3.close).toHaveBeenCalled();
      expect(page1.close).not.toHaveBeenCalled();
    });

    it('should create new page if currentPage is closed', async () => {
      const closedPage = createMockPage({
        isClosed: vi.fn().mockReturnValue(true),
      });
      service.currentPage = closedPage as any;
      const newPage = createMockPage();
      const mockBrowser = createMockBrowser([closedPage]);
      // First call returns the closed page (for the isClosed check after assignment),
      // but since currentPage.isClosed() returns true, it falls through to use pages[0].
      // Then after assignment, isClosed returns true again, so it creates a new page.
      mockBrowser.newPage.mockResolvedValue(newPage);
      (service as any).browser = mockBrowser;

      const result = await service.newPage();
      expect(result).toBe(newPage);
    });

    it('should handle Target closed error during configuration', async () => {
      service.currentPage = null;
      const badPage = createMockPage({
        isClosed: vi.fn().mockReturnValue(false),
        setViewport: vi.fn().mockRejectedValue(new Error('Target closed')),
      });
      const goodPage = createMockPage();
      const mockBrowser = createMockBrowser([badPage]);
      mockBrowser.newPage.mockResolvedValue(goodPage);
      (service as any).browser = mockBrowser;

      const result = await service.newPage();
      expect(result).toBe(goodPage);
    });

    it('should rethrow non-Target-closed errors during configuration', async () => {
      service.currentPage = null;
      const badPage = createMockPage({
        isClosed: vi.fn().mockReturnValue(false),
        setViewport: vi.fn().mockRejectedValue(new Error('Something else')),
      });
      const mockBrowser = createMockBrowser([badPage]);
      (service as any).browser = mockBrowser;

      await expect(service.newPage()).rejects.toThrow('Something else');
    });

    it('should register popup blocker only once', async () => {
      service.currentPage = null;
      const page = createMockPage();
      const mockBrowser = createMockBrowser([page]);
      (service as any).browser = mockBrowser;

      await service.newPage();
      expect(mockBrowser.on).toHaveBeenCalledWith(
        'targetcreated',
        expect.any(Function),
      );

      // Second call should not register again
      mockBrowser.on.mockClear();
      service.currentPage = null;
      await service.newPage();
      expect(mockBrowser.on).not.toHaveBeenCalled();
    });
  });
});
