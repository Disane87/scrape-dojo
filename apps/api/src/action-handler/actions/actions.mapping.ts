// Importiere alle Actions (damit die Decorators ausgeführt werden)
import './index';
import { registeredActions } from '../_decorators/action.decorator';

console.log(`📋 Total actions registered: ${registeredActions.length}`);
console.log(
  `📝 Registered action names: ${registeredActions.map((a) => a.name).join(', ')}`,
);

// Generiere das Mapping automatisch aus den registrierten Actions
export const actionsMapping = Object.fromEntries(
  registeredActions.map((action) => [action.name, action.actionClass]),
) as Record<string, new (...args: any[]) => any>;

export type ActionName = keyof typeof actionsMapping;
