// ===== Lesson Contract Exports =====

// Core lesson schemas
export * from './lesson.schemas';

// Availability and constraint schemas  
export * from './availability.schemas';

// Refund and policy schemas
export * from './refund.schemas';

// Audit trail schemas
export * from './audit.schemas';

// Response DTOs and error schemas
export * from './responses.schemas';

// API request/response schemas
export * from './api.schemas';

// Re-export commonly used schemas for convenience
export {
  // Core CRUD
  CreateLessonSchema,
  UpdateLessonSchema, 
  CancelLessonSchema,
  LessonQuerySchema,
  
  // Response DTOs
  LessonDto,
  LessonSummaryDto,
  LessonDetailsDto,
  LessonPaginatedResponseDto,
  StateTransitionResponseDto,
  
  // Types
  type CreateLessonRequest,
  type UpdateLessonRequest,
  type CancelLessonRequest,
  type LessonQuery,
  type Lesson,
  type LessonSummary,
  type LessonDetails,
  type LessonPaginatedResponse,
  
  // Enums
  BookingStatus,
  CancellationActor,
  ActorScope
} from './lesson.schemas';

export {
  // Availability
  AvailabilityCheckRequest,
  AvailabilityCheckResponse,
  AvailabilitySearchRequest,
  AvailabilitySearchResponse,
  WorkingHoursDto,
  LicenseCompatibilityDto,
  
  // Types
  type AvailabilityCheckReq,
  type AvailabilityCheckRes,
  type AvailabilitySearchReq,
  type AvailabilitySearchRes,
  type AvailableSlot,
  type WorkingHours
} from './availability.schemas';

export {
  // Refunds
  RefundCalculationRequest,
  RefundCalculationResponse,
  RefundBreakdownDto,
  ProcessRefundRequest,
  CancellationPolicyDto,
  
  // Types
  type RefundCalculationReq,
  type RefundCalculationRes,
  type RefundBreakdown,
  type CancellationPolicy
} from './refund.schemas';

export {
  // Audit
  LessonStateHistoryDto,
  AuditTrailQueryRequest,
  AuditTrailResponse,
  
  // Types
  type LessonStateHistory,
  type AuditTrailQuery
} from './audit.schemas';

export {
  // Response DTOs
  LessonListDto,
  LessonListResponseDto,
  LessonDetailsResponseDto,
  LessonStatusTransitionDto,
  LessonCreationResponseDto,
  LessonUpdateResponseDto,
  LessonSummaryStatsDto,
  
  // Error DTOs
  LessonValidationErrorDto,
  LessonConflictErrorDto,
  LessonNotFoundErrorDto,
  
  // Types
  type LessonListResponse,
  type LessonDetailsResponse,
  type LessonStatusTransition,
  type LessonCreationResponse,
  type LessonUpdateResponse,
  type LessonValidationError,
  type LessonConflictError,
  type LessonNotFoundError,
  type LessonSummaryStats
} from './responses.schemas';

export {
  // API Request/Response
  BulkAvailabilityCheckRequest,
  BulkAvailabilityCheckResponse,
  InstructorScheduleRequest,
  InstructorScheduleResponse,
  BulkRefundCalculationRequest,
  BulkRefundCalculationResponse,
  RefundStatusRequest,
  RefundStatusResponse,
  AuditTrailSearchRequest,
  AuditTrailSearchResponse,
  AuditTrailExportRequest,
  AuditTrailExportResponse,
  LessonSystemHealthRequest,
  LessonSystemHealthResponse,
  
  // Types
  type BulkAvailabilityCheckReq,
  type BulkAvailabilityCheckRes,
  type InstructorScheduleReq,
  type InstructorScheduleRes,
  type BulkRefundCalculationReq,
  type BulkRefundCalculationRes,
  type RefundStatusReq,
  type RefundStatusRes,
  type AuditTrailSearchReq,
  type AuditTrailSearchRes,
  type AuditTrailExportReq,
  type AuditTrailExportRes,
  type LessonSystemHealthReq,
  type LessonSystemHealthRes
} from './api.schemas';