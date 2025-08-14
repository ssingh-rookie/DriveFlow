import type { BookingStatus } from '@prisma/client'
import { PrismaService } from '../../core/prisma/prisma.service'
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { LessonNotificationService } from './notification.service'
import { Injectable } from '@nestjs/common'

// Event types for lesson operations
export type LessonEventType = 
  | 'lesson_created'
  | 'lesson_updated'
  | 'lesson_cancelled'
  | 'lesson_rescheduled'
  | 'lesson_confirmed'
  | 'lesson_started'
  | 'lesson_completed'
  | 'lesson_no_show'
  | 'payment_processed'
  | 'payment_failed'
  | 'refund_processed'
  | 'payout_processed'

export interface LessonEvent {
  id: string
  eventType: LessonEventType
  lessonId: string
  orgId: string
  actorUserId?: string
  timestamp: Date
  metadata: LessonEventMetadata
  changes?: Record<string, { from: any; to: any }>
}

export interface LessonEventMetadata {
  // Core lesson data
  studentId: string
  instructorId: string
  serviceId: string
  startAt: string
  endAt: string
  status: BookingStatus
  
  // Financial data
  priceCents?: number
  platformFeeCents?: number
  instructorShareCents?: number
  
  // Additional context
  reason?: string
  previousStatus?: BookingStatus
  paymentIntentId?: string
  refundAmountCents?: number
  rescheduleFeeCents?: number
  
  // User context
  actorRole?: string
  actorName?: string
  
  // Location data
  pickupAddress?: string
  dropoffAddress?: string
  
  // Related entity names for notifications
  studentName?: string
  instructorName?: string
  serviceName?: string
}

export interface EventProcessingResult {
  eventId: string
  processed: boolean
  actions: Array<{
    type: 'notification' | 'audit_log' | 'payment' | 'payout' | 'state_update'
    status: 'completed' | 'failed' | 'skipped'
    result?: any
    error?: string
  }>
}

/**
 * Simple Event Service for Lesson Operations
 * MVP: Synchronous event processing with direct database logging
 * Handles all lesson-related events and triggers appropriate actions
 * Post-MVP: Outbox pattern, async processing, external integrations
 */
