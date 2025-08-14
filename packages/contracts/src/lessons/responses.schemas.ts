import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { BookingStatus, CancellationActor, LessonDto, PaginationMetaDto } from './lesson.schemas';

extendZodWithOpenApi(z);

// ===== Enhanced Response DTOs =====

// List view optimized DTO (minimal data for performance)
export const LessonListDto = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  instructorId: z.string().uuid(),
  serviceId: z.string().uuid(),
  
  // Essential timing
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: BookingStatus,
  
  // Essential pricing (just total for list view)
  priceCents: z.number().int(),
  currency: z.string().length(3).default('AUD'),
  
  // Display names (denormalized for performance)
  studentName: z.string(),
  instructorName: z.string(),
  serviceName: z.string(),
  
  // Key locations (addresses only for list)
  pickupAddress: z.string().optional(),
  dropoffAddress: z.string().optional(),
  
  // Status indicators
  isCancelled: z.boolean().default(false),
  isRescheduled: z.boolean().default(false),
  
  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).openapi('LessonListDto');

// Full detail DTO with all related data
export const LessonDetailsDto = LessonDto.extend({
  // Student details
  student: z.object({
    id: z.string().uuid(),
    fullName: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    dob: z.string().date().optional(),
    notes: z.string().optional()
  }),
  
  // Instructor details
  instructor: z.object({
    id: z.string().uuid(),
    displayName: z.string(),
    phone: z.string().optional(),
    licenseId: z.string().optional(),
    active: z.boolean(),
    // Stripe status for payment context
    stripeConnected: z.boolean().optional(),
    canReceivePayouts: z.boolean().optional()
  }),
  
  // Service details
  service: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    durationMin: z.number().int(),
    active: z.boolean()
  }),
  
  // Payment details
  payment: z.object({
    id: z.string().uuid(),
    status: z.enum(['intent_created', 'succeeded', 'failed', 'refunded']),
    stripePaymentIntentId: z.string(),
    stripeChargeId: z.string().optional(),
    refundId: z.string().optional(),
    refundAmount: z.number().int().optional()
  }).optional(),
  
  // State history (optional, loaded on request)
  stateHistory: z.array(z.object({
    id: z.string().uuid(),
    fromStatus: BookingStatus.optional(),
    toStatus: BookingStatus,
    actorUserId: z.string().uuid().optional(),
    actorName: z.string().optional(),
    reason: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    createdAt: z.string().datetime()
  })).optional(),
  
  // Cancellation policy applied (if cancelled)
  appliedCancellationPolicy: z.object({
    id: z.string().uuid(),
    actor: CancellationActor,
    hoursBeforeStart: z.number().int(),
    refundPercentage: z.number().int(),
    feeCents: z.number().int(),
    description: z.string().optional()
  }).optional(),
  
  // Related bookings (if rescheduled)
  previousBooking: z.object({
    id: z.string().uuid(),
    startAt: z.string().datetime(),
    status: BookingStatus
  }).optional(),
  
  // Upcoming scheduled transitions
  scheduledTransitions: z.array(z.object({
    id: z.string().uuid(),
    toStatus: BookingStatus,
    executeAt: z.string().datetime(),
    reason: z.string()
  })).optional()
}).openapi('LessonDetailsDto');

// ===== Pagination Response DTOs =====

export const LessonListResponseDto = z.object({
  data: z.array(LessonListDto),
  meta: PaginationMetaDto,
  summary: z.object({
    totalLessons: z.number().int(),
    statusBreakdown: z.object({
      draft: z.number().int().default(0),
      pending_payment: z.number().int().default(0),
      requested: z.number().int().default(0),
      confirmed: z.number().int().default(0),
      scheduled: z.number().int().default(0),
      in_progress: z.number().int().default(0),
      completed: z.number().int().default(0),
      cancelled: z.number().int().default(0),
      no_show: z.number().int().default(0)
    }),
    totalValueCents: z.number().int(),
    dateRange: z.object({
      earliest: z.string().datetime().optional(),
      latest: z.string().datetime().optional()
    })
  }).optional()
}).openapi('LessonListResponseDto');

export const LessonDetailsResponseDto = z.object({
  data: LessonDetailsDto,
  meta: z.object({
    includesHistory: z.boolean(),
    includesRelated: z.boolean(),
    lastModified: z.string().datetime(),
    etag: z.string().optional() // For caching
  }).optional()
}).openapi('LessonDetailsResponseDto');

