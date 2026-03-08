// Scrape Definition Interfaces

// ==========================================
// Action Metadata
// ==========================================

/** Category for grouping actions in the UI */
export type ActionCategory =
  | 'navigation'
  | 'interaction'
  | 'extraction'
  | 'flow'
  | 'utility'
  | 'data';

/** Metadata for an action - defined in each action class */
export interface ActionMetadata {
  /** Action identifier (e.g., 'navigate', 'click') */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Lucide icon name (PascalCase, e.g., "Globe", "MousePointer") */
  icon: string;
  /** Description of what the action does */
  description: string;
  /** Primary color (Tailwind color name without prefix, e.g., "blue", "purple") */
  color: string;
  /** Category for grouping in UI */
  category: ActionCategory;
}

/** All available action metadata from the API */
export interface ActionMetadataMap {
  [actionName: string]: ActionMetadata;
}

// ==========================================
// Author & Scrape Definitions
// ==========================================

/**
 * Author information - can be specified in different formats:
 * - "gh:@username" - GitHub user (fetches avatar, name, profile URL)
 * - "email@example.com" - Email (uses Gravatar for avatar)
 * - "https://..." - Direct avatar URL
 * - "Name" - Just a name string
 */
export interface ScrapeAuthor {
  /** Display name */
  name: string;
  /** Avatar URL (resolved from GitHub, Gravatar, or direct URL) */
  avatar?: string;
  /** Profile URL (GitHub profile, website, etc.) */
  url?: string;
  /** Email address */
  email?: string;
  /** Original author string from config */
  raw: string;
}

/** Resolved metadata with full author information */
export interface ScrapeMetadataResolved extends Omit<ScrapeMetadata, 'author'> {
  author?: ScrapeAuthor;
}

export interface Scrape {
  id: string;
  metadata?: ScrapeMetadata;
  steps: ScrapeStep[];
}

export interface Scrapes {
  scrapes: Scrape[];
}

export interface ScrapeStep {
  name: string;
  actions: ScrapeAction[];
}

export interface ScrapeAction {
  name: string;
  action: ActionName;
  params: Record<string, unknown>;
}

// Action Names
export type ActionName =
  | 'navigate'
  | 'click'
  | 'type'
  | 'extract'
  | 'extractAll'
  | 'loop'
  | 'transform'
  | 'download'
  | 'screenshot'
  | 'delay'
  | 'waitForSelector'
  | 'keyboardPress'
  | 'logger'
  | 'storeData'
  | 'get'
  | 'getAll'
  | 'break'
  | 'waitForOtp'
  | 'notify';

// API Response Types
export interface ScrapeListItem {
  id: string;
  stepsCount: number;
  metadata?: ScrapeMetadataResolved;
  /** Whether this workflow is a built-in (shipped) or user-created one */
  source?: 'builtin' | 'custom';
  lastRun?: {
    status: 'running' | 'completed' | 'failed';
    startTime: number;
    endTime?: number;
  };
}

export interface ScrapeRunResponse {
  success: boolean;
  scrapeId: string;
  result?: unknown;
  error?: string;
}

// SSE Event Types
export type ScrapeEventType =
  | 'step-start'
  | 'step-complete'
  | 'step-status'
  | 'action-start'
  | 'action-complete'
  | 'action-status'
  | 'scrape-start'
  | 'scrape-complete'
  | 'scrape-end'
  | 'error'
  | 'loop-iteration'
  | 'reload'
  | 'log'
  | 'otp-required'
  | 'otp-received'
  | 'notification'
  | 'config-reload';

export type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

export interface ScrapeEvent {
  type: ScrapeEventType;
  scrapeId?: string;
  runId?: string; // Eindeutige ID für jeden Scrape-Lauf
  stepName?: string;
  stepIndex?: number;
  actionName?: string;
  actionIndex?: number;
  actionType?: string;
  status?: string;
  data?: unknown;
  result?: unknown; // Ergebnis der Action
  timestamp: number;
  // Log-spezifische Felder
  logLevel?: LogLevel;
  logContext?: string;
  message?: string;
  error?: string;
  // Loop-spezifische Felder
  loopName?: string;
  loopIndex?: number;
  loopTotal?: number;
  loopValue?: string;
  /** Pfad zu verschachtelten Loops: [{name: 'pageLoop', index: 0}, {name: 'pdfLoop', index: 3}] */
  loopPath?: Array<{ name: string; index: number }>;
  /** Variablen-Informationen beim Scrape-Start */
  variables?: {
    /** Variablen aus dem Run-Dialog */
    runtime?: Record<string, any>;
    /** Variablen aus der Datenbank */
    database?: Record<string, any>;
    /** Finales gemergtes Resultat (runtime überschreibt database) */
    final?: Record<string, any>;
  };
}