@Injectable()
export class LessonEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: LessonNotificationService,
  ) {}

  // ===== Event Publishing Methods =====

  /**
   * Publish lesson created event
   */
  async publishLessonCreated(
    lessonId: string,
    metadata: LessonEventMetadata,
    actor?: AuthenticatedUser
  ): Promise<EventProcessingResult> {
    const event: LessonEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'lesson_created',
      lessonId,
      orgId: metadata.studentId, // Will be corrected with actual orgId
      actorUserId: actor?.id,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        actorRole: actor?.role,
        actorName: actor?.id, // In practice, would fetch full name
      },
    }

    return this.processEvent(event)
  }

  /**
   * Publish lesson confirmed event (payment succeeded)
   */
  async publishLessonConfirmed(
    lessonId: string,
    metadata: LessonEventMetadata,
    actor?: AuthenticatedUser
  ): Promise<EventProcessingResult> {
    const event: LessonEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'lesson_confirmed',
      lessonId,
      orgId: metadata.studentId,
      actorUserId: actor?.id,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        actorRole: actor?.role,
        actorName: actor?.id,
      },
    }

    return this.processEvent(event)
  }

  /**
   * Publish lesson cancelled event
   */
  async publishLessonCancelled(
    lessonId: string,
    metadata: LessonEventMetadata,
    actor?: AuthenticatedUser
  ): Promise<EventProcessingResult> {
    const event: LessonEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: 'lesson_cancelled',
      lessonId,
      orgId: metadata.studentId,
      actorUserId: actor?.id,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        actorRole: actor?.role,
        actorName: actor?.id,
      },
      changes: metadata.previousStatus ? {
        status: { from: metadata.previousStatus, to: metadata.status }
      } : undefined,
    }

    return this.processEvent(event)
  }

  /**
   * Publish lesson updated/rescheduled event
   */
  async publishLessonUpdated(
    lessonId: string,
    metadata: LessonEventMetadata,
    changes: Record<string, { from: any; to: any }>,
    actor?: AuthenticatedUser
  ): Promise<EventProcessingResult> {
    // Determine if this is a reschedule (time changed) or general update
    const isReschedule = 'startAt' in changes || 'endAt' in changes
    
    const event: LessonEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType: isReschedule ? 'lesson_rescheduled' : 'lesson_updated',
      lessonId,
      orgId: metadata.studentId,
      actorUserId: actor?.id,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        actorRole: actor?.role,
        actorName: actor?.id,
      },
      changes,
    }

    return this.processEvent(event)
  }

  /**
   * Publish lesson status change event
   */
  async publishLessonStatusChanged(
    lessonId: string,
    fromStatus: BookingStatus,
    toStatus: BookingStatus,
    metadata: LessonEventMetadata,
    actor?: AuthenticatedUser
  ): Promise<EventProcessingResult> {
    let eventType: LessonEventType = 'lesson_updated'
    
    // Determine specific event type based on status transition
    if (toStatus === 'confirmed') eventType = 'lesson_confirmed'
    else if (toStatus === 'cancelled') eventType = 'lesson_cancelled'
    else if (toStatus === 'in_progress') eventType = 'lesson_started'
    else if (toStatus === 'completed') eventType = 'lesson_completed'
    else if (toStatus === 'no_show') eventType = 'lesson_no_show'

    const event: LessonEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      lessonId,
      orgId: metadata.studentId,
      actorUserId: actor?.id,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        previousStatus: fromStatus,
        actorRole: actor?.role,
        actorName: actor?.id,
      },
      changes: {
        status: { from: fromStatus, to: toStatus }
      },
    }

    return this.processEvent(event)
  }

  /**
   * Publish payment-related events
   */
  async publishPaymentEvent(
    eventType: 'payment_processed' | 'payment_failed' | 'refund_processed',
    lessonId: string,
    metadata: LessonEventMetadata,
    actor?: AuthenticatedUser
  ): Promise<EventProcessingResult> {
    const event: LessonEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      lessonId,
      orgId: metadata.studentId,
      actorUserId: actor?.id,
      timestamp: new Date(),
      metadata: {
        ...metadata,
        actorRole: actor?.role,
        actorName: actor?.id,
      },
    }

    return this.processEvent(event)
  }

  // ===== Event Processing =====

  /**
   * Process a lesson event synchronously (MVP approach)
   */
  private async processEvent(event: LessonEvent): Promise<EventProcessingResult> {
    const result: EventProcessingResult = {
      eventId: event.id,
      processed: true,
      actions: [],
    }

    try {
      // 1. Log to audit trail
      await this.logEventToAuditTrail(event)
      result.actions.push({
        type: 'audit_log',
        status: 'completed',
        result: 'Event logged to audit trail',
      })

      // 2. Handle event-specific actions
      switch (event.eventType) {
        case 'lesson_created':
          await this.handleLessonCreated(event, result)
          break
        case 'lesson_confirmed':
          await this.handleLessonConfirmed(event, result)
          break
        case 'lesson_cancelled':
          await this.handleLessonCancelled(event, result)
          break
        case 'lesson_rescheduled':
          await this.handleLessonRescheduled(event, result)
          break
        case 'lesson_completed':
          await this.handleLessonCompleted(event, result)
          break
        case 'payment_processed':
          await this.handlePaymentProcessed(event, result)
          break
        case 'refund_processed':
          await this.handleRefundProcessed(event, result)
          break
        default:
          // Generic handling for other events
          result.actions.push({
            type: 'audit_log',
            status: 'completed',
            result: `Generic handling for ${event.eventType}`,
          })
      }

    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error)
      result.processed = false
      result.actions.push({
        type: 'audit_log',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    return result
  }

  // ===== Event Handlers =====

  private async handleLessonCreated(event: LessonEvent, result: EventProcessingResult): Promise<void> {
    const { metadata } = event

    try {
      // Send notifications to student and instructor
      await this.notificationService.notifyLessonCreated(
        {
          lessonId: event.lessonId,
          orgId: event.orgId,
          studentName: metadata.studentName || 'Student',
          instructorName: metadata.instructorName || 'Instructor',
          serviceName: metadata.serviceName || 'Driving Lesson',
          startAt: metadata.startAt,
          endAt: metadata.endAt,
          pickupAddress: metadata.pickupAddress,
          dropoffAddress: metadata.dropoffAddress,
        },
        {
          student: {
            email: 'student@example.com', // TODO: Get from actual student data
            name: metadata.studentName || 'Student',
            role: 'student',
          },
          instructor: {
            email: 'instructor@example.com', // TODO: Get from actual instructor data
            name: metadata.instructorName || 'Instructor',
            role: 'instructor',
          },
        }
      )

      result.actions.push({
        type: 'notification',
        status: 'completed',
        result: 'Lesson creation notifications sent',
      })
    } catch (error) {
      result.actions.push({
        type: 'notification',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown notification error',
      })
    }
  }

  private async handleLessonConfirmed(event: LessonEvent, result: EventProcessingResult): Promise<void> {
    const { metadata } = event

    try {
      // Send confirmation notifications to student and instructor
      await this.notificationService.notifyLessonConfirmed(
        {
          lessonId: event.lessonId,
          orgId: event.orgId,
          studentName: metadata.studentName || 'Student',
          instructorName: metadata.instructorName || 'Instructor',
          serviceName: metadata.serviceName || 'Driving Lesson',
          startAt: metadata.startAt,
          endAt: metadata.endAt,
          pickupAddress: metadata.pickupAddress,
          dropoffAddress: metadata.dropoffAddress,
          paymentAmount: metadata.priceCents,
        },
        {
          student: {
            email: 'student@example.com', // TODO: Get from actual student data
            name: metadata.studentName || 'Student',
            role: 'student',
          },
          instructor: {
            email: 'instructor@example.com', // TODO: Get from actual instructor data
            name: metadata.instructorName || 'Instructor',
            role: 'instructor',
          },
        }
      )

      result.actions.push({
        type: 'notification',
        status: 'completed',
        result: 'Lesson confirmation notifications sent',
      })
    } catch (error) {
      result.actions.push({
        type: 'notification',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown notification error',
      })
    }
  }

  private async handleLessonCancelled(event: LessonEvent, result: EventProcessingResult): Promise<void> {
    const { metadata } = event

    try {
      // Send cancellation notifications to student and instructor
      await this.notificationService.notifyLessonCancelled(
        {
          lessonId: event.lessonId,
          orgId: event.orgId,
          studentName: metadata.studentName || 'Student',
          instructorName: metadata.instructorName || 'Instructor',
          serviceName: metadata.serviceName || 'Driving Lesson',
          startAt: metadata.startAt,
          endAt: metadata.endAt,
          pickupAddress: metadata.pickupAddress,
          dropoffAddress: metadata.dropoffAddress,
          cancellationReason: metadata.reason,
          refundAmount: metadata.refundAmountCents,
        },
        {
          student: {
            email: 'student@example.com', // TODO: Get from actual student data
            name: metadata.studentName || 'Student',
            role: 'student',
          },
          instructor: {
            email: 'instructor@example.com', // TODO: Get from actual instructor data
            name: metadata.instructorName || 'Instructor',
            role: 'instructor',
          },
        }
      )

      result.actions.push({
        type: 'notification',
        status: 'completed',
        result: 'Lesson cancellation notifications sent',
      })
    } catch (error) {
      result.actions.push({
        type: 'notification',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown notification error',
      })
    }
  }

  private async handleLessonRescheduled(event: LessonEvent, result: EventProcessingResult): Promise<void> {
    const { metadata } = event

    try {
      // Send rescheduling notifications to student and instructor
      await this.notificationService.notifyLessonRescheduled(
        {
          lessonId: event.lessonId,
          orgId: event.orgId,
          studentName: metadata.studentName || 'Student',
          instructorName: metadata.instructorName || 'Instructor',
          serviceName: metadata.serviceName || 'Driving Lesson',
          startAt: metadata.startAt,
          endAt: metadata.endAt,
          pickupAddress: metadata.pickupAddress,
          dropoffAddress: metadata.dropoffAddress,
          rescheduleReason: metadata.reason,
        },
        {
          student: {
            email: 'student@example.com', // TODO: Get from actual student data
            name: metadata.studentName || 'Student',
            role: 'student',
          },
          instructor: {
            email: 'instructor@example.com', // TODO: Get from actual instructor data
            name: metadata.instructorName || 'Instructor',
            role: 'instructor',
          },
        }
      )

      result.actions.push({
        type: 'notification',
        status: 'completed',
        result: 'Lesson rescheduling notifications sent',
      })
    } catch (error) {
      result.actions.push({
        type: 'notification',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown notification error',
      })
    }
  }

  private async handleLessonCompleted(event: LessonEvent, result: EventProcessingResult): Promise<void> {
    // Future: Trigger instructor payout processing
    result.actions.push({
      type: 'payout',
      status: 'skipped',
      result: 'Instructor payout processing not implemented in MVP',
    })
  }

  private async handlePaymentProcessed(event: LessonEvent, result: EventProcessingResult): Promise<void> {
    // Update lesson status to confirmed (if not already)
    try {
      await this.prisma.booking.updateMany({
        where: {
          id: event.lessonId,
          status: { in: ['draft', 'pending_payment'] },
        },
        data: {
          status: 'confirmed',
          statusChangedAt: new Date(),
        },
      })

      result.actions.push({
        type: 'state_update',
        status: 'completed',
        result: 'Lesson status updated to confirmed',
      })
    } catch (error) {
      result.actions.push({
        type: 'state_update',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  private async handleRefundProcessed(event: LessonEvent, result: EventProcessingResult): Promise<void> {
    // Future: Update refund tracking, send confirmation notifications
    result.actions.push({
      type: 'notification',
      status: 'skipped',
      result: 'Refund confirmation notifications not implemented in MVP',
    })
  }

  // ===== Audit Logging =====

  /**
   * Log event to audit trail (MVP: direct database insert)
   */
  private async logEventToAuditTrail(event: LessonEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        orgId: event.orgId,
        actorUserId: event.actorUserId,
        action: event.eventType,
        entityType: 'Lesson',
        entityId: event.lessonId,
        before: event.changes ? Object.fromEntries(
          Object.entries(event.changes).map(([key, change]) => [key, change.from])
        ) : null,
        after: event.changes ? Object.fromEntries(
          Object.entries(event.changes).map(([key, change]) => [key, change.to])
        ) : (event.metadata as any),
        ip: 'internal', // Event-driven, no IP
      },
    })
  }

  // ===== Event History & Analytics =====

  /**
   * Get event history for a lesson
   */
  async getLessonEventHistory(lessonId: string): Promise<Array<{
    id: string
    eventType: string
    timestamp: string
    actorUserId?: string
    actorRole?: string
    changes?: Record<string, { from: any; to: any }>
    metadata: any
  }>> {
    // MVP: Query from audit log (future: dedicated event store)
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'Lesson',
        entityId: lessonId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit for performance
    })

    return auditLogs.map(log => ({
      id: log.id,
      eventType: log.action,
      timestamp: log.createdAt.toISOString(),
      actorUserId: log.actorUserId || undefined,
      actorRole: undefined, // Would need to join with user data
      changes: log.before && log.after ? {
        // Reconstruct changes from before/after
        status: log.before !== log.after ? { from: log.before, to: log.after } : undefined,
      } : undefined,
      metadata: log.after || {},
    }))
  }
}