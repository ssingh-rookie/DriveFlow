import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { LocationDto } from './lesson.schemas';

extendZodWithOpenApi(z);

// ===== Availability Request/Response Schemas =====

export const AvailabilityCheckRequest = z.object({
  instructorId: z.string().uuid('Invalid instructor ID'),
  startAt: z.string().datetime('Invalid start time'),
  endAt: z.string().datetime('Invalid end time'),
  serviceId: z.string().uuid().optional(), // For service-specific constraints
  pickupLocation: LocationDto.optional(),
  dropoffLocation: LocationDto.optional(),
  excludeBookingId: z.string().uuid().optional() // For reschedule scenarios
}).refine(
  (data) => new Date(data.endAt) > new Date(data.startAt),
  { message: 'End time must be after start time', path: ['endAt'] }
).openapi('AvailabilityCheckRequest');

export const TimeSlotDto = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  available: z.boolean(),
  reason: z.string().optional(), // Why not available: "booked", "outside_hours", "travel_time", etc.
  conflictingBookingId: z.string().uuid().optional(),
  travelTimeMin: z.number().int().optional(),
  bufferTimeMin: z.number().int().optional()
}).openapi('TimeSlotDto');

export const AvailabilityCheckResponse = z.object({
  available: z.boolean(),
  requestedSlot: TimeSlotDto,
  conflicts: z.array(z.object({
    type: z.enum(['booking_conflict', 'outside_working_hours', 'insufficient_travel_time', 'break_time', 'daily_limit_reached']),
    message: z.string(),
    conflictingBookingId: z.string().uuid().optional(),
    suggestedAlternatives: z.array(TimeSlotDto).optional()
  })).optional(),
  workingHours: z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string(), // HH:mm format
    endTime: z.string(),
    breakStartTime: z.string().optional(),
    breakEndTime: z.string().optional(),
    maxLessonsPerDay: z.number().int().optional(),
    currentLessonsToday: z.number().int().optional()
  }).optional(),
  travelTime: z.object({
    fromPreviousLesson: z.number().int().optional(), // Minutes
    toNextLesson: z.number().int().optional()
  }).optional()
}).openapi('AvailabilityCheckResponse');

// ===== Availability Search Schemas =====

export const AvailabilitySearchRequest = z.object({
  instructorId: z.string().uuid().optional(), // If not specified, search all instructors
  serviceId: z.string().uuid('Invalid service ID'),
  durationMin: z.number().int().min(30).max(480).optional(), // Defaults from service
  
  // Date range for search
  fromDate: z.string().date('Invalid from date'),
  toDate: z.string().date('Invalid to date'),
  
  // Time preferences
  preferredStartTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:mm
  preferredEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  
  // Day preferences
  preferredDays: z.array(z.number().int().min(0).max(6)).optional(), // 0=Sunday, 1=Monday, etc.
  
  // Location (for travel time calculations)
  pickupLocation: LocationDto.optional(),
  dropoffLocation: LocationDto.optional(),
  
  // Search options
  maxResults: z.number().int().min(1).max(50).optional().default(20),
  includeSubOptimal: z.boolean().optional().default(false) // Include slots with longer travel times
}).refine(
  (data) => new Date(data.toDate) >= new Date(data.fromDate),
  { message: 'To date must be on or after from date', path: ['toDate'] }
).openapi('AvailabilitySearchRequest');

export const AvailableSlotDto = z.object({
  instructorId: z.string().uuid(),
  instructorName: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  score: z.number().min(0).max(100), // Availability score (100 = perfect match)
  travelTimeMin: z.number().int().min(0).optional(),
  bufferTimeMin: z.number().int().min(0),
  priceCents: z.number().int(), // Pricing for this slot/instructor
  reasons: z.array(z.enum([
    'perfect_match',
    'preferred_time',
    'preferred_day', 
    'good_location',
    'available_instructor',
    'longer_travel',
    'non_preferred_time',
    'limited_availability'
  ])).optional()
}).openapi('AvailableSlotDto');

export const AvailabilitySearchResponse = z.object({
  totalResults: z.number().int(),
  searchCriteria: AvailabilitySearchRequest,
  availableSlots: z.array(AvailableSlotDto),
  searchMetrics: z.object({
    instructorsChecked: z.number().int(),
    slotsEvaluated: z.number().int(),
    searchTimeMs: z.number().int(),
    cacheHitRate: z.number().min(0).max(1).optional()
  }).optional()
}).openapi('AvailabilitySearchResponse');

// ===== Working Hours Management =====

export const WorkingHoursDto = z.object({
  id: z.string().uuid(),
  instructorId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6), // 0=Sunday
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:mm
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  breakStartTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  breakEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  maxLessonsPerDay: z.number().int().min(1).max(20).optional(),
  travelBufferMin: z.number().int().min(0).max(60).default(15),
  isActive: z.boolean().default(true),
  effectiveFrom: z.string().date().optional(),
  effectiveTo: z.string().date().optional()
}).openapi('WorkingHoursDto');

export const UpdateWorkingHoursRequest = z.object({
  workingHours: z.array(WorkingHoursDto.omit({ id: true, instructorId: true }))
}).openapi('UpdateWorkingHoursRequest');

// ===== License Compatibility =====

export const LicenseCompatibilityDto = z.object({
  studentLicenseType: z.string(), // e.g., "learner", "provisional_p1", "full"
  lessonType: z.string(), // e.g., "standard", "highway", "night", "manual"  
  instructorLicenseReq: z.string(), // Required instructor certification
  isCompatible: z.boolean(),
  minStudentAge: z.number().int().optional(),
  maxStudentAge: z.number().int().optional(),
  minLessonDuration: z.number().int().optional(), // Minutes
  maxLessonDuration: z.number().int().optional(),
  requiresParentalConsent: z.boolean().default(false),
  restrictions: z.object({
    timeRestrictions: z.array(z.string()).optional(), // e.g., ["daylight_only", "no_peak_hours"]
    locationRestrictions: z.array(z.string()).optional(), // e.g., ["no_motorways", "local_area_only"]
    weatherRestrictions: z.array(z.string()).optional() // e.g., ["clear_weather_only"]
  }).optional()
}).openapi('LicenseCompatibilityDto');

export const LicenseCompatibilityCheckRequest = z.object({
  studentId: z.string().uuid(),
  lessonType: z.string(),
  instructorId: z.string().uuid()
}).openapi('LicenseCompatibilityCheckRequest');

export const LicenseCompatibilityResponse = z.object({
  compatible: z.boolean(),
  compatibility: LicenseCompatibilityDto.optional(),
  violations: z.array(z.object({
    type: z.string(),
    message: z.string(),
    severity: z.enum(['error', 'warning', 'info'])
  })).optional(),
  recommendations: z.array(z.object({
    instructorId: z.string().uuid(),
    instructorName: z.string(),
    reason: z.string()
  })).optional()
}).openapi('LicenseCompatibilityResponse');

// ===== Type exports =====
export type AvailabilityCheckReq = z.infer<typeof AvailabilityCheckRequest>;
export type AvailabilityCheckRes = z.infer<typeof AvailabilityCheckResponse>;
export type AvailabilitySearchReq = z.infer<typeof AvailabilitySearchRequest>;
export type AvailabilitySearchRes = z.infer<typeof AvailabilitySearchResponse>;
export type AvailableSlot = z.infer<typeof AvailableSlotDto>;
export type WorkingHours = z.infer<typeof WorkingHoursDto>;
export type LicenseCompatibility = z.infer<typeof LicenseCompatibilityDto>;