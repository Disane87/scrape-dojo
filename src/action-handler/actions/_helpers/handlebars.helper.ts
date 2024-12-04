import Handlebars from "handlebars";
import jsonata from "jsonata";

import * as fs from 'fs';
import * as path from 'path';

// Register the "year" helper
Handlebars.registerHelper('year', () => {
    // Return the current year dynamically
    return new Date().getFullYear();
});

// Register the "subtract" helper
Handlebars.registerHelper("subtract", (value: number, number: number): number => {
    return value - number;
});

Handlebars.registerHelper("add", (value: number, number: number): number => {
    return value + number;
});

Handlebars.registerHelper("hasValue", (value: any): boolean => {
    return !!(value !== undefined && value !== null);
});

Handlebars.registerHelper("hasNoValue", (value: any): boolean => {
    return !!(value === undefined || value === null);
});

// Register the "subtract" helper
Handlebars.registerHelper("multiply", (value: number, number: number): number => {
    return value * number;
});

// Registriere den JSONata-Helper
Handlebars.registerHelper("jsonata", (data: any, expression: string) => {
    try {
        // Erstelle den JSONata-Ausdruck
        const expr = jsonata(expression);

        // Wende den Ausdruck auf die JSON-Daten an
        const result = expr.evaluate(data);

        // Gib das Ergebnis als JSON-String zurück
        return JSON.stringify(result);
    } catch (error) {
        // Gib eine Fehlermeldung zurück, falls der Ausdruck fehlschlägt
        return `Error: ${error.message}`;
    }
});

// Export Handlebars for use in other files
export default Handlebars;