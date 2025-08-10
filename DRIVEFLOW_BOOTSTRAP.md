# DriveFlow AI-First Bootstrap Pack (Cursor + Claude Code)

> Save this file as `DRIVEFLOW_BOOTSTRAP.md`. Then create the files/folders below with the exact paths and contents. This gives you:  
> – Cursor rules,  
> – a NestJS module scaffold prompt,  
> – Turborepo `package.json` tasks,  
> – an OpenAPI-from-Zod generator script,  
> – a minimal contracts index, and  
> – a **typed HTTP client wrapper** for web/mobile using `openapi-fetch`.

---

## File: `.cursor/rules`
```text
# DriveFlow – Cursor/Claude Working Rules (AI must follow)

## Golden principles
- Contract-first: Types come from @driveflow/contracts (Zod). OpenAPI is generated from Zod. Never invent types or DTOs.
- Thin controllers, pure services: Controllers only validate, authorize, and delegate. Side-effects live in job handlers.
- One source of truth: Prisma schema (DB) + Zod schemas (IO). Keep them in sync in the same PR.
- Small diffs win: Prefer adding functions over editing large ones. Keep files < 300 LoC when possible.

## Monorepo boundaries
- apps/api, apps/worker: NestJS. Use DI, guards for RBAC, and repositories (Prisma).
- apps/web, apps/mobile: Consume generated OpenAPI types and the shared fetch client. No raw fetch.
- packages/contracts: Zod schemas & OpenAPI generation. Only place where request/response shapes are defined.
- packages/clients: Generated OpenAPI types + typed HTTP helper.
- packages/ui: shadcn components. No business logic.
- packages/testing: test factories and helpers.

## Coding rules (hard)
1. VALIDATION: All inbound data must be validated with Zod `.parse`. No unchecked `any`.
2. AUTHZ: Enforce RBAC with Nest guards. Roles: owner | admin | instructor | student.
3. ERRORS: Use typed ProblemDetails helpers; never throw raw strings. Map infra errors to 4xx/5xx consistently.
4. IO SEPARATION: Put Stripe/Postmark/Twilio/Maps calls in worker jobs (BullMQ). Controllers queue jobs only.
5. DB ACCESS: Only repositories talk to Prisma. Services never import Prisma directly.
6. LOGGING: Use structured logger; never log PII or secrets. Prefix logs with domain context.
7. TESTS: Every PR that adds routes or complex logic must add tests (happy path + one failure + auth).
8. MIGRATIONS: Destructive changes require a safe plan + data backfill in the PR description.
9. TELEMETRY: Add tracing spans on hot paths (bookings, payments, gps ingest).
10. CONSISTENCY: Prefer existing libs (TanStack Query, react-hook-form, zodResolver, Socket.IO). Do not add similar deps.

## File & naming conventions
- Controllers: `<resource>.controller.ts` with route prefix `/v1/<resource>`.
- Services: pure methods, no IO, tested in isolation.
- Repos: `<resource>.repo.ts` with only Prisma access.
- DTO/Contracts: pulled from `@driveflow/contracts`. No local copies.
- Events: `<domain>.<event>.ts` as typed payloads in packages/contracts (used by workers).

## API style
- REST, versioned `/v1`.
- Idempotency keys for POST where appropriate (payments).
- Pagination: cursor-based (`?cursor=...&limit=...`).
- Errors: RFC7807 ProblemDetails shape.

## Frontend rules
- Server-first data (Query). Minimal local state.
- Forms: react-hook-form + zodResolver.
- No direct window.fetch; use `@driveflow/clients` helper.
- Real-time via Socket.IO client; subscribe/unsubscribe on mount/unmount.

## Security & privacy
- Data residency: AU. Never export PII in logs.
- Background location: explicit consent per-lesson; app must show persistent indicator (mobile).
- Stripe webhooks: verify signatures; handle retries idempotently.

## PR checklist (AI must self-verify)
- [ ] Updated Zod contract and regenerated OpenAPI + types (`pnpm gen`).
- [ ] Added/updated tests.
- [ ] Updated docs/domain state table if states changed.
- [ ] No secrets in code. Env vars fetched via typed env helper.
- [ ] Lint/Typecheck/Test/Build all pass locally.

## Banned
- Ad-hoc DTO interfaces
- Business logic inside controllers
- Direct Prisma access from controllers/services
- Fetch without the typed client
- Disabling lint/test to pass CI
```

---

