/** Invalid configuration. 0.x callers check `error.type === 'ValidationError'`. */
export class ValidationError extends Error {
  readonly type = 'ValidationError';

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
