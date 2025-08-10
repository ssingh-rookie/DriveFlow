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
