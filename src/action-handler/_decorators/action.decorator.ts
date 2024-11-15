// Typ zur Speicherung der registrierten Aktion und ihres Namens
export interface RegisteredAction {
  name: string;
  actionClass: Function;
}

// Array zur Speicherung aller registrierten Aktionen
export const registeredActions: RegisteredAction[] = [];

/**
* Action Decorator, um eine Klasse als Aktion zu markieren und zu registrieren
* @param name Der Name der Aktion
*/
export function Action(name: string) {
  return function (constructor: Function) {
      // Füge die Aktion zur Liste der registrierten Aktionen hinzu
      registeredActions.push({ name, actionClass: constructor });
  };
}

// Funktion, um alle registrierten Aktionen zu erhalten
export function getAllActions(): Array<RegisteredAction> {
  return registeredActions;
}

