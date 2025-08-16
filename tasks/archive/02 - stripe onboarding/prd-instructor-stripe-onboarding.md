# PRD: Instructor Stripe Onboarding

## Overview

This document outlines the requirements for onboarding DriveFlow instructors onto Stripe using Stripe Connect. The primary goal is to enable instructors to become "payments-ready" so they can receive payouts for lessons. This feature is critical for monetizing the platform and ensuring a seamless financial experience for our instructors.

## Goals

- **Enable Instructor Payouts**: Allow instructors to securely connect their bank accounts via Stripe to receive payments.
- **High Conversion Rate**: Achieve a ≥ 80% conversion rate for instructors who start the onboarding process.
- **Automated Readiness Tracking**: Ensure ≥ 95% of connected accounts achieve `card_payments=active` and `transfers=active` status.
- **Reliable Webhook Handling**: Guarantee 100% of Stripe webhook updates are processed idempotently and reflected in the UI within 10 seconds.

## User Stories

- **As an Instructor**, I want to easily connect my bank account using a secure, Stripe-hosted form so that I can get paid for the lessons I deliver.
- **As an Instructor**, I want to see the status of my payout account (e.g., "Pending", "Ready") and be prompted with clear action items if my account requires more information.
- **As an Admin**, I want to view the payout-readiness status of my instructors to ensure they are set up to receive payments before they start taking bookings.
- **(Future) As an Instructor with an existing Stripe account**, I want to connect my existing Standard account via OAuth so I don't have to create a new one.

## Functional Requirements

1.  **Stripe Express Account Creation**:
    - When an instructor initiates payout setup, the system shall create a new Stripe Express Connect account for them if one does not already exist.
    - The `stripe_account_id` must be securely stored against the instructor's record in our database.
2.  **Hosted Onboarding Flow**:
    - The system must generate a short-lived, single-use Stripe Account Link for the hosted onboarding flow.
    - The user must be redirected to this Stripe-hosted URL to complete their KYC and bank account setup.
    - `return_url` and `refresh_url` must be configured to bring the user back to the DriveFlow application upon completion or session expiry.
3.  **Webhook Integration**:
    - The system must provide a secure webhook endpoint to receive updates from Stripe.
    - Webhook signatures must be verified to ensure authenticity.
    - The system must process `account.updated` and `capabilities.updated` events to track the instructor's onboarding status.
    - Webhook handling must be idempotent, using the `event.id` to prevent duplicate processing.
4.  **Payout Readiness Status**:
    - The API must provide an endpoint to check an instructor's payout readiness.
    - The status shall be derived from Stripe's `capabilities` ( `card_payments` and `transfers`) and `requirements` objects.
    - The UI must display one of the following states: `Not Started`, `Pending`, `Restricted`, `Complete`.
    - If status is `Pending` or `Restricted`, the UI must display the specific missing requirements to the instructor.
5.  **(Optional/Feature-Flagged) OAuth for Standard Accounts**:
    - The system shall provide an OAuth flow for instructors with existing Stripe Standard accounts to connect.
    - OAuth `state` parameter must be used for CSRF protection.
    - The system must securely store OAuth access and refresh tokens (encrypted at rest).

## Non-Goals (Out of Scope for MVP)

- Onboarding for driving schools/organizations.
- Detailed payout reporting UI beyond the basic readiness status.
- Automated financial reconciliation or data exports.
- Handling disputes or chargebacks within the DriveFlow UI.

## Design Considerations

- The UI should feature a clear Call-to-Action (CTA) such as "Connect payouts with Stripe".
- The status of the connection should be clearly displayed (e.g., "Finish Stripe setup", "Action required", "Stripe connected ✓").
- When action is required, the UI should list the specific information Stripe needs (e.g., "Provide a government ID", "Add a bank account").
- All UI components should be sourced from or align with the `packages/ui` library.

## Technical Requirements

- **Database Schema Changes**:
  - The `instructors` table in `apps/api/prisma/schema.prisma` will be modified to include:
    - `stripe_account_id` (TEXT, UNIQUE)
    - `stripe_onboarding_status` (TEXT, `not_started | pending | restricted | complete`)
    - `stripe_capabilities` (JSONB)
    - `stripe_requirements_due` (JSONB)
    - `stripe_connected_at` (TIMESTAMPTZ)
    - `stripe_disconnected_at` (TIMESTAMPTZ, NULLABLE)
- **API Endpoints**:
  - **BFF**:
    - `GET /instructors/{instructorId}/stripe/connect-link`
    - `GET /instructors/{instructorId}/payout-readiness`
  - **Payments Service (Internal)**:
    - `POST /payments/stripe/accounts`
    - `GET /payments/stripe/accounts/{stripeAccountId}/status`
    - `POST /webhooks/stripe`
- **External Integrations**:
  - Stripe Connect API (`/v1/accounts`, `/v1/account_links`).
  - Stripe Webhooks.
- **Configuration**:
  - New environment variables required: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_BASE_URL`.

## Multi-Tenancy & Security

- **Organization Scoping**: All API endpoints must be scoped by `orgId`. An admin or owner should only be able to manage instructors within their own organization.
- **Role-Based Access Control**:
  - **Instructor**: Can only initiate onboarding for themselves.
  - **Admin/Owner**: Can view the readiness status of instructors in their organization.
- **Data Privacy**: No sensitive PII (like bank account numbers or government IDs) should ever be stored on DriveFlow's servers. All KYC information is handled by Stripe's hosted onboarding.

## Success Metrics

- **Onboarding Funnel Conversion**: Track the number of instructors who click the "Connect" CTA vs. those who successfully achieve `complete` status.
- **Time to Onboard**: Measure the average time from an instructor clicking "Connect" to reaching `complete` status.
- **Webhook Processing Time**: Monitor the latency between a webhook being sent by Stripe and the status being updated in our database and reflected in the UI.

## Implementation Phases

1.  **Phase 1: Database & Core Logic**
    - Implement database migrations for the `instructors` table.
    - Create the core service logic to create Stripe Express accounts and generate account links.
    - Implement the `GET /instructors/{instructorId}/stripe/connect-link` endpoint.
2.  **Phase 2: Webhook Handling**
    - Implement the `/webhooks/stripe` endpoint.
    - Add logic to verify webhook signatures and handle `account.updated` events.
    - Map Stripe's status to our internal `stripe_onboarding_status`.
3.  **Phase 3: Payout Readiness UI**
    - Implement the `GET /instructors/{instructorId}/payout-readiness` endpoint.
    - Build the UI components to display the instructor's status and any required actions.
4.  **Phase 4: Payments Integration**
    - Integrate destination charges with the existing lesson booking flow.

## Open Questions

- **Duplicate Accounts**: What is the policy if an instructor tries to connect a Stripe account that is already associated with another instructor in our system? (Default: Block).
- **Refund Policy**: What is our business policy regarding refunding the platform fee when a lesson is refunded?
- **Regional Support**: The initial implementation will focus on Australia (`AU`). What is the plan for supporting other regions?
