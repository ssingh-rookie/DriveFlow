import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ===== Enums and Simple Types =====

export const StripeOnboardingStatus = z.enum([
  'not_started',
  'pending',
  'restricted',
  'complete',
]);

// ===== API DTOs =====

export const StripeConnectLinkDto = z.object({
  url: z.string().url(),
}).openapi('StripeConnectLinkDto');

export const PayoutReadinessDto = z.object({
  ready: z.boolean(),
  status: StripeOnboardingStatus,
  capabilities: z.record(z.string()),
  missing_requirements: z.array(z.string()),
  last_updated: z.string().datetime(),
}).openapi('PayoutReadinessDto');

// ===== Webhook Schemas =====

export const StripeWebhookEvent = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.any()),
  }),
}).openapi('StripeWebhookEvent');

// ===== Type Exports =====

export type StripeOnboardingStatus = z.infer<typeof StripeOnboardingStatus>;
export type StripeConnectLinkDto = z.infer<typeof StripeConnectLinkDto>;
export type PayoutReadinessDto = z.infer<typeof PayoutReadinessDto>;
export type StripeWebhookEvent = z.infer<typeof StripeWebhookEvent>;