// Run History
export type RunTriggerType = 'manual' | 'scheduled' | 'api';

export interface RunHistoryItem {
  id: string;
  scrapeId: string;
  status: 'running' | 'success' | 'failed';
  trigger?: RunTriggerType;
  startTime: number;
  endTime?: number;
  error?: string;
  steps?: RunStepItem[];
  debugData?: any; // Cached debug data
  artifacts?: any[]; // Cached artifacts from SSE events
}

export interface RunStepItem {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startTime?: number;
  endTime?: number;
  actions?: RunActionItem[];
}

export interface RunActionItem {
  name: string;
  actionType: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startTime?: number;
  endTime?: number;
  result?: unknown;
  error?: string;
  // Loop-spezifische Felder
  loopIterations?: LoopIteration[];
  loopTotal?: number;
  loopCurrent?: number;
  // Verschachtelte Actions (für Loops, definiert in der Scrape-Definition)
  nestedActions?: RunActionItem[];
}

export interface LoopIteration {
  index: number;
  value?: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startTime?: number;
  endTime?: number;
  childActions?: RunActionItem[];
}

// OTP Request
export interface OtpAlternative {
  id: string; // z.B. "whatsapp", "passkey"
  label: string; // z.B. "Code an WhatsApp senden"
  selector: string; // CSS-Selektor des Buttons auf der Seite
  icon?: string; // Iconify icon name, z.B. "logos:whatsapp-icon"
}

export interface OtpRequest {
  requestId: string;
  message: string;
  selector: string;
  alternatives?: OtpAlternative[];
}

// Notification Request
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationRequest {
  /** Unique ID for the notification */
  notificationId: string;
  /** Scrape ID that triggered the notification */
  scrapeId: string;
  /** Run ID */
  runId?: string;
  /** Notification type */
  type: NotificationType;
  /** Title of the notification */
  title: string;
  /** Message body */
  message: string;
  /** Icon URL for browser notifications (job icon) */
  iconUrl?: string;
  /** Whether to show browser notification */
  browserNotification?: boolean;
  /** Auto-dismiss after ms (0 = manual dismiss) */
  autoDismiss?: number;
  /** Timestamp */
  timestamp: number;
}

// ==========================================
// Workflow Variables & Secrets
// ==========================================

/** Variable types supported in workflows */
export type WorkflowVariableType =
  | 'string'
  | 'password'
  | 'number'
  | 'boolean'
  | 'email'
  | 'url'
  | 'select';

/** A variable that a workflow can request */
export interface WorkflowVariable {
  /** Unique identifier for the variable */
  name: string;
  /** Human-readable label */
  label: string;
  /** Description of what the variable is for */
  description?: string;
  /** Data type */
  type: WorkflowVariableType;
  /** Whether this variable is required */
  required?: boolean;
  /** Default value */
  default?: string | number | boolean;
  /** Options for 'select' type (static) */
  options?: Array<{ value: string; label: string }>;
  /** JSONata expression to generate options dynamically for 'select' type.
   * The expression should return an array of objects with 'value' and 'label' properties.
   * Example: "$map($reverse([0..9]), function($i) { {'value': 'year-' & $string($year - $i), 'label': $string($year - $i)} })"
   * Available context: $year (current year), $month, $day
   */
  optionsExpression?: string;
  /** Reference to a secret by name (if linked) */
  secretRef?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Validation pattern (regex) for string types */
  pattern?: string;
}

/** A stored secret */
export interface Secret {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** The encrypted/masked value (never sent to client in full) */
  value?: string;
  /** When the secret was created */
  createdAt: number;
  /** When the secret was last updated */
  updatedAt: number;
  /** Associated workflow IDs that use this secret */
  linkedWorkflows?: string[];
}

/** Secret for API responses (without actual value) */
export interface SecretListItem {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  linkedWorkflows?: string[];
  /** Masked preview like "abc***xyz" */
  maskedValue?: string;
  /** Indicates if the secret value is empty */
  isEmpty?: boolean;
}

