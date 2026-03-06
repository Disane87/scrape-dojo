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
  });
});
