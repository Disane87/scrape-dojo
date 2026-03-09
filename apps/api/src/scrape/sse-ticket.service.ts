import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface TicketEntry {
  userId: string;
  createdAt: number;
}

@Injectable()
export class SseTicketService {
  private readonly logger = new Logger(SseTicketService.name);

  /** Ticket TTL in milliseconds (30 seconds) */
  private readonly ticketTtlMs = 30_000;

  /** Cleanup interval in milliseconds (60 seconds) */
  private readonly cleanupIntervalMs = 60_000;

  private readonly tickets = new Map<string, TicketEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(
      () => this.purgeExpired(),
      this.cleanupIntervalMs,
    );
  }

  /**
   * Create a one-time SSE ticket for the given user.
   * Returns an opaque ticket string.
   */
  createTicket(userId: string): string {
    const ticket = randomUUID();
    this.tickets.set(ticket, { userId, createdAt: Date.now() });
    this.logger.debug(`SSE ticket created for user ${userId}`);
    return ticket;
  }

  /**
   * Validate and consume a ticket. Returns the userId if valid, null otherwise.
   * The ticket is deleted after validation (one-time use).
   */
  validateTicket(ticket: string): string | null {
    const entry = this.tickets.get(ticket);
    if (!entry) {
      return null;
    }

    // Always delete the ticket (one-time use)
    this.tickets.delete(ticket);

    // Check TTL
    if (Date.now() - entry.createdAt > this.ticketTtlMs) {
      this.logger.debug('SSE ticket expired');
      return null;
    }

    return entry.userId;
  }

  /**
   * Remove all expired tickets.
   */
  private purgeExpired(): void {
    const now = Date.now();
    let purged = 0;
    for (const [ticket, entry] of this.tickets) {
      if (now - entry.createdAt > this.ticketTtlMs) {
        this.tickets.delete(ticket);
        purged++;
      }
    }
    if (purged > 0) {
      this.logger.debug(`Purged ${purged} expired SSE ticket(s)`);
    }
  }

  /**
   * Clean up the timer on module destroy.
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
