/**
 * Error shape callers key off. Mirrors `@bnd/api-client`'s ApiError, minus the
 * AdonisJS branch: this app only ever talks to the Laravel API, so field
 * errors always arrive in Laravel's `{ field: [messages] }` record shape.
 */
export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
  [key: string]: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null, message?: string) {
    super(message ?? body?.message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isValidation(): boolean {
    return this.status === 422;
  }

  get fieldErrors(): Record<string, string[]> | null {
    return this.body?.errors ?? null;
  }

  /** First field message, for forms that surface one error at a time. */
  get firstFieldError(): string | null {
    const errors = this.fieldErrors;
    if (!errors) return null;
    for (const messages of Object.values(errors)) {
      if (messages?.[0]) return messages[0];
    }
    return null;
  }
}

/**
 * A request that never reached the API — airplane mode, dead wifi, captive
 * portal. Worth its own type because the recovery is "try again", not
 * "correct your input", and on a phone it is the common case.
 */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('No connection. Check your internet and try again.');
    this.name = 'NetworkError';
    this.cause = cause;
  }
}
