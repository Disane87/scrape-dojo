import {
  Action,
  getAllActions,
  getAllActionMetadata,
  registeredActions,
} from './action.decorator';

describe('Action Decorator', () => {
  it('getAllActions should return registered actions array', () => {
    const actions = getAllActions();
    expect(Array.isArray(actions)).toBe(true);
  });

  it('getAllActionMetadata should return metadata map', () => {
    const metadata = getAllActionMetadata();
    expect(typeof metadata).toBe('object');
  });

  it('Action decorator should register a class', () => {
    const beforeCount = registeredActions.length;

    @Action('test-decorator-action', {
      displayName: 'Test Action',
      icon: 'Zap',
      description: 'A test action',
      color: 'red',
      category: 'utility',
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class TestAction {}

    expect(registeredActions.length).toBe(beforeCount + 1);
    const last = registeredActions[registeredActions.length - 1];
    expect(last.name).toBe('test-decorator-action');
    expect(last.metadata.displayName).toBe('Test Action');
    expect(last.metadata.icon).toBe('Zap');
    expect(last.metadata.category).toBe('utility');

    // Cleanup
    registeredActions.pop();
  });

  it('registered actions should have correct metadata structure', () => {
    const actions = getAllActions();
    for (const action of actions) {
      expect(action).toHaveProperty('name');
      expect(action).toHaveProperty('actionClass');
      expect(action).toHaveProperty('metadata');
      expect(action.metadata).toHaveProperty('displayName');
      expect(action.metadata).toHaveProperty('icon');
      expect(action.metadata).toHaveProperty('description');
      expect(action.metadata).toHaveProperty('color');
      expect(action.metadata).toHaveProperty('category');
    }
  });
});
