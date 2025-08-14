import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { 
  BookingStatus, 
  CancellationActor, 
  LocationDto,
  PaginationMetaDto 
} from './lesson.schemas';

extendZodWithOpenApi(z);

// ===== Availability API Schemas =====

// Bulk availability check for multiple time slots
export const BulkAvailabilityCheckRequest = z.object({
  instructorId: z.string().uuid().optional(), // If not provided, check all instructors
  timeSlots: z.array(z.object({
    id: z.string(), // Client-generated ID for matching request/response
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    serviceId: z.string().uuid().optional(),
    priority: z.enum(['high', 'medium', 'low']).optional().default('medium')
  })).min(1).max(50), // Limit bulk requests
  
  pickupLocation: LocationDto.optional(),
  dropoffLocation: LocationDto.optional(),
  
  // Search options
  includeAlternatives: z.boolean().optional().default(false),
  maxAlternativesPerSlot: z.number().int().min(1).max(10).optional().default(3),
  alternativeTimeRangeHours: z.number().int().min(1).max(72).optional().default(24)
}).openapi('BulkAvailabilityCheckRequest');

export const BulkAvailabilityCheckResponse = z.object({
  results: z.array(z.object({
    id: z.string(), // Matches request ID
    requestedSlot: z.object({
      startAt: z.string().datetime(),
      endAt: z.string().datetime()
    }),
    available: z.boolean(),
    instructorId: z.string().uuid().optional(),
    
    // If not available
    conflicts: z.array(z.object({
      type: z.enum(['instructor_busy', 'outside_hours', 'travel_time', 'break_time', 'daily_limit']),
      message: z.string(),
      conflictingBookingId: z.string().uuid().optional(),
      blockedUntil: z.string().datetime().optional()
    })).optional(),
    
    // Alternative suggestions (if requested)
    alternatives: z.array(z.object({
      instructorId: z.string().uuid(),
      instructorName: z.string(),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      score: z.number().min(0).max(100),
      priceCents: z.number().int(),
      travelTimeMin: z.number().int().optional(),
      reason: z.string() // Why this is suggested
    })).optional()
  })),
  
  summary: z.object({
    totalRequested: z.number().int(),
    available: z.number().int(),
    unavailable: z.number().int(),
    alternativesFound: z.number().int()
  })
}).openapi('BulkAvailabilityCheckResponse');

// Instructor schedule overview
export const InstructorScheduleRequest = z.object({
  instructorId: z.string().uuid(),
  fromDate: z.string().date(),
  toDate: z.string().date(),
  includeBlocked: z.boolean().optional().default(false), // Include blocked/unavailable times
  includeWorkingHours: z.boolean().optional().default(true),
  timeZone: z.string().optional() // For timezone-aware responses
}).refine(
  (data) => new Date(data.toDate) >= new Date(data.fromDate),
  { message: 'To date must be on or after from date', path: ['toDate'] }
).openapi('InstructorScheduleRequest');

export const InstructorScheduleResponse = z.object({
  instructorId: z.string().uuid(),
  instructorName: z.string(),
  period: z.object({
    from: z.string().date(),
    to: z.string().date(),
    timeZone: z.string()
  }),
  
  // Daily schedule breakdown
  schedule: z.array(z.object({
    date: z.string().date(),
    dayOfWeek: z.number().int().min(0).max(6),
    
    workingHours: z.object({
      startTime: z.string(), // HH:mm
      endTime: z.string(),
      breakStartTime: z.string().optional(),
      breakEndTime: z.string().optional(),
      maxLessons: z.number().int().optional()
    }).optional(),
    
    // Existing bookings
    bookings: z.array(z.object({
      id: z.string().uuid(),
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      status: BookingStatus,
      studentName: z.string(),
      serviceName: z.string(),
      canReschedule: z.boolean()
    })),
    
    // Available slots
    availableSlots: z.array(z.object({
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      duration: z.number().int(), // minutes
      type: z.enum(['standard', 'short_notice', 'last_minute'])
    })),
    
    // Blocked periods
    blockedPeriods: z.array(z.object({
      startAt: z.string().datetime(),
      endAt: z.string().datetime(),
      reason: z.string(),
      type: z.enum(['break', 'travel', 'personal', 'maintenance'])
    })).optional(),
    
    dailyStats: z.object({
      totalBookings: z.number().int(),
      totalAvailableHours: z.number(),
      utilizationRate: z.number().min(0).max(1)
    })
  })),
  
  summary: z.object({
    totalDays: z.number().int(),
    workingDays: z.number().int(),
    totalLessons: z.number().int(),
    totalAvailableHours: z.number(),
    averageUtilization: z.number().min(0).max(1)
  })
}).openapi('InstructorScheduleResponse');

