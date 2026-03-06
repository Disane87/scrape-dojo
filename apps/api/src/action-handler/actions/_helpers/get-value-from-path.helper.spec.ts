import { getValueFromPath } from './get-value-from-path.helper';

describe('getValueFromPath', () => {
  it('should return value for simple key', () => {
    expect(getValueFromPath({ name: 'test' }, 'name')).toBe('test');
  });

  it('should return value for nested path', () => {
    const data = { a: { b: { c: 'deep' } } };
    expect(getValueFromPath(data, 'a.b.c')).toBe('deep');
  });

  it('should return undefined for non-existent key', () => {
    expect(getValueFromPath({ a: 1 }, 'b')).toBeUndefined();
  });

  it('should return undefined for non-existent nested path', () => {
    expect(getValueFromPath({ a: { b: 1 } }, 'a.c.d')).toBeUndefined();
  });

  it('should return undefined for null data', () => {
    expect(getValueFromPath(null as any, 'key')).toBeUndefined();
  });

  it('should return undefined for non-object data', () => {
    expect(getValueFromPath('string' as any, 'key')).toBeUndefined();
  });

  it('should return undefined for empty element string', () => {
    expect(getValueFromPath({ a: 1 }, '')).toBeUndefined();
  });

  it('should return undefined for whitespace element', () => {
    expect(getValueFromPath({ a: 1 }, '   ')).toBeUndefined();
  });

  it('should handle arrays in path', () => {
    const data = { items: [{ name: 'first' }, { name: 'second' }] };
    expect(getValueFromPath(data, 'items.0.name')).toBe('first');
  });

  it('should return the object itself for nested objects', () => {
    const nested = { c: 3 };
    const data = { a: { b: nested } };
    expect(getValueFromPath(data, 'a.b')).toBe(nested);
  });

  it('should filter empty keys from path', () => {
    const data = { a: { b: 'value' } };
    expect(getValueFromPath(data, 'a..b')).toBe('value');
  });
});