// ==========================================
// Variables
// ==========================================

/** Variable scope */
export type VariableScope = 'global' | 'workflow';

/** A stored variable (global or workflow-specific) */
export interface Variable {
  /** Unique identifier */
  id: string;
  /** Variable name (can be used in templates) */
  name: string;
  /** Variable value */
  value: string;
  /** Description */
  description?: string;
  /** Scope: global (app-wide) or workflow (job-specific) */
  scope: VariableScope;
  /** If scope=workflow, the workflow ID */
  workflowId?: string;
  /** When the variable was created */
  createdAt: number;
  /** When the variable was last updated */
  updatedAt: number;
}

/** Variable for API responses */
export interface VariableListItem {
  id: string;
  name: string;
  value: string;
  description?: string;
  scope: VariableScope;
  workflowId?: string;
  createdAt: number;
  updatedAt: number;
}

// ==========================================
// Workflow Triggers
// ==========================================

/** Types of triggers that can start a workflow */
export type TriggerType = 'manual' | 'cron' | 'webhook' | 'startup';

/** Base trigger configuration */
export interface BaseTrigger {
  type: TriggerType;
  enabled?: boolean;
}

/** Manual trigger - started by user */
export interface ManualTrigger extends BaseTrigger {
  type: 'manual';
}

/** Cron trigger - scheduled execution */
export interface CronTrigger extends BaseTrigger {
  type: 'cron';
  /** Cron expression (e.g., "0 9 * * 1" for Mondays at 9am) */
  expression: string;
  /** Timezone (e.g., "Europe/Berlin") */
  timezone?: string;
  /** Human-readable description */
  description?: string;
}

/** Webhook trigger - started by HTTP request */
export interface WebhookTrigger extends BaseTrigger {
  type: 'webhook';
  /** Secret token for authentication */
  secret?: string;
  /** Allowed HTTP methods */
  methods?: ('GET' | 'POST')[];
}

/** Startup trigger - runs when the application starts */
export interface StartupTrigger extends BaseTrigger {
  type: 'startup';
  /** Delay in ms before starting */
  delay?: number;
}

export type WorkflowTrigger =
  | ManualTrigger
  | CronTrigger
  | WebhookTrigger
  | StartupTrigger;

// ==========================================
// Extended Scrape Definition
// ==========================================

export interface ScrapeMetadata {
  description?: string;
  version?: string;
  /**
   * Author in one of these formats:
   * - "gh:@username" - GitHub user
   * - "email@example.com" - Email (Gravatar)
   * - "https://..." - Direct avatar URL
   * - "Name" - Just a name
   */
  author?: string;
  /** Email address of the author */
  email?: string;
  icon?: string;
  tags?: string[];
  /** Category for grouping workflows in the sidebar */
  category?: string;
  /** Whether this workflow is disabled (cannot be run) */
  disabled?: boolean;
  /** Variables that this workflow needs */
  variables?: WorkflowVariable[];
  /** Triggers that can start this workflow */
  triggers?: WorkflowTrigger[];
}

/** Variables provided when running a workflow */
export interface WorkflowRunVariables {
  [key: string]: string | number | boolean;
}

/** Request to run a workflow with variables */
export interface RunWorkflowRequest {
  /** Variables to pass to the workflow */
  variables?: WorkflowRunVariables;
  /** Override trigger type */
  triggerType?: TriggerType;
}

// ==========================================
// Schedule Management
// ==========================================

/** Schedule settings for a scrape */
export interface ScrapeSchedule {
  scrapeId: string;
  /** Whether manual execution is allowed */
  manualEnabled: boolean;
  /** Whether automatic scheduling is enabled */
  scheduleEnabled: boolean;
  /** Cron expression for automatic execution */
  cronExpression: string | null;
  /** Timezone for the cron (default: Europe/Berlin) */
  timezone: string;
  /** Last scheduled run timestamp */
  lastScheduledRun: number | null;
  /** Next scheduled run timestamp */
  nextScheduledRun: number | null;
}

// Legacy interfaces (kept for compatibility)
export interface ScheduledJob {
  id: string;
  scrapeId: string;
  trigger: CronTrigger;
  nextRun?: number;
  lastRun?: number;
  lastStatus?: 'success' | 'failed';
  enabled: boolean;
}
