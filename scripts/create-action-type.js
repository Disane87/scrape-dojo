// Verwende require anstelle von import
const fs = require('fs');
const { getActionNames } = require('../src/action-handler/decorators/action.decorator');

// Hole die Namen der Aktionen
const actionNames = getActionNames();

// Erstelle einen Union-Typ aus den Namen
const unionType = actionNames.map(name => `'${name}'`).join(' | ');

// Generiere den TypeScript-Typ
const typeDefinition = `export type ActionName = ${unionType};\n`;

// Schreibe den Typ in eine Datei
fs.writeFileSync('../src/action-handler/actions/types/action-types.ts', typeDefinition);

console.log('Action types generated successfully!');