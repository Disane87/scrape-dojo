import { ScrapeStep } from './scrape-step.interface';

export type VariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'password';

export interface VariableOption {
  value: string | number | boolean;
  label: string;
}

export interface WorkflowVariable {
  name: string;
  label?: string;
  type: VariableType;
  required?: boolean;
  description?: string;
  default?: string | number | boolean;
  options?: VariableOption[];
  optionsExpression?: string;
  secretRef?: string;
}

export type TriggerType = 'manual' | 'cron' | 'webhook' | 'startup' | 'api';

export interface WorkflowTrigger {
  type: TriggerType;
  config?: {
    cron?: string;
    timezone?: string;
    webhookPath?: string;
    webhookSecret?: string;
  };
}

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

export interface Scrape {
  id: string;
  metadata?: ScrapeMetadata;
  steps: Array<ScrapeStep>;
}

export interface Scrapes {
  scrapes: Array<Scrape>;
}
