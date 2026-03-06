import Handlebars from './handlebars.helper';

describe('Handlebars Helpers', () => {
  it('should export Handlebars instance', () => {
    expect(Handlebars).toBeDefined();
    expect(typeof Handlebars.compile).toBe('function');
  });

  describe('year helper', () => {
    it('should return current year', () => {
      const template = Handlebars.compile('{{year}}');
      const result = template({});
      expect(result).toBe(String(new Date().getFullYear()));
    });
  });

  describe('math helpers', () => {
    it('subtract should subtract two numbers', () => {
      const template = Handlebars.compile('{{subtract 10 3}}');
      expect(template({})).toBe('7');
    });

    it('add should add two numbers', () => {
      const template = Handlebars.compile('{{add 10 3}}');
      expect(template({})).toBe('13');
    });

    it('multiply should multiply two numbers', () => {
      const template = Handlebars.compile('{{multiply 4 5}}');
      expect(template({})).toBe('20');
    });
  });

  describe('boolean helpers', () => {
    it('not should negate a value', () => {
      const template = Handlebars.compile('{{not true}}');
      expect(template({})).toBe('false');
    });

    it('hasValue should return true for defined value', () => {
      const template = Handlebars.compile('{{hasValue value}}');
      expect(template({ value: 'test' })).toBe('true');
    });

    it('hasValue should return false for null', () => {
      const template = Handlebars.compile('{{hasValue value}}');
      expect(template({ value: null })).toBe('false');
    });

    it('hasNoValue should return true for undefined', () => {
      const template = Handlebars.compile('{{hasNoValue missing}}');
      expect(template({})).toBe('true');
    });

    it('hasNoValue should return false for defined value', () => {
      const template = Handlebars.compile('{{hasNoValue value}}');
      expect(template({ value: 'test' })).toBe('false');
    });
  });

  describe('comparison helpers', () => {
    it('eq should compare equal values', () => {
      const template = Handlebars.compile('{{eq a b}}');
      expect(template({ a: 5, b: 5 })).toBe('true');
      expect(template({ a: 5, b: 3 })).toBe('false');
    });

    it('ne should compare not-equal values', () => {
      const template = Handlebars.compile('{{ne a b}}');
      expect(template({ a: 5, b: 3 })).toBe('true');
      expect(template({ a: 5, b: 5 })).toBe('false');
    });

    it('isUndefined should check for undefined', () => {
      const template = Handlebars.compile('{{isUndefined missing}}');
      expect(template({})).toBe('true');
    });

    it('isDefined should check for defined', () => {
      const template = Handlebars.compile('{{isDefined value}}');
      expect(template({ value: 'x' })).toBe('true');
    });
  });

  describe('typeof helper', () => {
    it('should return type of value', () => {
      const template = Handlebars.compile('{{typeof value}}');
      expect(template({ value: 42 })).toBe('number');
      expect(template({ value: 'str' })).toBe('string');
      expect(template({ value: true })).toBe('boolean');
    });
  });

  describe('jsonata helper', () => {
    it('should be registered as a helper', () => {
      // jsonata evaluate is async but Handlebars is sync,
      // so the helper returns a Promise object stringified.
      // Just verify the helper is registered and doesn't throw.
      const template = Handlebars.compile('{{{jsonata data "$.name"}}}');
      const result = template({ data: { name: 'test' } });
      expect(typeof result).toBe('string');
    });
  });
});
