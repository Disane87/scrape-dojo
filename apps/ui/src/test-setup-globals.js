// Bridge vitest globals to globalThis BEFORE Angular's testing module loads.
// Angular registers cleanup hooks via globalThis.beforeEach/afterEach,
// but vitest may not expose them on globalThis in all environments.
if (typeof afterEach !== 'undefined' && !globalThis.afterEach) {
  globalThis.afterEach = afterEach;
}
if (typeof beforeEach !== 'undefined' && !globalThis.beforeEach) {
  globalThis.beforeEach = beforeEach;
}
