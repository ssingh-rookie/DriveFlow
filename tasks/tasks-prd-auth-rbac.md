# Task List: JWT Authentication & Role-Based Permissions

## Relevant Files

### New Files to Create
- `apps/api/src/modules/auth/auth.module.ts` - NestJS authentication module ✅
- `apps/api/src/modules/auth/auth.controller.ts` - Auth endpoints (login, refresh, logout) ✅
- `apps/api/src/modules/auth/auth.service.ts` - Authentication business logic ✅
- `apps/api/src/modules/auth/auth.repo.ts` - Database access for users and refresh tokens ✅
- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` - JWT authentication guard
- `apps/api/src/modules/auth/guards/role.guard.ts` - Role-based authorization guard
- `apps/api/src/modules/auth/guards/org-scope.guard.ts` - Organization scoping guard
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` - Passport JWT strategy
- `apps/api/src/modules/auth/decorators/roles.decorator.ts` - Roles decorator for endpoints
- `apps/api/src/modules/auth/decorators/current-user.decorator.ts` - Current user decorator
- `apps/api/src/modules/auth/utils/jwt.util.ts` - JWT token utilities
- `apps/api/src/modules/auth/utils/password.util.ts` - Password hashing utilities
- `apps/api/src/modules/auth/utils/permissions.util.ts` - Permission checking utilities
- `packages/contracts/src/auth/index.ts` - Auth-related Zod schemas and types ✅
- `packages/contracts/src/auth/auth.schemas.ts` - Login, refresh, user schemas ✅
- `packages/contracts/src/auth/permission.schemas.ts` - Permission and role schemas ✅

### Existing Files to Modify
- `apps/api/prisma/schema.prisma` - Add password field to User model and RefreshToken model
- `apps/api/src/app.module.ts` - Import AuthModule
- `apps/api/src/main.ts` - Add JWT authentication setup
- `packages/contracts/src/index.ts` - Export auth schemas
- `apps/api/package.json` - Add JWT and crypto dependencies

### Test Files
- `apps/api/src/modules/auth/auth.service.spec.ts` - Auth service unit tests
- `apps/api/src/modules/auth/auth.controller.spec.ts` - Auth controller integration tests
- `apps/api/src/modules/auth/guards/jwt-auth.guard.spec.ts` - JWT guard tests
- `apps/api/src/modules/auth/guards/role.guard.spec.ts` - Role guard tests
- `apps/api/src/modules/auth/utils/jwt.util.spec.ts` - JWT utility tests
- `apps/api/src/modules/auth/utils/password.util.spec.ts` - Password utility tests
- `apps/api/src/modules/auth/utils/permissions.util.spec.ts` - Permission utility tests

### Notes
- Follow DriveFlow architecture patterns and multi-tenancy requirements
- Use `@driveflow/contracts` for all type definitions and validation
- Implement proper RBAC with organization-scoped permissions
- Include orgId filtering for all database operations where applicable
- Add comprehensive audit logging for authentication events
- Ensure JWT tokens include necessary claims (sub, role, orgId)
- Implement refresh token rotation for security
- Use bcrypt for password hashing with minimum cost factor 10

## Tasks

- [x] 1.0 Database Schema & Contracts Enhancement
  - [x] 1.1 Add password field to User model in Prisma schema
  - [x] 1.2 Create RefreshToken model with rotation fields (jti, rotation_id, used, expires_at)
  - [x] 1.3 Run Prisma migration to apply database changes
  - [x] 1.4 Create auth Zod schemas in packages/contracts (LoginDto, RefreshDto, AuthResponseDto)
  - [x] 1.5 Create permission and role validation schemas
  - [x] 1.6 Export auth schemas from contracts index and regenerate types

- [x] 2.0 Core Authentication Infrastructure
  - [x] 2.1 Create auth module structure (module, controller, service, repo files)
  - [x] 2.2 Install required dependencies (bcrypt, jsonwebtoken, passport-jwt)
  - [x] 2.3 Implement password hashing utilities with bcrypt (cost factor 10)
  - [x] 2.4 Create user repository methods for authentication queries
  - [x] 2.5 Create refresh token repository with rotation management
  - [x] 2.6 Set up environment variables for JWT secrets

- [ ] 3.0 JWT Implementation & Token Management
  - [x] 3.1 Create JWT utility functions (generate, verify, decode)
  - [x] 3.2 Implement access token generation with proper claims (sub, role, orgId, exp)
  - [x] 3.3 Implement refresh token generation with rotation tracking
  - [x] 3.4 Create token validation middleware with error handling
  - [x] 3.5 Implement refresh token rotation logic (single-use, replay detection)
  - [ ] 3.6 Add JWT blacklist/revocation mechanism

- [ ] 4.0 Role-Based Authorization System
  - [ ] 4.1 Create JWT authentication guard using Passport strategy
  - [ ] 4.2 Implement role-based authorization guard with permission matrix
  - [ ] 4.3 Create organization scoping guard for multi-tenancy
  - [ ] 4.4 Implement permission checking utilities (can user access resource)
  - [ ] 4.5 Create decorators for roles and current user extraction
  - [ ] 4.6 Add scoped permission logic (instructor assigned students, parent-child relationship)

- [ ] 5.0 API Integration & Security Middleware
  - [ ] 5.1 Implement auth controller endpoints (POST /auth/login, /auth/refresh, /auth/logout)
  - [ ] 5.2 Add authentication service methods (login, refresh, logout, validate)
  - [ ] 5.3 Integrate guards with existing app module and setup global guards
  - [ ] 5.4 Add audit logging for authentication events (login, logout, failures)
  - [ ] 5.5 Implement comprehensive error handling and security responses
  - [ ] 5.6 Add user profile endpoints (GET /users/me, PATCH /users/me) with proper authorization