// ===== Refund Calculation API Schemas =====

// Bulk refund calculation for multiple lessons
export const BulkRefundCalculationRequest = z.object({
  calculations: z.array(z.object({
    id: z.string(), // Client ID for matching
    lessonId: z.string().uuid(),
    actor: CancellationActor,
    reason: z.string().min(1).max(500),
    cancellationTime: z.string().datetime().optional()
  })).min(1).max(20) // Reasonable bulk limit
}).openapi('BulkRefundCalculationRequest');

export const BulkRefundCalculationResponse = z.object({
  results: z.array(z.object({
    id: z.string(), // Matches request ID
    lessonId: z.string().uuid(),
    eligible: z.boolean(),
    
    calculation: z.object({
      originalAmountCents: z.number().int(),
      refundAmountCents: z.number().int(),
      feeCents: z.number().int(),
      netRefundCents: z.number().int(),
      refundPercentage: z.number().min(0).max(100),
      
      policy: z.object({
        id: z.string().uuid(),
        actor: CancellationActor,
        hoursBeforeStart: z.number(),
        description: z.string().optional()
      }),
      
      breakdown: z.object({
        studentRefund: z.number().int(),
        platformRetained: z.number().int(),
        instructorRetained: z.number().int(),
        processingFee: z.number().int()
      })
    }).optional(),
    
    ineligibilityReasons: z.array(z.object({
      code: z.string(),
      message: z.string()
    })).optional(),
    
    warnings: z.array(z.string()).optional()
  })),
  
  summary: z.object({
    totalRequested: z.number().int(),
    eligible: z.number().int(),
    ineligible: z.number().int(),
    totalRefundCents: z.number().int(),
    totalFeesCents: z.number().int(),
    averageRefundRate: z.number().min(0).max(100)
  })
}).openapi('BulkRefundCalculationResponse');

// Refund processing status check
export const RefundStatusRequest = z.object({
  refundIds: z.array(z.string().uuid()).min(1).max(50),
  includeHistory: z.boolean().optional().default(false)
}).openapi('RefundStatusRequest');

export const RefundStatusResponse = z.object({
  refunds: z.array(z.object({
    id: z.string().uuid(),
    lessonId: z.string().uuid(),
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']),
    amountCents: z.number().int(),
    currency: z.string().length(3),
    
    processing: z.object({
      stripeRefundId: z.string().optional(),
      estimatedCompletionDays: z.number().int().optional(),
      lastAttempt: z.string().datetime().optional(),
      failureReason: z.string().optional()
    }),
    
    history: z.array(z.object({
      status: z.string(),
      timestamp: z.string().datetime(),
      note: z.string().optional()
    })).optional(),
    
    createdAt: z.string().datetime(),
    completedAt: z.string().datetime().optional()
  })),
  
  summary: z.object({
    totalRefunds: z.number().int(),
    pendingRefunds: z.number().int(),
    completedRefunds: z.number().int(),
    failedRefunds: z.number().int(),
    totalAmountCents: z.number().int()
  })
}).openapi('RefundStatusResponse');

