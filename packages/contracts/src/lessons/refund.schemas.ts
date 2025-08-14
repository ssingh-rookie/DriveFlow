import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { CancellationActor } from './lesson.schemas';

extendZodWithOpenApi(z);

// ===== Refund Calculation Schemas =====

export const RefundCalculationRequest = z.object({
  lessonId: z.string().uuid('Invalid lesson ID'),
  actor: CancellationActor,
  reason: z.string().min(1).max(500),
  cancellationTime: z.string().datetime().optional() // Defaults to now
}).openapi('RefundCalculationRequest');

export const RefundPolicyDto = z.object({
  id: z.string().uuid(),
  actor: CancellationActor,
  hoursBeforeStart: z.number().int().min(0),
  refundPercentage: z.number().int().min(0).max(100),
  feeCents: z.number().int().min(0),
  description: z.string().optional(),
  isActive: z.boolean()
}).openapi('RefundPolicyDto');

export const RefundBreakdownDto = z.object({
  // Original amounts
  originalAmountCents: z.number().int(),
  platformFeeCents: z.number().int(),
  instructorShareCents: z.number().int(),
  
  // Policy applied
  applicablePolicy: RefundPolicyDto,
  hoursBeforeStart: z.number(), // Actual hours before lesson start
  
  // Calculated amounts
  refundPercentage: z.number().min(0).max(100),
  refundAmountCents: z.number().int().min(0),
  retainedAmountCents: z.number().int().min(0),
  processingFeeCents: z.number().int().min(0),
  
  // Net amounts
  studentRefundCents: z.number().int().min(0), // Amount to refund to student
  platformRetainedCents: z.number().int().min(0),
  instructorRetainedCents: z.number().int().min(0),
  
  currency: z.string().length(3).default('AUD')
}).openapi('RefundBreakdownDto');

export const RefundCalculationResponse = z.object({
  lessonId: z.string().uuid(),
  eligible: z.boolean(),
  refundBreakdown: RefundBreakdownDto.optional(),
  
  // If not eligible
  ineligibilityReasons: z.array(z.object({
    code: z.enum([
      'ALREADY_STARTED',
      'ALREADY_COMPLETED', 
      'ALREADY_CANCELLED',
      'TOO_LATE_TO_CANCEL',
      'NO_APPLICABLE_POLICY',
      'PAYMENT_NOT_PROCESSED'
    ]),
    message: z.string()
  })).optional(),
  
  // Alternative options
  alternativeOptions: z.array(z.object({
    type: z.enum(['RESCHEDULE', 'CREDIT', 'PARTIAL_REFUND']),
    description: z.string(),
    amountCents: z.number().int().optional()
  })).optional(),
  
  warnings: z.array(z.string()).optional() // e.g., "This will be your 3rd cancellation this month"
}).openapi('RefundCalculationResponse');

// ===== Refund Processing =====

export const ProcessRefundRequest = z.object({
  lessonId: z.string().uuid(),
  actor: CancellationActor,
  reason: z.string().min(1).max(500),
  confirmCalculation: RefundBreakdownDto, // Must match current calculation
  notifyStudent: z.boolean().default(true),
  notifyInstructor: z.boolean().default(true)
}).openapi('ProcessRefundRequest');

export const RefundProcessingResponse = z.object({
  refundId: z.string().uuid(),
  status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED', 'PENDING_APPROVAL']),
  refundBreakdown: RefundBreakdownDto,
  
  // Payment processing details
  stripeRefundId: z.string().optional(),
  estimatedCompletionTime: z.string().datetime().optional(),
  
  // Notifications sent
  notificationsSent: z.object({
    student: z.boolean(),
    instructor: z.boolean(),
    admin: z.boolean().optional()
  }),
  
  message: z.string().optional(),
  nextSteps: z.array(z.string()).optional()
}).openapi('RefundProcessingResponse');

// ===== Cancellation Policy Management =====

export const CancellationPolicyDto = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  actor: CancellationActor,
  hoursBeforeStart: z.number().int().min(0),
  refundPercentage: z.number().int().min(0).max(100),
  feeCents: z.number().int().min(0),
  isActive: z.boolean(),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).openapi('CancellationPolicyDto');

