---
sidebar_position: 7
---

# Transformationen

Komplexe Datenverarbeitung mit JSONata.

## Was ist JSONata?

[JSONata](https://jsonata.org/) ist eine leichtgewichtige Query- und Transformationssprache für JSON.

## Transform Action

```json
{
  "name": "CleanData",
  "action": "transform",
  "params": {
    "data": "{{previousData.RawData}}",
    "expression": "$map($, function($v) { {'name': $v.title, 'price': $number($v.cost)} })"
  }
}
```

## Beispiele

### Filtern

```javascript
// Input
[
  {"name": "A", "price": 10},
  {"name": "B", "price": 50},
  {"name": "C", "price": 100}
]

// Expression
$[price > 20]

// Output
[
  {"name": "B", "price": 50},
  {"name": "C", "price": 100}
]
```

### Mappen

```javascript
// Expression
$map($, function($v) {
  {
    'product': $v.name,
    'cost': $v.price * 1.19
  }
})

// Output
[
  {"product": "A", "cost": 11.90},
  {"product": "B", "cost": 59.50}
]
```

### Aggregieren

```javascript
// Expression
$sum($.price)  // Summe aller Preise

$count($)      // Anzahl Elemente

$average($.price)  // Durchschnittspreis
```

## Online Testen

Teste deine Expressions: https://try.jsonata.org/

## Nächste Schritte

- 🔄 [Data Flow](./data-flow)
- 🎨 [Actions](./actions-overview)
