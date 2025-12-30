export function getValueFromPath<T>(data: object, element: string): T | undefined {
    // Überprüfe, ob data ein Objekt ist und element eine gültige Zeichenkette ist
    if (typeof data !== 'object' || data === null || typeof element !== 'string' || element.trim() === '') {
        return undefined; // Gib undefined zurück, wenn die Eingaben ungültig sind
    }

    const keys = element.split('.').filter(key => key.trim() !== ''); // Splitte und filtere leere Schlüssel
    let value = data; // Starte von der Wurzel des bereitgestellten Datenobjekts

    // Traversiere das Objekt mithilfe der Schlüssel
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return undefined; // Gib undefined zurück, wenn ein Schlüssel nicht gefunden wird
        }
    }

    return value as T; // Gib den endgültigen Wert zurück
}
