import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SseTicketService } from './sse-ticket.service';

describe('SseTicketService', () => {
  let service: SseTicketService;

  beforeEach(() => {
    service = new SseTicketService();
  });

  afterEach(() => {
    service.destroy();
    vi.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTicket', () => {
    it('should return a non-empty string ticket', () => {
      const ticket = service.createTicket('user-1');
      expect(typeof ticket).toBe('string');
      expect(ticket.length).toBeGreaterThan(0);
    });

    it('should return unique tickets for same user', () => {
      const t1 = service.createTicket('user-1');
      const t2 = service.createTicket('user-1');
      expect(t1).not.toBe(t2);
    });
  });

  describe('validateTicket', () => {
    it('should return userId for a valid ticket', () => {
      const ticket = service.createTicket('user-42');
      const userId = service.validateTicket(ticket);
      expect(userId).toBe('user-42');
    });

    it('should return null for unknown ticket', () => {
      const userId = service.validateTicket('non-existent-ticket');
      expect(userId).toBeNull();
    });

    it('should consume the ticket (one-time use)', () => {
      const ticket = service.createTicket('user-1');

      // First validation succeeds
      expect(service.validateTicket(ticket)).toBe('user-1');

      // Second validation fails (already consumed)
      expect(service.validateTicket(ticket)).toBeNull();
    });

    it('should return null for expired ticket', () => {
      vi.useFakeTimers();

      const ticket = service.createTicket('user-1');

      // Advance past TTL (30 seconds)
      vi.advanceTimersByTime(31_000);

      const userId = service.validateTicket(ticket);
      expect(userId).toBeNull();
    });

    it('should return userId for ticket within TTL', () => {
      vi.useFakeTimers();

      const ticket = service.createTicket('user-1');

      // Advance just under TTL
      vi.advanceTimersByTime(29_000);

      const userId = service.validateTicket(ticket);
      expect(userId).toBe('user-1');
    });
  });

  describe('purgeExpired', () => {
    it('should remove expired tickets during cleanup', () => {
      vi.useFakeTimers();

      const ticket = service.createTicket('user-1');

      // Advance past TTL
      vi.advanceTimersByTime(31_000);

      // Trigger cleanup interval (60s)
      vi.advanceTimersByTime(60_000);

      // Ticket should be gone
      expect(service.validateTicket(ticket)).toBeNull();
    });
  });

  describe('destroy', () => {
    it('should clear the cleanup interval', () => {
      // No error when calling destroy
      service.destroy();

      // Calling destroy again should not throw
      service.destroy();
    });
  });
});
