import { vi } from 'vitest';

/**
 * Creates a mock Puppeteer Page object with commonly used methods
 */
export function createMockPage() {
  return {
    waitForSelector: vi.fn(),
    $: vi.fn(),
    $$: vi.fn(),
    evaluate: vi.fn(),
    goto: vi.fn(),
    url: vi.fn().mockReturnValue('https://example.com'),
    title: vi.fn().mockReturnValue('Test Page'),
    screenshot: vi.fn(),
    type: vi.fn(),
    click: vi.fn(),
    keyboard: {
      press: vi.fn(),
      type: vi.fn(),
    },
    waitForNavigation: vi.fn(),
    setViewport: vi.fn(),
    content: vi.fn(),
    close: vi.fn(),
  };
}

/**
 * Creates a mock ScrapeLogger with all log levels
 */
export function createMockLogger() {
  return {
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    setContext: vi.fn(),
    setEventContext: vi.fn(),
  };
}

/**
 * Creates a mock ScrapeActionData object
 */
export function createMockData(overrides: Record<string, any> = {}) {
  return {
    currentData: {},
    storedData: {},
    scrapeEventsService: null,
    scrapeId: 'test-scrape',
    runId: 'test-run',
    databaseService: null,
    loopPath: null,
    skipCurrentIteration: false,
    metadata: {},
    runVariables: {},
    ...overrides,
  };
}

/**
 * Creates an action instance using Object.create pattern (bypasses BaseAction constructor).
 * Sets up page, params, data, logger, previousData, and storedData.
 */
export function createActionInstance<T>(
  ActionClass: new (...args: any[]) => T,
  overrides: {
    params?: Record<string, any>;
    data?: Record<string, any>;
    page?: any;
    logger?: any;
    previousData?: Map<string, any>;
    storedData?: Record<string, any>;
    variables?: Record<string, string>;
  } = {},
): T {
  const instance = Object.create(ActionClass.prototype) as any;
  instance.page = overrides.page || createMockPage();
  instance.params = overrides.params || {};
  instance.data = overrides.data || createMockData();
  instance.logger = overrides.logger || createMockLogger();
  instance.previousData = overrides.previousData || new Map();
  instance.storedData = overrides.storedData || {};
  instance.variables = overrides.variables || {};
  return instance as T;
}

/**
 * Creates a mock TypeORM Repository
 */
export function createMockRepository() {
  return {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneBy: vi.fn(),
    save: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    remove: vi.fn(),
    count: vi.fn(),
    createQueryBuilder: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getMany: vi.fn(),
      getOne: vi.fn(),
      getManyAndCount: vi.fn(),
    }),
  };
}
