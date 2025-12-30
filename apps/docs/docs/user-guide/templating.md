---
sidebar_position: 5
---

# Templating

Dynamische Werte mit Handlebars.

## Variablen

```handlebars
{{previousData.actionName}}
{{currentData.loopName.value}}
{{variables.varName}}
{{secrets.secretName}}
```

## Helpers

### Mathematik

```handlebars
{{add 1 2}}                    // 3
{{subtract 10 3}}              // 7
{{multiply 5 2}}               // 10
{{divide 20 4}}                // 5
```

### Vergleiche

```handlebars
{{eq a b}}                     // a === b
{{ne a b}}                     // a !== b
{{lt a b}}                     // a < b
{{gt a b}}                     // a > b
{{lte a b}}                    // a <= b
{{gte a b}}                    // a >= b
```

### Logik

```handlebars
{{and true false}}             // false
{{or true false}}              // true
{{not true}}                   // false
```

### Strings

```handlebars
{{concat "Hello" " " "World"}} // "Hello World"
{{uppercase "hello"}}          // "HELLO"
{{lowercase "HELLO"}}          // "hello"
```

### JSON

```handlebars
{{json previousData}}          // Serialisiert Object zu JSON
```

## Beispiele

### Preisberechnung

```json
{
  "message": "Price incl. tax: {{multiply previousData.Price 1.19}}€"
}
```

### Bedingte Werte

```json
{
  "condition": "{{gt previousData.Stock 0}}"
}
```

### URL Building

```json
{
  "url": "{{variables.baseUrl}}/product/{{previousData.ProductId}}?year={{variables.year}}"
}
```

Mehr: [Data Flow](./data-flow)
