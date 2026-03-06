/**
 * Base Event Interface
 */
export interface DomainEvent {
  readonly eventName: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
}

/**
 * Scrape Events
 */
export class ScrapeStartedEvent implements DomainEvent {
  readonly eventName = 'scrape.started';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly scrapeId: string,
    public readonly runId: string,
    public readonly variables?: Record<string, any>,
  ) {}
}

export class ScrapeCompletedEvent implements DomainEvent {
  readonly eventName = 'scrape.completed';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly scrapeId: string,
    public readonly runId: string,
    public readonly success: boolean,
    public readonly error?: string,
  ) {}
}

export class ScrapeAbortedEvent implements DomainEvent {
  readonly eventName = 'scrape.aborted';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly scrapeId: string,
    public readonly runId: string,
    public readonly reason: string,
  ) {}
}

/**
 * Step Events
 */
export class StepStartedEvent implements DomainEvent {
  readonly eventName = 'step.started';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly scrapeId: string,
    public readonly runId: string,
    public readonly stepName: string,
    public readonly stepIndex: number,
  ) {}
}

export class StepCompletedEvent implements DomainEvent {
  readonly eventName = 'step.completed';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly scrapeId: string,
    public readonly runId: string,
    public readonly stepName: string,
    public readonly stepIndex: number,
  ) {}
}

/**
 * Action Events
 */
export class ActionStartedEvent implements DomainEvent {
  readonly eventName = 'action.started';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly scrapeId: string,
    public readonly runId: string,
    public readonly actionName: string,
    public readonly actionType: string,
    public readonly actionIndex: number,
  ) {}
}

export class ActionCompletedEvent implements DomainEvent {
  readonly eventName = 'action.completed';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly scrapeId: string,
    public readonly runId: string,
    public readonly actionName: string,
    public readonly actionType: string,
    public readonly actionIndex: number,
    public readonly result?: any,
  ) {}
}

export class ActionFailedEvent implements DomainEvent {
  readonly eventName = 'action.failed';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly scrapeId: string,
    public readonly runId: string,
    public readonly actionName: string,
    public readonly actionType: string,
    public readonly actionIndex: number,
    public readonly error: string,
  ) {}
}

/**
 * Log Event
 */
export class LogEvent implements DomainEvent {
  readonly eventName = 'log';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly scrapeId: string,
    public readonly runId: string,
    public readonly level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
    public readonly message: string,
    public readonly context?: string,
  ) {}
}