// ===== Audit Trail API Schemas =====

// Enhanced audit trail search
export const AuditTrailSearchRequest = z.object({
  // Resource filters
  lessonIds: z.array(z.string().uuid()).optional(),
  studentIds: z.array(z.string().uuid()).optional(),
  instructorIds: z.array(z.string().uuid()).optional(),
  
  // Actor filters
  actorUserIds: z.array(z.string().uuid()).optional(),
  actorRoles: z.array(z.enum(['student', 'parent', 'instructor', 'admin', 'owner', 'system'])).optional(),
  
  // Action filters
  actions: z.array(z.enum([
    'created', 'updated', 'cancelled', 'rescheduled', 'completed', 
    'payment_processed', 'refund_issued', 'status_changed',
    'availability_checked', 'notification_sent'
  ])).optional(),
  
  // Time filters
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  
  // Status transitions
  fromStatuses: z.array(BookingStatus).optional(),
  toStatuses: z.array(BookingStatus).optional(),
  
  // Search options
  includeMetadata: z.boolean().optional().default(false),
  includeSystemActions: z.boolean().optional().default(true),
  
  // Pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  
  // Sorting
  sortBy: z.enum(['timestamp', 'action', 'actor', 'lesson']).optional().default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
}).openapi('AuditTrailSearchRequest');

export const AuditTrailSearchResponse = z.object({
  entries: z.array(z.object({
    id: z.string().uuid(),
    timestamp: z.string().datetime(),
    action: z.string(),
    
    // Resource context
    lessonId: z.string().uuid().optional(),
    resourceType: z.enum(['lesson', 'booking', 'payment', 'refund', 'availability']),
    resourceId: z.string().uuid(),
    
    // Actor context
    actorUserId: z.string().uuid().optional(),
    actorRole: z.string().optional(),
    actorName: z.string().optional(),
    actorType: z.enum(['user', 'system', 'webhook']).default('user'),
    
    // Change details
    changes: z.array(z.object({
      field: z.string(),
      previousValue: z.any().optional(),
      newValue: z.any(),
      changeType: z.enum(['create', 'update', 'delete'])
    })).optional(),
    
    // State transitions
    stateTransition: z.object({
      fromStatus: BookingStatus.optional(),
      toStatus: BookingStatus,
      reason: z.string().optional()
    }).optional(),
    
    // Context metadata (if requested)
    metadata: z.record(z.any()).optional(),
    
    // Related records
    relatedRecords: z.array(z.object({
      type: z.string(),
      id: z.string().uuid(),
      relationship: z.string()
    })).optional(),
    
    // Impact assessment
    impact: z.object({
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      affectedUsers: z.array(z.string().uuid()).optional(),
      financialImpact: z.number().optional() // in cents
    }).optional()
  })),
  
  meta: PaginationMetaDto,
  
  // Search insights
  insights: z.object({
    totalEntries: z.number().int(),
    dateRange: z.object({
      earliest: z.string().datetime(),
      latest: z.string().datetime()
    }),
    
    actionBreakdown: z.record(z.number().int()).optional(), // action -> count
    actorBreakdown: z.record(z.number().int()).optional(), // actor -> count
    impactSummary: z.object({
      highImpactActions: z.number().int(),
      financialImpactCents: z.number().int(),
      usersAffected: z.number().int()
    }).optional(),
    
    searchPerformance: z.object({
      executionTimeMs: z.number().int(),
      indexesUsed: z.array(z.string()).optional(),
      cacheHit: z.boolean().optional()
    }).optional()
  }).optional()
}).openapi('AuditTrailSearchResponse');

