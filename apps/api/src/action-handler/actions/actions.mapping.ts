// Importiere alle Actions (damit die Decorators ausgeführt werden)
import './index';
import { Logger } from '@nestjs/common';
import { registeredActions } from '../_decorators/action.decorator';

const logger = new Logger('ActionRegistry');
logger.log(`Total actions registered: ${registeredActions.length}`);
logger.debug(
  `Registered action names: ${registeredActions.map((a) => a.name).join(', ')}`,
);

// Generiere das Mapping automatisch aus den registrierten Actions
export const actionsMapping = Object.fromEntries(
  registeredActions.map((action) => [action.name, action.actionClass]),
) as Record<string, new (...args: any[]) => any>;

export type ActionName = keyof typeof actionsMapping;