## File: `prompts/module-scaffold.prompt.md`
```markdown
# Goal
Scaffold a new **NestJS domain module** for DriveFlow using our contract-first pattern and junior-friendly structure.

## Inputs (fill these before running)
- Domain: <Domain> (e.g., Bookings)
- Resource: <Resource> (e.g., Booking)
- Routes: describe endpoints (e.g., POST /v1/bookings, GET /v1/bookings/:id, PATCH /v1/bookings/:id/cancel)
- Zod contracts: ensure request/response schemas exist in `packages/contracts/src/<domain>.ts`

## Deliverables (create these files)
```
apps/api/src/<domain>/<resource>.controller.ts
apps/api/src/<domain>/<resource>.service.ts
apps/api/src/<domain>/<resource>.repo.ts
apps/api/src/<domain>/<domain>.module.ts
apps/api/src/<domain>/__tests__/<resource>.controller.spec.ts
apps/api/src/<domain>/__tests__/<resource>.service.spec.ts
```

## Requirements
1) **Contracts**  
   - Import request/response schemas and types from `@driveflow/contracts`.
   - Validate all inputs in the controller with Zod `.parse()`.

2) **Controller**  
   - Prefix routes with `/v1/<resourcePlural>`.
   - Use guards to enforce RBAC (owner|admin|instructor|student). Parameterize roles via decorators.
   - Map errors to RFC7807 ProblemDetails (use our helper).

3) **Service (pure)**  
   - No IO. Only business rules and state transitions.
   - Accept repositories as constructor deps (injected by module).
   - Expose clear methods (e.g., `create`, `getById`, `cancel`, `list`).

4) **Repository**  
   - Prisma only. No business rules.
   - Return plain domain objects (typed), not Prisma models.

5) **Events & Jobs**  
   - If there are side-effects (emails, payments), enqueue BullMQ jobs from the controller. Do not call external SDKs here.

6) **Tests**  
   - Service unit tests: happy path + one invalid transition.
   - Controller tests: auth guard, validation error, success.
   - Use factories from `packages/testing` for payloads where possible.

7) **Docs**  
   - Ensure `packages/contracts` has up-to-date Zod schemas & OpenAPI tags for the resource.
   - Run `pnpm gen` and commit any generated diffs.

## Starter skeletons

### Controller
```ts
import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { RolesGuard, Roles } from '@/core/auth/roles.guard';
import { <Resource>Service } from './<resource>.service';
import { <Resource>CreateSchema, <Resource>ResponseSchema, <Resource>Create, <Resource>Id } from '@driveflow/contracts';
import { problem } from '@/core/http/problem';

@Controller('v1/<resourcePlural>')
@UseGuards(RolesGuard)
export class <Resource>Controller {
  constructor(private readonly svc: <Resource>Service) {}

  @Post()
  @Roles('owner','admin')
  async create(@Body() body: unknown) {
    const input = <Resource>CreateSchema.parse(body);
    try {
      const result = await this.svc.create(input);
      return <Resource>ResponseSchema.parse(result);
    } catch (e) {
      throw problem.map(e);
    }
  }

  @Get(':id')
  @Roles('owner','admin','instructor','student')
  async get(@Param('id') id: string) {
    const result = await this.svc.getById(id as <Resource>Id);
    return <Resource>ResponseSchema.parse(result);
  }

  // add other routes similarly...
}
```

### Service (pure)
```ts
import { Injectable } from '@nestjs/common';
import { <Resource>Repo } from './<resource>.repo';
import { <Resource>Create, <Resource>Entity } from '@driveflow/contracts';

@Injectable()
export class <Resource>Service {
  constructor(private readonly repo: <Resource>Repo) {}

  async create(input: <Resource>Create): Promise<<Resource>Entity> {
    // Example invariant checks here…
    const saved = await this.repo.create(input);
    return saved;
  }

  async getById(id: string): Promise<<Resource>Entity> {
    const found = await this.repo.getById(id);
    // throw domain error if not found (handled by problem mapper)
    return found;
  }
}
```

### Repository
```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/prisma.service';
import { <Resource>Create, <Resource>Entity } from '@driveflow/contracts';

@Injectable()
export class <Resource>Repo {
  constructor(private readonly db: PrismaService) {}

  async create(input: <Resource>Create): Promise<<Resource>Entity> {
    const rec = await this.db.<resource>.create({ data: input });
    return rec as unknown as <Resource>Entity;
  }