export const CreateCancellationPolicyRequest = z.object({
  actor: CancellationActor,
  hoursBeforeStart: z.number().int().min(0),
  refundPercentage: z.number().int().min(0).max(100),
  feeCents: z.number().int().min(0).default(0),
  description: z.string().optional()
}).openapi('CreateCancellationPolicyRequest');

export const UpdateCancellationPolicyRequest = CreateCancellationPolicyRequest.partial().extend({
  isActive: z.boolean().optional()
}).openapi('UpdateCancellationPolicyRequest');

export const CancellationPoliciesResponse = z.object({
  policies: z.array(CancellationPolicyDto),
  summary: z.object({
    totalPolicies: z.number().int(),
    activePolicies: z.number().int(),
    policiesByActor: z.object({
      student: z.number().int(),
      parent: z.number().int(),
      instructor: z.number().int(),
      admin: z.number().int()
    })
  })
}).openapi('CancellationPoliciesResponse');

// ===== Reschedule Fee Calculation =====

export const RescheduleCalculationRequest = z.object({
  lessonId: z.string().uuid(),
  newStartAt: z.string().datetime(),
  newEndAt: z.string().datetime(),
  actor: CancellationActor,
  reason: z.string().min(1).max(500)
}).refine(
  (data) => new Date(data.newEndAt) > new Date(data.newStartAt),
  { message: 'New end time must be after new start time', path: ['newEndAt'] }
).openapi('RescheduleCalculationRequest');

export const RescheduleBreakdownDto = z.object({
  // Original lesson details
  originalStartAt: z.string().datetime(),
  originalPriceCents: z.number().int(),
  
  // New lesson details
  newStartAt: z.string().datetime(),
  newPriceCents: z.number().int(),
  
  // Fee calculation
  hoursNoticeGiven: z.number(),
  rescheduleFeeCents: z.number().int().min(0),
  priceDifferenceCents: z.number().int(), // Can be negative
  
  // Net charges
  additionalChargeCents: z.number().int(), // Total additional amount (can be 0 or negative)
  refundAmountCents: z.number().int().min(0).optional(), // If negative total
  
  // Policy applied
  applicablePolicy: z.object({
    actor: CancellationActor,
    hoursBeforeStart: z.number().int(),
    feePercentage: z.number().min(0).max(100),
    minimumFeeCents: z.number().int().min(0)
  }),
  
  currency: z.string().length(3).default('AUD')
}).openapi('RescheduleBreakdownDto');

export const RescheduleCalculationResponse = z.object({
  lessonId: z.string().uuid(),
  eligible: z.boolean(),
  rescheduleBreakdown: RescheduleBreakdownDto.optional(),
  
  // If not eligible
  ineligibilityReasons: z.array(z.object({
    code: z.enum([
      'ALREADY_STARTED',
      'ALREADY_COMPLETED',
      'TOO_MANY_RESCHEDULES',
      'INSTRUCTOR_NOT_AVAILABLE',
      'WITHIN_RESTRICTION_PERIOD'
    ]),
    message: z.string()
  })).optional(),
  
  warnings: z.array(z.string()).optional()
}).openapi('RescheduleCalculationResponse');

// ===== Type exports =====
export type RefundCalculationReq = z.infer<typeof RefundCalculationRequest>;
export type RefundCalculationRes = z.infer<typeof RefundCalculationResponse>;
export type RefundBreakdown = z.infer<typeof RefundBreakdownDto>;
export type ProcessRefundReq = z.infer<typeof ProcessRefundRequest>;
export type RefundProcessingRes = z.infer<typeof RefundProcessingResponse>;
export type CancellationPolicy = z.infer<typeof CancellationPolicyDto>;
export type CreateCancellationPolicyReq = z.infer<typeof CreateCancellationPolicyRequest>;
export type RescheduleCalculationReq = z.infer<typeof RescheduleCalculationRequest>;
export type RescheduleCalculationRes = z.infer<typeof RescheduleCalculationResponse>;
export type RescheduleBreakdown = z.infer<typeof RescheduleBreakdownDto>;