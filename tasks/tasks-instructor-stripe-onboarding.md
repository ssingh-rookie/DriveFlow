# Task List: Instructor Stripe Onboarding

## Relevant Files

### New Files Created
- `apps/api/src/modules/payments/payments.module.ts` - NestJS module for payments
- `apps/api/src/modules/payments/payments.controller.ts` - HTTP endpoints for payments
- `apps/api/src/modules/payments/payments.service.ts` - Business logic for payments
- `apps/api/src/modules/payments/payments.repo.ts` - Database access for payments
- `apps/api/src/modules/payments/webhooks/stripe.webhook.ts` - Stripe webhook handler
- `packages/contracts/src/payments/index.ts` - Zod schemas and types for payments
- `packages/contracts/src/payments/stripe.schemas.ts` - Stripe-related Zod schemas
- `apps/web/src/app/dashboard/instructors/[id]/payouts/page.tsx` - Instructor payout settings page
- `apps/web/src/components/instructors/StripeOnboarding.tsx` - Stripe onboarding UI component

### Existing Files Modified
- `apps/api/prisma/schema.prisma` - Add new fields to the `instructors` table
- `apps/api/src/app.module.ts` - Import the new `PaymentsModule`
- `packages/contracts/src/index.ts` - Export the new payment-related schemas

### Test Files
- `apps/api/src/modules/payments/payments.service.spec.ts` - Payments service unit tests
- `apps/api/src/modules/payments/payments.controller.spec.ts` - Payments controller integration tests
- `apps/web/src/components/instructors/StripeOnboarding.test.tsx` - UI component tests

### Notes
- Follow DriveFlow architecture patterns and multi-tenancy requirements
- Use `@driveflow/contracts` for all type definitions
- Implement proper RBAC with role guards
- Include `orgId` filtering for all database operations
- Add audit logging for business-critical operations

## Tasks

- [x] 1.0 Database Schema & Contracts
  - [x] 1.1 Add `stripe_account_id`, `stripe_onboarding_status`, `stripe_capabilities`, `stripe_requirements_due`, `stripe_connected_at`, and `stripe_disconnected_at` fields to the `instructors` table in `schema.prisma`.
  - [x] 1.2 Create Stripe-related Zod schemas in `packages/contracts/src/payments/stripe.schemas.ts` for the connect link, payout readiness, and webhook events.
  - [x] 1.3 Export the new schemas from `packages/contracts/src/index.ts`.
  - [x] 1.4 Run `pnpm prisma migrate dev` to apply the database changes.

- [ ] 2.0 Core Payments Service Logic
  - [x] 2.1 Create the `PaymentsModule`, `PaymentsService`, and `PaymentsRepository`.
  - [x] 2.2 Implement the `ensureExpressAccountAndLink` method in `PaymentsService` to create Stripe accounts and generate onboarding links.
  - [x] 2.3 Implement the `getStripeAccountStatus` method in `PaymentsService` to fetch and return the status of a Stripe account.
  - [x] 2.4 Implement the Stripe webhook handler to process `account.updated` and `capabilities.updated` events.
  - [x] 2.5 Add webhook signature verification to the webhook handler.

- [ ] 3.0 BFF and API Endpoints
  - [x] 3.1 Create the `PaymentsController` with the `GET /instructors/:id/stripe/connect-link` endpoint.
  - [x] 3.2 Create the `GET /instructors/:id/payout-readiness` endpoint in `PaymentsController`.
  - [x] 3.3 Create the `POST /webhooks/stripe` endpoint in `PaymentsController`.
  - [x] 3.4 Apply the `RoleGuard` and `OrgScopeGuard` to the new endpoints to ensure proper authorization.

- [ ] 4.0 Frontend UI
  - [ ] 4.1 Create the `StripeOnboarding` React component to display the instructor's Stripe connection status.
  - [ ] 4.2 Add a "Connect with Stripe" button that calls the `GET /instructors/:id/stripe/connect-link` endpoint and redirects the user.
  - [ ] 4.3 Display the instructor's payout readiness status (`Not Started`, `Pending`, `Restricted`, `Complete`).
  - [ ] 4.4 If the status is `Pending` or `Restricted`, display the missing requirements to the user.

- [ ] 5.0 Testing & Documentation
  - [ ] 5.1 Write unit tests for the `PaymentsService`, mocking the Stripe API and database interactions.
  - [ ] 5.2 Write integration tests for the `PaymentsController` to ensure the endpoints are working correctly.
  - [ ] 5.3 Write component tests for the `StripeOnboarding` component.
  - [ ] 5.4 Update the API documentation to include the new payment-related endpoints.
