import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// ===== Enums and Base Types =====

export const BookingStatus = z.enum([
  'draft',
  'pending_payment', 
  'requested',
  'confirmed',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
]).openapi('BookingStatus');

export const CancellationActor = z.enum([
  'student',
  'parent', 
  'instructor',
  'admin'
]).openapi('CancellationActor');

export const ActorScope = z.enum([
  'own',      // Student: own lessons, Instructor: teaching lessons
  'children', // Parent: children's lessons
  'assigned', // Instructor: assigned student lessons
  'all'       // Admin/Owner: all org lessons
]).openapi('ActorScope');

// ===== Location Schema =====

export const LocationDto = z.object({
  address: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  label: z.string().optional() // e.g., "Home", "School", "RMS Test Center"
}).openapi('LocationDto');

// ===== Core Lesson CRUD Schemas =====

export const CreateLessonSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  instructorId: z.string().uuid('Invalid instructor ID'), 
  serviceId: z.string().uuid('Invalid service ID'),
  startAt: z.string().datetime('Invalid start time'),
  endAt: z.string().datetime('Invalid end time'),
  pickupLocation: LocationDto.optional(),
  dropoffLocation: LocationDto.optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  idempotencyKey: z.string().optional() // For duplicate prevention
}).refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  { message: 'End time must be after start time', path: ['endAt'] }
).openapi('CreateLessonSchema');

export const UpdateLessonSchema = z.object({
  instructorId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  pickupLocation: LocationDto.optional(),
  dropoffLocation: LocationDto.optional(),
  notes: z.string().max(1000).optional(),
  reason: z.string().max(500, 'Reason too long').optional() // For reschedule/update reason
}).refine(
  (data) => {
    if (data.startAt && data.endAt) {
      return new Date(data.endAt) > new Date(data.startAt);
    }
    return true;
  },
  { message: 'End time must be after start time', path: ['endAt'] }
).openapi('UpdateLessonSchema');

export const CancelLessonSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason required').max(500, 'Reason too long'),
  actor: CancellationActor.optional() // Auto-detected from user context if not provided
}).openapi('CancelLessonSchema');

// ===== Query and Pagination Schemas =====

export const LessonQuerySchema = z.object({
  // Scoping
  actorScope: ActorScope.optional().default('own'),
  instructorId: z.string().uuid().optional(),
  learnerId: z.string().uuid().optional(), // Alternative name for studentId
  studentId: z.string().uuid().optional(),
  
  // Date filtering
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  
  // Status filtering  
  status: BookingStatus.optional(),
  statuses: z.array(BookingStatus).optional(), // Multiple statuses
  
  // Pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
  
  // Sorting
  sortBy: z.enum(['startAt', 'endAt', 'status', 'createdAt', 'updatedAt']).optional().default('startAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  
  // Data loading options
  includeDetails: z.boolean().optional().default(false), // Include full details vs summary
  includeHistory: z.boolean().optional().default(false)  // Include state history
}).openapi('LessonQuerySchema');

export const PaginationMetaDto = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  totalItems: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
}).openapi('PaginationMetaDto');

// ===== Response DTOs =====

export const LessonDto = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  studentId: z.string().uuid(),
  instructorId: z.string().uuid(),
  serviceId: z.string().uuid(),
  
  // Timing
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  
  // Status and workflow
  status: BookingStatus,
  previousStatus: BookingStatus.optional(),
  
  // Locations
  pickupLocation: LocationDto.optional(),
  dropoffLocation: LocationDto.optional(),
  
  // Pricing
  priceCents: z.number().int(),
  platformFeeCents: z.number().int(),
  instructorShareCents: z.number().int(),
  currency: z.string().length(3).default('AUD'),
  
  // Tracking
  cancelledAt: z.string().datetime().optional(),
  cancelledBy: z.string().uuid().optional(),
  cancellationReason: z.string().optional(),
  rescheduledFrom: z.string().datetime().optional(),
  rescheduledAt: z.string().datetime().optional(),
  rescheduleReason: z.string().optional(),
  statusChangedAt: z.string().datetime().optional(),
  statusChangedBy: z.string().uuid().optional(),
  
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).openapi('LessonDto');

// Lightweight version for list views
export const LessonSummaryDto = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  instructorId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: BookingStatus,
  priceCents: z.number().int(),
  
  // Include names for UI display
  studentName: z.string().optional(),
  instructorName: z.string().optional(),
  serviceName: z.string().optional(),
  
  // Key locations
  pickupAddress: z.string().optional(),
  dropoffAddress: z.string().optional()
}).openapi('LessonSummaryDto');

export const LessonDetailsDto = LessonDto.extend({
  // Include related data for detail views
  student: z.object({
    id: z.string().uuid(),
    fullName: z.string(),
    phone: z.string().optional(),
    email: z.string().optional()
  }).optional(),
  
  instructor: z.object({
    id: z.string().uuid(), 
    displayName: z.string(),
    phone: z.string().optional(),
    licenseId: z.string().optional()
  }).optional(),
  
  service: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    durationMin: z.number().int()
  }).optional(),
  
  // Optional state history (when requested)
  stateHistory: z.array(z.object({
    id: z.string().uuid(),
    fromStatus: BookingStatus.optional(),
    toStatus: BookingStatus,
    actorUserId: z.string().uuid().optional(),
    actorName: z.string().optional(),
    reason: z.string().optional(),
    createdAt: z.string().datetime()
  })).optional()
}).openapi('LessonDetailsDto');

export const LessonPaginatedResponseDto = z.object({
  data: z.array(LessonSummaryDto),
  meta: PaginationMetaDto
}).openapi('LessonPaginatedResponseDto');

export const LessonDetailsPaginatedResponseDto = z.object({
  data: z.array(LessonDetailsDto),
  meta: PaginationMetaDto  
}).openapi('LessonDetailsPaginatedResponseDto');

// ===== State Transition Response =====

export const StateTransitionResponseDto = z.object({
  success: z.boolean(),
  previousStatus: BookingStatus,
  newStatus: BookingStatus,
  transitionId: z.string().uuid().optional(),
  refundAmount: z.number().int().optional(),
  feeAmount: z.number().int().optional(),
  message: z.string().optional()
}).openapi('StateTransitionResponseDto');

// ===== Error Response Schemas =====

export const LessonErrorDto = z.object({
  type: z.string().optional(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  // Lesson-specific error context
  lessonId: z.string().uuid().optional(),
  conflictingBookings: z.array(z.string().uuid()).optional(),
  availableSlots: z.array(z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime()
  })).optional()
}).openapi('LessonErrorDto');

// ===== Type exports for TypeScript =====
export type CreateLessonRequest = z.infer<typeof CreateLessonSchema>;
export type UpdateLessonRequest = z.infer<typeof UpdateLessonSchema>;
export type CancelLessonRequest = z.infer<typeof CancelLessonSchema>;
export type LessonQuery = z.infer<typeof LessonQuerySchema>;
export type Lesson = z.infer<typeof LessonDto>;
export type LessonSummary = z.infer<typeof LessonSummaryDto>;
export type LessonDetails = z.infer<typeof LessonDetailsDto>;
export type LessonPaginatedResponse = z.infer<typeof LessonPaginatedResponseDto>;
export type StateTransitionResponse = z.infer<typeof StateTransitionResponseDto>;
export type LessonError = z.infer<typeof LessonErrorDto>;