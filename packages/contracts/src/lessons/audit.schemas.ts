import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { BookingStatus } from './lesson.schemas';

extendZodWithOpenApi(z);

// ===== Audit Trail Schemas =====

export const LessonStateHistoryDto = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  fromStatus: BookingStatus.optional(),
  toStatus: BookingStatus,
  actorUserId: z.string().uuid().optional(),
  actorName: z.string().optional(), // Denormalized for display
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(), // JSON metadata
  createdAt: z.string().datetime()
}).openapi('LessonStateHistoryDto');

export const AuditTrailQueryRequest = z.object({
  lessonId: z.string().uuid().optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  actorUserId: z.string().uuid().optional(),
  action: z.enum(['created', 'updated', 'cancelled', 'rescheduled', 'completed', 'state_changed']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25)
}).openapi('AuditTrailQueryRequest');

export const AuditTrailResponse = z.object({
  entries: z.array(LessonStateHistoryDto),
  meta: z.object({
    page: z.number().int(),
    pageSize: z.number().int(), 
    totalItems: z.number().int(),
    totalPages: z.number().int()
  })
}).openapi('AuditTrailResponse');

// ===== Type exports =====
export type LessonStateHistory = z.infer<typeof LessonStateHistoryDto>;
export type AuditTrailQuery = z.infer<typeof AuditTrailQueryRequest>;
export type AuditTrailRes = z.infer<typeof AuditTrailResponse>;