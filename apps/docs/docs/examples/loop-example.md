---
sidebar_position: 2
---

# Loop Example

Mehrere Elemente verarbeiten.

## Config

```json
{
  "id": "loop-example",
  "metadata": {
    "description": "Extract and process multiple products",
    "version": "1.0.0"
  },
  "steps": [
    {
      "name": "GetProducts",
      "actions": [
        {
          "name": "Navigate",
          "action": "navigate",
          "params": {
            "url": "https://example-shop.com/products"
          }
        },
        {
          "name": "ExtractProducts",
          "action": "extract",
          "params": {
            "selector": ".product",
            "extractAll": true,
            "properties": {
              "name": ".product-name",
              "price": ".product-price",
              "url": {
                "selector": "a",
                "attribute": "href"
              }
            }
          }
        },
        {
          "name": "ProcessProducts",
          "action": "loop",
          "params": {
            "items": "{{previousData.ExtractProducts}}"
          },
          "actions": [
            {
              "name": "LogProduct",
              "action": "logger",
              "params": {
                "message": "Product {{currentData.ProcessProducts.index}}: {{currentData.ProcessProducts.value.name}} - €{{currentData.ProcessProducts.value.price}}"
              }
            },
            {
              "name": "SavePrice",
              "action": "condition",
              "params": {
                "condition": "{{lt (number currentData.ProcessProducts.value.price) 50}}",
                "actions": [
                  {
                    "name": "LogCheapProduct",
                    "action": "logger",
                    "params": {
                      "level": "info",
                      "message": "Cheap product found: {{currentData.ProcessProducts.value.name}}"
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

Mehr: [Loops](../user-guide/loops)
