import { API_BASE_URL } from './config';
import { ApiError, NetworkError, type ApiErrorBody } from './errors';
import { getToken } from '../auth/token';

/**
 * The ONLY way to call the API. No raw fetch in screen code, no axios —
 * same rule as the web repo's CLAUDE.md §3.
 *
 * Differs from the web client in exactly one respect: the credential. The web
 * rides a Sanctum session cookie and has to fetch and echo a CSRF token; a
 * native app carries a Sanctum personal-access token in an Authorization
 * header. Bearer auth is not ambient the way a cookie is, so CSRF does not
 * apply and there is nothing to echo.
 */
export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** Plain object — JSON-stringified. For uploads pass FormData via `raw`. */
  json?: unknown;
  /** Escape hatch for FormData / Blob. */
  raw?: BodyInit;
  /** Querystring object — URL-encoded; nullish entries dropped. */
  query?: QueryParams;
  /** Skip the Authorization header (login, register, password reset). */
  anonymous?: boolean;
  /** Abort the request after this many ms. Defaults to 30s. */
  timeoutMs?: number;
}

export type QueryParams = Readonly<Record<string, unknown>>;

const DEFAULT_TIMEOUT_MS = 30_000;

/** Notified whenever the API rejects our token, so the app can sign out. */
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(path.startsWith('http') ? path : `${API_BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined) continue;
      // Laravel parses repeated `key[]` entries back into an array, which is
      // what whereIn-style filters (`statuses`) need. String(array) would send
      // the comma-joined form and the filter would silently match nothing.
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (entry === null || entry === undefined) continue;
          url.searchParams.append(`${key}[]`, String(entry));
        }
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    json,
    raw,
    query,
    headers,
    method = 'GET',
    anonymous = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...rest
  } = options;

  const finalHeaders = new Headers(headers);
  finalHeaders.set('Accept', 'application/json');
  if (json !== undefined) finalHeaders.set('Content-Type', 'application/json');

  if (!anonymous) {
    const token = await getToken();
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  // A phone drops off the network mid-request far more often than a desktop
  // browser does, and fetch has no default timeout — without this the promise
  // hangs and the screen spins forever.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      method: method.toUpperCase(),
      headers: finalHeaders,
      body: json !== undefined ? JSON.stringify(json) : raw,
      signal: rest.signal ?? controller.signal,
    });
  } catch (cause) {
    throw new NetworkError(cause);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 && !anonymous) {
    // The token is gone or revoked. Tell the session layer once; it clears the
    // keystore and routes to login. Still throws, so the calling query fails
    // rather than resolving with nothing.
    for (const listener of unauthorizedListeners) listener();
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? ((await response.json()) as unknown) : await response.text();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (isJson ? payload : { message: String(payload) }) as ApiErrorBody,
    );
  }

  return payload as T;
}
