---
sidebar_position: 5
---

# Creating Actions

Lerne, wie du eigene Actions entwickelst.

## Action Interface

```typescript
export interface Action {
  name: string;
  description: string;
  params: Record<string, any>;
  execute(context: ActionContext): Promise<any>;
}
```

## Beispiel: Simple Action

```typescript
import { Injectable } from '@nestjs/common';
import { Action, ActionContext } from '../types';

@Injectable()
export class HelloAction implements Action {
  name = 'hello';
  description = 'Print a greeting';
  
  params = {
    name: {
      type: 'string',
      required: true,
      description: 'Name to greet'
    }
  };

  async execute(context: ActionContext): Promise<string> {
    const name = context.params.name;
    const greeting = `Hello, ${name}!`;
    
    context.logger.info(greeting);
    
    return greeting;
  }
}
```

## Registrierung

```typescript
// actions.module.ts
@Module({
  providers: [
    // ... andere Actions
    HelloAction,
  ],
  exports: [
    HelloAction,
  ],
})
export class ActionsModule {}
```

## Action Context

```typescript
interface ActionContext {
  page: Page;                    // Puppeteer Page
  params: Record<string, any>;   // Action Parameters
  previousData: any;             // Results from previous actions
  currentData: any;              // Loop context
  logger: Logger;                // Logger instance
  variables: Record<string, any>; // Variables
  secrets: Record<string, any>;  // Secrets
}
```

## Komplexeres Beispiel

```typescript
@Injectable()
export class CustomExtractAction implements Action {
  name = 'customExtract';
  description = 'Extract with custom logic';
  
  params = {
    selector: {
      type: 'string',
      required: true
    },
    transform: {
      type: 'string',
      required: false,
      description: 'JSONata expression'
    }
  };

  async execute(context: ActionContext): Promise<any> {
    const { page, params, logger } = context;
    
    // Extract from page
    const data = await page.evaluate((sel) => {
      const elements = Array.from(document.querySelectorAll(sel));
      return elements.map(el => el.textContent);
    }, params.selector);
    
    logger.info(`Extracted ${data.length} elements`);
    
    // Optional transformation
    if (params.transform) {
      const jsonata = require('jsonata');
      const expression = jsonata(params.transform);
      return expression.evaluate(data);
    }
    
    return data;
  }
}
```

## Testing

```typescript
describe('HelloAction', () => {
  let action: HelloAction;
  
  beforeEach(() => {
    action = new HelloAction();
  });
  
  it('should return greeting', async () => {
    const context = {
      params: { name: 'World' },
      logger: console,
    } as any;
    
    const result = await action.execute(context);
    expect(result).toBe('Hello, World!');
  });
});
```

## Best Practices

1. **Validierung**: Parameter validieren
2. **Logging**: Wichtige Schritte loggen
3. **Error Handling**: Sinnvolle Fehler werfen
4. **Documentation**: Params beschreiben
5. **Tests**: Unit Tests schreiben

## Nächste Schritte

- 📚 [API Reference](./api-reference)
- 🧪 [Testing](./testing)
- 🎨 [Actions Overview](../user-guide/actions-overview)
