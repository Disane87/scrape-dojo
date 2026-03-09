export class BreakLoopError extends Error {
  constructor(public readonly breakLevels: number = 1) {
    super('BreakLoop');
    this.name = 'BreakLoopError';
  }
}
