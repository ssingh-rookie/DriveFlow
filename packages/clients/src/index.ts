/**
 * DriveFlow typed HTTP client using openapi-fetch.
 * Generates strongly-typed GET/POST/... methods from the OpenAPI `paths` type.
 *
 * Usage (web):
 *   import { makeClient } from '@driveflow/clients';
 *   const api = makeClient({
 *     baseUrl: process.env.NEXT_PUBLIC_API_URL!,
 *     getAuthToken: () => localStorage.getItem('token')
 *   });
 *   const { data, error } = await api.GET('/v1/bookings/{id}', { params: { path: { id } } });
 *
 * Usage (mobile / server):
 *   const api = makeClient({ baseUrl: API_URL, getAuthToken: async () => getToken() });
 */

import createClient from 'openapi-fetch';
import type { paths } from './types';

export type ProblemDetails = {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  // allow passthrough of extra fields
  [k: string]: unknown;
};

export class HttpError extends Error {
  status: number;
  problem?: ProblemDetails;

  constructor(message: string, status: number, problem?: ProblemDetails) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.problem = problem;
  }
}

export type ClientOptions = {
  /** Base API URL, e.g., https://api.driveflow.app */
  baseUrl: string;
  /** Optional function to retrieve bearer token (can be sync or async) */
  getAuthToken?: () => string | null | Promise<string | null>;
  /** Optional custom fetch implementation */
  fetch?: typeof fetch;
  /** Optional extra headers */
  defaultHeaders?: Record<string, string>;
};

export const makeClient = (opts: ClientOptions) => {
  const baseUrl = opts.baseUrl.replace(/\/+$/, ''); // trim trailing slash

  const client = createClient<paths>({
    baseUrl,
    fetch: opts.fetch ?? fetch
  });

  // Attach middleware for auth + error handling
  client.use({
    onRequest: async ({ request }) => {
      const headers = new Headers(request.headers);
      // Merge defaults
      if (opts.defaultHeaders) {
        for (const [k, v] of Object.entries(opts.defaultHeaders)) headers.set(k, v);
      }
      // Bearer token if present
      if (opts.getAuthToken) {
        const token = await opts.getAuthToken();
        if (token) headers.set('Authorization', `Bearer ${token}`);
      }
      return new Request(request, { headers });
    },
    onResponse: async ({ response }) => {
      if (!response.ok) {
        // Try parse RFC7807
        let problem: ProblemDetails | undefined;
        try {
          const ct = response.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            problem = await response.clone().json();
          } else {
            const text = await response.clone().text();
            problem = { title: text || response.statusText, status: response.status };
          }
        } catch {
          // ignore parse errors
        }
        throw new HttpError(problem?.title || response.statusText, response.status, problem);
      }
      return response;
    }
  });

  /**
   * Expose typed HTTP helpers that mirror openapi-fetch:
   *   api.GET('/v1/bookings/{id}', { params: { path: { id } } })
   *   api.POST('/v1/bookings', { body })
   */
  const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = client;

  return { client, GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS };
};

export type DriveFlowClient = ReturnType<typeof makeClient>;
