
// Definiere den Typ für data
export type ScrapeActionData = {
    currentData: CurrentData;
    storedData: StoredData;
};

// Definiere den Typ für currentData
type CurrentData = {
    [key: string]: any; // Ein generisches Objekt, das beliebige Schlüssel und Werte erlaubt
};

// Definiere den Typ für currentData
type StoredData = {
    [key: string]: any; // Ein generisches Objekt, das beliebige Schlüssel und Werte erlaubt
};