// Audit trail export request
export const AuditTrailExportRequest = z.object({
  searchCriteria: AuditTrailSearchRequest.omit({ page: true, pageSize: true }),
  format: z.enum(['csv', 'json', 'excel']).default('csv'),
  includeMetadata: z.boolean().default(false),
  maxRecords: z.number().int().min(1).max(10000).default(5000),
  
  // Email delivery (optional)
  deliverByEmail: z.object({
    to: z.string().email(),
    subject: z.string().optional(),
    includePassword: z.boolean().default(true) // For sensitive data
  }).optional()
}).openapi('AuditTrailExportRequest');

export const AuditTrailExportResponse = z.object({
  exportId: z.string().uuid(),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  format: z.enum(['csv', 'json', 'excel']),
  
  // If completed
  downloadUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
  fileSizeBytes: z.number().int().optional(),
  recordCount: z.number().int().optional(),
  
  // If processing
  progress: z.object({
    recordsProcessed: z.number().int(),
    totalRecords: z.number().int(),
    estimatedCompletionTime: z.string().datetime().optional()
  }).optional(),
  
  // If failed
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean()
  }).optional(),
  
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional()
}).openapi('AuditTrailExportResponse');

// ===== System Health & Analytics APIs =====

export const LessonSystemHealthRequest = z.object({
  includeMetrics: z.boolean().optional().default(true),
  timeRangeHours: z.number().int().min(1).max(168).optional().default(24) // Last 24 hours
}).openapi('LessonSystemHealthRequest');

export const LessonSystemHealthResponse = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  
  metrics: z.object({
    // Booking metrics
    totalLessons: z.number().int(),
    lessonsCreated24h: z.number().int(),
    lessonsCancelled24h: z.number().int(),
    
    // Performance metrics
    avgResponseTimeMs: z.number(),
    avgAvailabilityCheckMs: z.number(),
    avgRefundCalculationMs: z.number(),
    
    // Error rates
    errorRate: z.number().min(0).max(1),
    availabilityCheckErrors: z.number().int(),
    paymentProcessingErrors: z.number().int(),
    
    // System capacity
    databaseConnections: z.object({
      active: z.number().int(),
      max: z.number().int(),
      utilization: z.number().min(0).max(1)
    }),
    
    cacheHitRate: z.number().min(0).max(1).optional()
  }).optional(),
  
  issues: z.array(z.object({
    severity: z.enum(['info', 'warning', 'error', 'critical']),
    component: z.string(),
    message: z.string(),
    since: z.string().datetime(),
    affectedFeatures: z.array(z.string()).optional()
  })),
  
  recommendations: z.array(z.object({
    priority: z.enum(['low', 'medium', 'high']),
    action: z.string(),
    description: z.string(),
    estimatedImpact: z.string().optional()
  })).optional()
}).openapi('LessonSystemHealthResponse');

// ===== Type exports =====
export type BulkAvailabilityCheckReq = z.infer<typeof BulkAvailabilityCheckRequest>;
export type BulkAvailabilityCheckRes = z.infer<typeof BulkAvailabilityCheckResponse>;
export type InstructorScheduleReq = z.infer<typeof InstructorScheduleRequest>;
export type InstructorScheduleRes = z.infer<typeof InstructorScheduleResponse>;
export type BulkRefundCalculationReq = z.infer<typeof BulkRefundCalculationRequest>;
export type BulkRefundCalculationRes = z.infer<typeof BulkRefundCalculationResponse>;
export type RefundStatusReq = z.infer<typeof RefundStatusRequest>;
export type RefundStatusRes = z.infer<typeof RefundStatusResponse>;
export type AuditTrailSearchReq = z.infer<typeof AuditTrailSearchRequest>;
export type AuditTrailSearchRes = z.infer<typeof AuditTrailSearchResponse>;
export type AuditTrailExportReq = z.infer<typeof AuditTrailExportRequest>;
export type AuditTrailExportRes = z.infer<typeof AuditTrailExportResponse>;
export type LessonSystemHealthReq = z.infer<typeof LessonSystemHealthRequest>;
export type LessonSystemHealthRes = z.infer<typeof LessonSystemHealthResponse>;