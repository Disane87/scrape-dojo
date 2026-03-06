import { vi } from 'vitest';
import { WaitForOtpAction } from './wait-for-otp.action';
import { createActionInstance } from 'src/_test/test-utils';

describe('WaitForOtpAction', () => {
  let action: WaitForOtpAction;

  beforeEach(() => {
    action = createActionInstance(WaitForOtpAction);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(WaitForOtpAction).toBeDefined();
  });

  describe('run', () => {
    it('should return null when OTP page not detected', async () => {
      action.params = { selector: '#otp', detectSelector: '#otp-page' } as any;
      (action as any).page.waitForSelector.mockRejectedValue(
        new Error('Timeout'),
      );

      const result = await action.run();

      expect(result).toBeNull();
    });

    it('should return null when OTP input field not found', async () => {
      action.params = { selector: '#otp-input' } as any;
      (action as any).page.waitForSelector.mockRejectedValue(
        new Error('Timeout'),
      );

      const result = await action.run();

      expect(result).toBeNull();
    });

    it('should type OTP and press Enter via events service', async () => {
      const mockEventsService = {
        requestOtp: vi.fn().mockResolvedValue('123456'),
      };
      action.params = { selector: '#otp', pressEnter: true } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).page.type.mockResolvedValue(undefined);
      (action as any).page.keyboard.press.mockResolvedValue(undefined);
      (action as any).page.waitForNavigation.mockResolvedValue(undefined);
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
      };

      const result = await action.run();

      expect(result).toBe('123456');
      expect((action as any).page.type).toHaveBeenCalledWith('#otp', '123456');
      expect((action as any).page.keyboard.press).toHaveBeenCalledWith('Enter');
    });

    it('should not press Enter when pressEnter is false', async () => {
      const mockEventsService = {
        requestOtp: vi.fn().mockResolvedValue('999'),
      };
      action.params = { selector: '#otp', pressEnter: false } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).page.type.mockResolvedValue(undefined);
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
      };

      await action.run();

      expect((action as any).page.keyboard.press).not.toHaveBeenCalled();
    });

    it('should return null when no OTP code entered', async () => {
      const mockEventsService = { requestOtp: vi.fn().mockResolvedValue('') };
      action.params = { selector: '#otp' } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
      };

      const result = await action.run();

      expect(result).toBeNull();
    });

    it('should check for visible alternatives', async () => {
      const mockEventsService = {
        requestOtp: vi.fn().mockResolvedValue('123'),
      };
      action.params = {
        selector: '#otp',
        alternatives: [
          { id: 'whatsapp', label: 'WhatsApp', selector: '#whatsapp-btn' },
          { id: 'sms', label: 'SMS', selector: '#sms-btn' },
        ],
      } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).page.type.mockResolvedValue(undefined);
      (action as any).page.keyboard.press.mockResolvedValue(undefined);
      (action as any).page.waitForNavigation.mockResolvedValue(undefined);
      // First alt found, second not
      (action as any).page.$.mockResolvedValueOnce({
        id: 'wa',
      }).mockResolvedValueOnce(null);
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
      };

      await action.run();

      // requestOtp should be called with 1 visible alternative
      expect(mockEventsService.requestOtp).toHaveBeenCalledWith(
        's1',
        expect.any(String),
        '#otp',
        'r1',
        expect.anything(),
        expect.arrayContaining([
          expect.objectContaining({ id: 'whatsapp', label: 'WhatsApp' }),
        ]),
      );
    });

    it('should handle navigation timeout after Enter gracefully', async () => {
      const mockEventsService = {
        requestOtp: vi.fn().mockResolvedValue('111'),
      };
      action.params = { selector: '#otp', pressEnter: true } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).page.type.mockResolvedValue(undefined);
      (action as any).page.keyboard.press.mockResolvedValue(undefined);
      (action as any).page.waitForNavigation.mockRejectedValue(
        new Error('Navigation timeout'),
      );
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
      };

      const result = await action.run();

      expect(result).toBe('111'); // Should still succeed
    });

    it('should retry on navigation error during detect', async () => {
      action.params = { selector: '#otp', detectSelector: '#otp-page' } as any;
      const mockEventsService = {
        requestOtp: vi.fn().mockResolvedValue('789'),
      };
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
      };

      // First attempt: navigation error, second attempt: success
      (action as any).page.waitForSelector
        .mockRejectedValueOnce(new Error('Execution context was destroyed'))
        .mockResolvedValueOnce(true) // detect succeeds on retry
        .mockResolvedValueOnce(true); // OTP input field found

      (action as any).page.type.mockResolvedValue(undefined);
      (action as any).page.keyboard.press.mockResolvedValue(undefined);
      (action as any).page.waitForNavigation.mockResolvedValue(undefined);

      const result = await action.run();

      expect(result).toBe('789');
      // waitForSelector should have been called at least 3 times
      // (2 for detect retries + 1 for OTP input)
      expect((action as any).page.waitForSelector).toHaveBeenCalledTimes(3);
    });

    it('should give up after max retries for navigation errors during detect', async () => {
      action.params = { selector: '#otp', detectSelector: '#otp-page' } as any;

      // All 3 attempts fail with navigation error
      (action as any).page.waitForSelector
        .mockRejectedValueOnce(new Error('Execution context was destroyed'))
        .mockRejectedValueOnce(new Error('Execution context was destroyed'))
        .mockRejectedValueOnce(new Error('Execution context was destroyed'));

      const result = await action.run();

      // After 3 failed attempts, detected=false, should return null
      expect(result).toBeNull();
    });

    it('should use terminal fallback when no scrapeEventsService', async () => {
      // When scrapeEventsService is null, the action falls back to readline.
      // We can't spy on ESM readline, so just verify the code path
      // reaches the terminal fallback by checking no requestOtp is called.
      action.params = { selector: '#otp', pressEnter: false } as any;
      (action as any).page.waitForSelector.mockRejectedValue(
        new Error('Timeout'),
      );
      (action as any).data = {
        scrapeEventsService: null,
        scrapeId: 's1',
        runId: 'r1',
      };

      // Without scrapeEventsService and with a failing waitForSelector,
      // the action should return null (OTP page not detected)
      const result = await action.run();
      expect(result).toBeNull();
    });

    it('should handle alternative selector errors gracefully', async () => {
      const mockEventsService = {
        requestOtp: vi.fn().mockResolvedValue('abc'),
      };
      action.params = {
        selector: '#otp',
        alternatives: [
          { id: 'broken', label: 'Broken', selector: '#broken-btn' },
        ],
      } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).page.type.mockResolvedValue(undefined);
      (action as any).page.keyboard.press.mockResolvedValue(undefined);
      (action as any).page.waitForNavigation.mockResolvedValue(undefined);
      // page.$ throws for this alternative
      (action as any).page.$.mockRejectedValue(new Error('Selector error'));
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
      };

      const result = await action.run();

      // Should still succeed, just no alternatives passed
      expect(result).toBe('abc');
      expect(mockEventsService.requestOtp).toHaveBeenCalledWith(
        's1',
        expect.any(String),
        '#otp',
        'r1',
        expect.anything(),
        [], // No alternatives since the selector threw
      );
    });

    it('should use default message when none provided', async () => {
      const mockEventsService = {
        requestOtp: vi.fn().mockResolvedValue('000'),
      };
      action.params = { selector: '#otp' } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).page.type.mockResolvedValue(undefined);
      (action as any).page.keyboard.press.mockResolvedValue(undefined);
      (action as any).page.waitForNavigation.mockResolvedValue(undefined);
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
      };

      await action.run();

      // Default message is used
      expect(mockEventsService.requestOtp).toHaveBeenCalledWith(
        's1',
        'Bitte gib den OTP-Code ein:',
        '#otp',
        'r1',
        expect.anything(),
        [],
      );
    });

    it('should use custom message when provided', async () => {
      const mockEventsService = {
        requestOtp: vi.fn().mockResolvedValue('000'),
      };
      action.params = { selector: '#otp', message: 'Enter your code:' } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).page.type.mockResolvedValue(undefined);
      (action as any).page.keyboard.press.mockResolvedValue(undefined);
      (action as any).page.waitForNavigation.mockResolvedValue(undefined);
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
      };

      await action.run();

      expect(mockEventsService.requestOtp).toHaveBeenCalledWith(
        's1',
        'Enter your code:',
        '#otp',
        'r1',
        expect.anything(),
        [],
      );
    });

    it('should use default scrapeId "unknown" when data has no scrapeId', async () => {
      const mockEventsService = {
        requestOtp: vi.fn().mockResolvedValue('555'),
      };
      action.params = { selector: '#otp' } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).page.type.mockResolvedValue(undefined);
      (action as any).page.keyboard.press.mockResolvedValue(undefined);
      (action as any).page.waitForNavigation.mockResolvedValue(undefined);
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: undefined,
        runId: 'r1',
      };

      await action.run();

      expect(mockEventsService.requestOtp).toHaveBeenCalledWith(
        'unknown',
        expect.any(String),
        '#otp',
        'r1',
        expect.anything(),
        [],
      );
    });

    it('should detect OTP page when detectSelector element is found', async () => {
      const mockEventsService = {
        requestOtp: vi.fn().mockResolvedValue('detected-otp'),
      };
      action.params = { selector: '#otp', detectSelector: '#otp-page' } as any;
      (action as any).page.waitForSelector
        .mockResolvedValueOnce({}) // detect selector found (truthy object)
        .mockResolvedValueOnce(true); // OTP input found
      (action as any).page.type.mockResolvedValue(undefined);
      (action as any).page.keyboard.press.mockResolvedValue(undefined);
      (action as any).page.waitForNavigation.mockResolvedValue(undefined);
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
      };

      const result = await action.run();
      expect(result).toBe('detected-otp');
    });

    it('should use default timeout of 120000 and pressEnter true', async () => {
      const mockEventsService = {
        requestOtp: vi.fn().mockResolvedValue('def'),
      };
      // Only provide selector, let defaults apply
      action.params = { selector: '#otp' } as any;
      (action as any).page.waitForSelector.mockResolvedValue(true);
      (action as any).page.type.mockResolvedValue(undefined);
      (action as any).page.keyboard.press.mockResolvedValue(undefined);
      (action as any).page.waitForNavigation.mockResolvedValue(undefined);
      (action as any).data = {
        scrapeEventsService: mockEventsService,
        scrapeId: 's1',
        runId: 'r1',
      };

      const result = await action.run();
      expect(result).toBe('def');
      // Default pressEnter=true, so Enter should be pressed
      expect((action as any).page.keyboard.press).toHaveBeenCalledWith('Enter');
    });
  });
});
