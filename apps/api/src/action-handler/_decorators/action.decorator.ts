import { ActionMetadata } from '../types/action-metadata.types';

// Typ zur Speicherung der registrierten Aktion und ihres Namens
export interface RegisteredAction {
  name: string;
  actionClass: Function;
  metadata: ActionMetadata;
}

// Array zur Speicherung aller registrierten Aktionen
export const registeredActions: RegisteredAction[] = [];

/** Options for the @Action decorator */
export interface ActionDecoratorOptions {
  /** Human-readable display name */
  displayName: string;
  /** Lucide icon name (PascalCase, e.g., "Globe", "MousePointer") */
  icon: string;
  /** Description of what the action does */
  description: string;
  /** Primary color (Tailwind color name, e.g., "blue", "purple") */
  color: string;
  /** Category for grouping in UI */
  category: ActionMetadata['category'];
}

/**
* Action Decorator, um eine Klasse als Aktion zu markieren und zu registrieren
* @param name Der Name der Aktion (z.B. 'navigate', 'click')
* @param options Metadaten für die Action (displayName, icon, description, etc.)
*/
export function Action(name: string, options: ActionDecoratorOptions) {
  return function (constructor: Function) {
    const metadata: ActionMetadata = {
      name,
      displayName: options.displayName,
      icon: options.icon,
      description: options.description,
      color: options.color,
      category: options.category,
    };

    // Füge die Aktion zur Liste der registrierten Aktionen hinzu
    registeredActions.push({ name, actionClass: constructor, metadata });
    console.log(`✓ Action registered: ${name} (${options.displayName})`);
  };
}

// Funktion, um alle registrierten Aktionen zu erhalten
export function getAllActions(): Array<RegisteredAction> {
  return registeredActions;
}

// Funktion, um alle Action-Metadaten als Map zu erhalten
export function getAllActionMetadata(): Record<string, ActionMetadata> {
  const metadataMap: Record<string, ActionMetadata> = {};
  for (const action of registeredActions) {
    metadataMap[action.name] = action.metadata;
  }
  return metadataMap;
}