// ===== Status Transition Response Schemas =====

export const LessonStatusTransitionDto = z.object({
  success: z.boolean(),
  lessonId: z.string().uuid(),
  previousStatus: BookingStatus,
  newStatus: BookingStatus,
  transitionId: z.string().uuid(), // State history entry ID
  timestamp: z.string().datetime(),
  actorId: z.string().uuid().optional(),
  reason: z.string().optional(),
  
  // Financial impact
  refund: z.object({
    eligible: z.boolean(),
    amountCents: z.number().int().optional(),
    processingFeeCents: z.number().int().optional(),
    netRefundCents: z.number().int().optional(),
    estimatedCompletionDays: z.number().int().optional()
  }).optional(),
  
  // Fees applied
  fees: z.object({
    cancellationFeeCents: z.number().int().optional(),
    rescheduleFeeCents: z.number().int().optional(),
    description: z.string().optional()
  }).optional(),
  
  // Next actions available to user
  availableActions: z.array(z.enum([
    'reschedule',
    'cancel',
    'start_lesson',
    'complete_lesson',
    'mark_no_show',
    'request_refund',
    'dispute_charge'
  ])).optional(),
  
  // Notifications sent
  notifications: z.object({
    student: z.boolean().default(false),
    instructor: z.boolean().default(false),
    guardians: z.array(z.string()).optional(),
    admin: z.boolean().default(false)
  }).optional(),
  
  message: z.string().optional(),
  warnings: z.array(z.string()).optional()
}).openapi('LessonStatusTransitionDto');

// ===== Creation Response =====

export const LessonCreationResponseDto = z.object({
  lesson: LessonDto,
  paymentRequired: z.boolean(),
  paymentIntent: z.object({
    id: z.string(),
    clientSecret: z.string(),
    amountCents: z.number().int(),
    currency: z.string().length(3)
  }).optional(),
  
  // Availability check results
  availabilityConfirmation: z.object({
    confirmed: z.boolean(),
    conflictsResolved: z.array(z.string()).optional(),
    alternatives: z.array(z.object({
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      reason: z.string()
    })).optional()
  }),
  
  // Required next steps
  nextSteps: z.array(z.object({
    action: z.enum(['complete_payment', 'confirm_booking', 'contact_instructor', 'upload_documents']),
    description: z.string(),
    dueBy: z.string().datetime().optional(),
    url: z.string().url().optional()
  })).optional(),
  
  warnings: z.array(z.string()).optional()
}).openapi('LessonCreationResponseDto');

// ===== Update Response =====

export const LessonUpdateResponseDto = z.object({
  lesson: LessonDto,
  changes: z.array(z.object({
    field: z.string(),
    previousValue: z.any().optional(),
    newValue: z.any(),
    reason: z.string().optional()
  })),
  
  // If rescheduled
  reschedule: z.object({
    feesApplied: z.boolean(),
    additionalPaymentRequired: z.boolean(),
    paymentIntent: z.object({
      id: z.string(),
      clientSecret: z.string(),
      amountCents: z.number().int()
    }).optional(),
    refundIssued: z.boolean(),
    refundAmountCents: z.number().int().optional()
  }).optional(),
  
  // Availability recheck
  availabilityRecheck: z.object({
    passed: z.boolean(),
    conflicts: z.array(z.string()).optional(),
    resolved: z.boolean()
  }).optional(),
  
  notifications: z.object({
    student: z.boolean(),
    instructor: z.boolean(),
    guardians: z.array(z.string()).optional()
  }),
  
  message: z.string().optional()
}).openapi('LessonUpdateResponseDto');

// ===== Error Response Schemas =====

export const LessonValidationErrorDto = z.object({
  type: z.literal('validation_error'),
  title: z.string().default('Lesson validation failed'),
  status: z.literal(400),
  detail: z.string(),
  instance: z.string().optional(),
  lessonId: z.string().uuid().optional(),
  
  // Validation-specific errors
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
    value: z.any().optional()
  })),
  
  // Suggested fixes
  suggestions: z.array(z.object({
    field: z.string(),
    suggestion: z.string(),
    autoFixable: z.boolean().default(false)
  })).optional()
}).openapi('LessonValidationErrorDto');

