import type { ApiErrorResponse, ApiListResponse, ApiResponse } from '@ablespace/shared';

/**
 * The single place the browser talks to the API.
 *
 * Every request goes through here so bearer tokens, the response envelope and
 * error shaping are handled once rather than repeated at each call site.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/**
 * Supplies the current Firebase ID token; installed by AuthProvider.
 *
 * `forceRefresh` bypasses the SDK's cache. It is used only after a 401, since
 * an unconditional refresh would add a network round-trip to every request.
 */
type TokenProvider = (forceRefresh?: boolean) => Promise<string | null>;

let tokenProvider: TokenProvider = async () => null;

/**
 * Registers the token source.
 *
 * Indirection rather than importing Firebase here keeps this module free of a
 * dependency on the auth stack, which in turn keeps it testable.
 */
export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

/**
 * An error carrying the API's own machine-readable code.
 *
 * Callers can branch on `code` — for example to distinguish an expired session
 * from a genuine permission failure — instead of matching on message text.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when retrying after a token refresh could plausibly succeed. */
  get isAuthError(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** Field-level validation messages, when the API supplied any. */
  get fieldErrors(): string[] {
    return this.details.filter((detail): detail is string => typeof detail === 'string');
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Query parameters; undefined and null entries are dropped. */
  params?: Record<string, string | number | boolean | string[] | undefined | null>;
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      // Repeated filters are sent comma-separated, which is what the API's
      // query DTO parses.
      url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
    }
  }

  return url.toString();
}

/** Converts a failed response into an ApiError, whatever shape it arrived in. */
async function toApiError(response: Response): Promise<ApiError> {
  let payload: Partial<ApiErrorResponse> = {};

  try {
    payload = (await response.json()) as Partial<ApiErrorResponse>;
  } catch {
    // A gateway timeout or a crashed process can return HTML or nothing at
    // all; fall through to the generic message below.
  }

  return new ApiError(
    payload.message ?? `Request failed with status ${response.status}`,
    response.status,
    payload.code ?? 'UNKNOWN_ERROR',
    Array.isArray(payload.details) ? payload.details : [],
  );
}

/**
 * Sends the request, attaching the current ID token.
 *
 * Every outbound call funnels through here, which is what keeps token handling
 * out of components entirely — no component ever sees a token, let alone sets
 * an Authorization header.
 *
 * A 401 is retried exactly once with a force-refreshed token. Firebase ID
 * tokens last an hour; a tab left open across that boundary would otherwise
 * see its next request fail for no reason the user could understand. If the
 * retry also fails, the session is genuinely over and the error surfaces so
 * the route guard can send the user back to sign in.
 */
async function send(path: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, params, signal } = options;
  const url = buildUrl(path, params);

  const attempt = async (forceRefresh: boolean): Promise<Response> => {
    // A failure to mint a token is not fatal: the request proceeds without one
    // and the API answers 401, which is the same outcome by a clearer route.
    const token = await tokenProvider(forceRefresh).catch(() => null);

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    return fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      cache: 'no-store',
    });
  };

  let response: Response;
  try {
    response = await attempt(false);
  } catch (cause) {
    // An aborted request is the caller's own doing — usually a superseded
    // query — and must not be reported as a network failure.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(
      'Could not reach the server. Check your connection and try again.',
      0,
      'NETWORK_ERROR',
    );
  }

  if (response.status === 401) {
    try {
      response = await attempt(true);
    } catch {
      // Keep the original 401 rather than masking it with a network error.
    }
  }

  return response;
}

/** Performs a request and unwraps the `{ data }` envelope. */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);

  if (!response.ok) {
    throw await toApiError(response);
  }

  // 204 carries no body; parsing it would throw.
  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

/** A list response, keeping `meta` alongside the items for pagination. */
async function requestList<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiListResponse<T>> {
  const response = await send(path, options);

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as ApiListResponse<T>;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),

  list: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    requestList<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T = void>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
