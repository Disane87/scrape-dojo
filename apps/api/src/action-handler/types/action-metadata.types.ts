/**
 * Action Metadata Types
 * Diese Typen definieren die Metadaten für Actions.
 * WICHTIG: Halte diese synchron mit libs/shared/src/lib/interfaces.ts
 */

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