  async getById(id: string): Promise<<Resource>Entity> {
    const rec = await this.db.<resource>.findUniqueOrThrow({ where: { id }});
    return rec as unknown as <Resource>Entity;
  }
}
```

## Acceptance checklist (AI must verify)
- [ ] All inputs/outputs parsed with Zod.
- [ ] Guards and roles correctly applied.
- [ ] No external SDK calls in controller/service.
- [ ] Tests added and passing.
- [ ] `pnpm gen` run; generated OpenAPI/types committed.
```
```

---

## File: `package.json` (root, Turborepo task set)
```json
{
  "name": "driveflow",
  "private": true,
  "packageManager": "pnpm@9",
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "start": "turbo run start",
    "clean": "turbo run clean && rimraf node_modules",
    "check": "turbo run lint typecheck test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "e2e": "turbo run e2e",
    "gen": "pnpm gen:openapi && pnpm gen:clients",
    "gen:openapi": "tsx scripts/openapi-from-zod.ts",
    "gen:clients": "openapi-typescript packages/contracts/openapi.json -o packages/clients/src/types.ts",
    "prisma:generate": "pnpm -C apps/api prisma generate",
    "prisma:migrate:dev": "pnpm -C apps/api prisma migrate dev",
    "prisma:migrate:deploy": "pnpm -C apps/api prisma migrate deploy",
    "prepare": "husky install"
  },
  "devDependencies": {
    "@antfu/eslint-config": "^3.10.0",
    "@commitlint/cli": "^19.3.0",
    "@commitlint/config-conventional": "^19.2.2",
    "@types/jest": "^29.5.12",
    "@types/node": "^22.5.0",
    "@types/ws": "^8.5.10",
    "@vercel/ncc": "^0.38.1",
    "dotenv-cli": "^7.4.2",
    "eslint": "^9.9.0",
    "husky": "^9.1.4",
    "jest": "^29.7.0",
    "openapi-typescript": "^7.4.2",
    "prettier": "^3.3.3",
    "rimraf": "^6.0.1",
    "turbo": "^2.0.6",
    "tsx": "^4.16.2",
    "typescript": "^5.5.4"
  },
  "dependencies": {
    "@asteasolutions/zod-to-openapi": "^7.1.0",
    "@prisma/client": "^5.18.0",
    "bullmq": "^5.7.7",
    "openapi-fetch": "^0.11.2",
    "zod": "^3.23.8"
  }
}
```

---

## File: `scripts/openapi-from-zod.ts`
```ts
// Produces packages/contracts/openapi.json from Zod schemas.
// Run via: pnpm gen:openapi
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
  const contractsPath = resolve(process.cwd(), 'packages/contracts/src/index.ts');
  const contracts = await import(pathToFileURL(contractsPath).toString());
  const doc = (contracts as any).openApiDoc;

  if (!doc) {
    console.error('❌ Expected packages/contracts/src/index.ts to export openApiDoc');
    process.exit(1);
  }

  const out = resolve(process.cwd(), 'packages/contracts/openapi.json');
  writeFileSync(out, JSON.stringify(doc, null, 2));
  console.log(`✅ Wrote OpenAPI to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

## File: `packages/contracts/src/index.ts` (minimal working example)
```ts
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

/** ===== Example schemas (replace with real ones) ===== */
export const BookingCreate = z.object({
  studentId: z.string().uuid(),
  instructorId: z.string().uuid(),
  startAt: z.string().datetime(),
  durationMin: z.number().int().positive()
});
export const Booking = BookingCreate.extend({
  id: z.string().uuid(),
  status: z.enum(['requested','confirmed','in_progress','completed','cancelled'])
});
export const ProblemDetails = z.object({
  type: z.string().optional(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
  instance: z.string().optional()
}).passthrough();

/** ===== Registry: register schemas + endpoints ===== */
const registry = new OpenAPIRegistry();

registry.register('Booking', Booking);
registry.register('ProblemDetails', ProblemDetails);

registry.registerPath({
  method: 'post',
  path: '/v1/bookings',
  request: {
    body: {
      content: { 'application/json': { schema: BookingCreate, example: {
        studentId: '11111111-1111-1111-1111-111111111111',
        instructorId: '22222222-2222-2222-2222-222222222222',
        startAt: new Date().toISOString(),
        durationMin: 90
      } } }
    }
  },
  responses: {
    201: {
      description: 'Created',
      content: { 'application/json': { schema: Booking } }
    },
    400: {
      description: 'Bad Request',
      content: { 'application/json': { schema: ProblemDetails } }
    }
  },
  tags: ['Bookings']
});

/** ===== Generate final OpenAPI document ===== */
const generator = new OpenApiGeneratorV3(registry.definitions);
export const openApiDoc = generator.generateDocument({
  openapi: '3.0.3',
  info: { title: 'DriveFlow API', version: '1.0.0' },
  paths: {},
  components: {}
});
```

---

## File: `packages/clients/src/index.ts` (Typed HTTP client wrapper)
```ts
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
```

---

## (Optional) File: `packages/clients/src/README.md` (Quick usage)
```md
# @driveflow/clients

Typed HTTP client generated from OpenAPI + `openapi-fetch`.

## Generate types

\`\`\`
pnpm gen
\`\`\`

This writes `packages/clients/src/types.ts` from `packages/contracts/openapi.json`.

## Use in Web (Next.js)

```ts
import { makeClient } from '@driveflow/clients';

export const api = makeClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  getAuthToken: () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
});
```

## Use in Mobile (Expo)

```ts
import { makeClient } from '@driveflow/clients';
import * as SecureStore from 'expo-secure-store';

export const api = makeClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL!,
  getAuthToken: async () => SecureStore.getItemAsync('token')
});
```
```

---

## Suggested workspace structure (for context)
```
/driveflow
  /apps
    /web
    /mobile
    /api
    /worker
  /packages
    /contracts
      /src/index.ts
      openapi.json (generated)
    /clients
      /src/index.ts
      /src/types.ts (generated)
    /ui
    /testing
  /prompts
    module-scaffold.prompt.md
  /.cursor
    rules
  /scripts
    openapi-from-zod.ts
  package.json
```

---

## How to bootstrap
1) Create the folders and files above.  
2) Run:
```
pnpm i
pnpm gen           # builds OpenAPI and typed client
```
3) Import and use `@driveflow/clients` in web/mobile.  
4) When you add/modify Zod contracts, **always** run `pnpm gen` and commit the diffs.