export const LessonConflictErrorDto = z.object({
  type: z.literal('booking_conflict'),
  title: z.string().default('Lesson booking conflict'),
  status: z.literal(409),
  detail: z.string(),
  instance: z.string().optional(),
  lessonId: z.string().uuid().optional(),
  
  // Conflict details
  conflicts: z.array(z.object({
    type: z.enum(['instructor_unavailable', 'double_booking', 'outside_working_hours', 'insufficient_travel_time']),
    conflictingBookingId: z.string().uuid().optional(),
    message: z.string(),
    severity: z.enum(['error', 'warning'])
  })),
  
  // Alternative options
  alternatives: z.array(z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    instructorId: z.string().uuid(),
    instructorName: z.string(),
    score: z.number().min(0).max(100),
    reason: z.string()
  })).optional(),
  
  // Quick resolution options
  autoResolution: z.object({
    available: z.boolean(),
    options: z.array(z.object({
      action: z.enum(['move_15min_earlier', 'move_15min_later', 'suggest_different_instructor']),
      description: z.string(),
      newStartAt: z.string().datetime().optional(),
      newInstructorId: z.string().uuid().optional()
    }))
  }).optional()
}).openapi('LessonConflictErrorDto');

export const LessonNotFoundErrorDto = z.object({
  type: z.literal('lesson_not_found'),
  title: z.string().default('Lesson not found'),
  status: z.literal(404),
  detail: z.string(),
  instance: z.string().optional(),
  lessonId: z.string().uuid(),
  
  // Context for why it might not be found
  possibleReasons: z.array(z.enum([
    'lesson_deleted',
    'access_denied',
    'org_mismatch',
    'invalid_id'
  ])).optional(),
  
  // Helpful links
  relatedResources: z.array(z.object({
    rel: z.string(),
    href: z.string().url(),
    description: z.string()
  })).optional()
}).openapi('LessonNotFoundErrorDto');

// ===== Summary Statistics Response =====

export const LessonSummaryStatsDto = z.object({
  period: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
    description: z.string() // e.g., "Last 30 days", "This month"
  }),
  
  counts: z.object({
    total: z.number().int(),
    completed: z.number().int(),
    cancelled: z.number().int(),
    upcoming: z.number().int(),
    in_progress: z.number().int()
  }),
  
  revenue: z.object({
    totalCents: z.number().int(),
    completedLessonsCents: z.number().int(),
    refundedCents: z.number().int(),
    pendingCents: z.number().int(),
    currency: z.string().length(3).default('AUD')
  }),
  
  trends: z.object({
    averageLessonValueCents: z.number(),
    completionRate: z.number().min(0).max(1), // 0.0 to 1.0
    cancellationRate: z.number().min(0).max(1),
    noShowRate: z.number().min(0).max(1),
    rescheduleRate: z.number().min(0).max(1)
  }),
  
  topPerformers: z.object({
    instructors: z.array(z.object({
      id: z.string().uuid(),
      name: z.string(),
      lessonsCompleted: z.number().int(),
      totalRevenueCents: z.number().int(),
      avgRating: z.number().min(0).max(5).optional()
    })).optional(),
    
    services: z.array(z.object({
      id: z.string().uuid(),
      name: z.string(),
      lessonsBooked: z.number().int(),
      completionRate: z.number().min(0).max(1)
    })).optional()
  }).optional()
}).openapi('LessonSummaryStatsDto');

// ===== Type exports =====
export type LessonListResponse = z.infer<typeof LessonListResponseDto>;
export type LessonDetailsResponse = z.infer<typeof LessonDetailsResponseDto>;
export type LessonStatusTransition = z.infer<typeof LessonStatusTransitionDto>;
export type LessonCreationResponse = z.infer<typeof LessonCreationResponseDto>;
export type LessonUpdateResponse = z.infer<typeof LessonUpdateResponseDto>;
export type LessonValidationError = z.infer<typeof LessonValidationErrorDto>;
export type LessonConflictError = z.infer<typeof LessonConflictErrorDto>;
export type LessonNotFoundError = z.infer<typeof LessonNotFoundErrorDto>;
export type LessonSummaryStats = z.infer<typeof LessonSummaryStatsDto>;