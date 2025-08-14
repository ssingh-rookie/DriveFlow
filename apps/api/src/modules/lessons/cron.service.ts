import type { BookingStatus } from '@prisma/client'
import { PrismaService } from '../../core/prisma/prisma.service'
import { LessonEventService } from './event.service'
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'

export interface StateTransitionJob {
  id: string
  bookingId: string
  fromStatus: BookingStatus
  toStatus: BookingStatus
  executeAt: Date
  reason: string
  attempts: number
  lastError?: string
}

export interface CronJobResult {
  jobId: string
  bookingId: string
  success: boolean
  error?: string
  executedAt: Date
}

export interface NoShowDetectionResult {
  detected: number
  processed: number
  failed: number
  errors: Array<{
    bookingId: string
    error: string
  }>
}

/**
 * Simple State Management Service for Lesson Operations
 * MVP: Polling-based cron service with setInterval
 * Handles automatic state transitions like NoShow detection
 * Post-MVP: BullMQ worker app for production scaling
 */
@Injectable()
export class LessonCronService implements OnModuleInit, OnModuleDestroy {
  private noShowPollingInterval: NodeJS.Timeout | null = null
  private stateTransitionInterval: NodeJS.Timeout | null = null
  private readonly POLLING_INTERVAL_MS = 30 * 1000 // 30 seconds
  private readonly NO_SHOW_GRACE_PERIOD_MIN = 30 // 30 minutes after lesson end
  private isRunning = false

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: LessonEventService,
  ) {}

  // ===== Lifecycle Methods =====

  async onModuleInit(): Promise<void> {
    // Start polling services
    await this.startCronServices()
  }

  async onModuleDestroy(): Promise<void> {
    await this.stopCronServices()
  }

  /**
   * Start all cron services
   */
  async startCronServices(): Promise<void> {
    if (this.isRunning) {
      console.log('[CRON] Services already running')
      return
    }

    this.isRunning = true
    console.log('[CRON] Starting lesson state management services...')

    // Start NoShow detection polling
    this.noShowPollingInterval = setInterval(async () => {
      try {
        await this.detectAndProcessNoShows()
      } catch (error) {
        console.error('[CRON] NoShow detection error:', error)
      }
    }, this.POLLING_INTERVAL_MS)

    // Start scheduled state transitions polling
    this.stateTransitionInterval = setInterval(async () => {
      try {
        await this.processScheduledStateTransitions()
      } catch (error) {
        console.error('[CRON] State transition error:', error)
      }
    }, this.POLLING_INTERVAL_MS)

    console.log('[CRON] Services started successfully')
  }

  /**
   * Stop all cron services
   */
  async stopCronServices(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    console.log('[CRON] Stopping lesson state management services...')

    if (this.noShowPollingInterval) {
      clearInterval(this.noShowPollingInterval)
      this.noShowPollingInterval = null
    }

    if (this.stateTransitionInterval) {
      clearInterval(this.stateTransitionInterval)
      this.stateTransitionInterval = null
    }

    this.isRunning = false
    console.log('[CRON] Services stopped')
  }

  // ===== NoShow Detection =====

  /**
   * Detect and process no-show lessons
   * MVP: Simple polling approach with grace period
   */
  async detectAndProcessNoShows(): Promise<NoShowDetectionResult> {
    const result: NoShowDetectionResult = {
      detected: 0,
      processed: 0,
      failed: 0,
      errors: [],
    }

    try {
      // Find lessons that should be marked as no-show
      const cutoffTime = new Date()
      cutoffTime.setMinutes(cutoffTime.getMinutes() - this.NO_SHOW_GRACE_PERIOD_MIN)

      const candidateBookings = await this.prisma.booking.findMany({
        where: {
          status: 'confirmed',
          endAt: {
            lt: cutoffTime, // Lesson ended more than grace period ago
          },
        },
        include: {
          student: {
            select: { fullName: true },
          },
          instructor: {
            select: { displayName: true },
          },
          service: {
            select: { name: true },
          },
        },
        take: 50, // Limit batch size for performance
      })

      result.detected = candidateBookings.length

      if (candidateBookings.length === 0) {
        return result
      }

      console.log(`[CRON] Found ${candidateBookings.length} potential no-show lessons`)

      // Process each no-show candidate
      for (const booking of candidateBookings) {
        try {
          await this.processNoShowBooking(booking)
          result.processed++
        } catch (error) {
          result.failed++
          result.errors.push({
            bookingId: booking.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          console.error(`[CRON] Failed to process no-show for booking ${booking.id}:`, error)
        }
      }

      if (result.processed > 0) {
        console.log(`[CRON] Processed ${result.processed} no-show lessons`)
      }

    } catch (error) {
      console.error('[CRON] Error in no-show detection:', error)
      result.errors.push({
        bookingId: 'system',
        error: error instanceof Error ? error.message : 'System error',
      })
    }

    return result
  }

  /**
   * Process a single no-show booking
   */
  private async processNoShowBooking(booking: any): Promise<void> {
    // Update booking status to no_show
    const updatedBooking = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'no_show',
        statusChangedAt: new Date(),
        statusChangedBy: null, // System-generated
      },
    })

    // Create state history record
    await this.prisma.lessonStateHistory.create({
      data: {
        orgId: booking.orgId,
        bookingId: booking.id,
        fromStatus: 'confirmed',
        toStatus: 'no_show',
        actorUserId: null, // System action
        reason: `Auto-detected: Student did not show up (${this.NO_SHOW_GRACE_PERIOD_MIN}min grace period)`,
        metadata: {
          detectedAt: new Date().toISOString(),
          gracePeriodMin: this.NO_SHOW_GRACE_PERIOD_MIN,
          originalEndTime: booking.endAt.toISOString(),
        },
      },
    })

    // Publish no-show event
    await this.eventService.publishLessonStatusChanged(
      booking.id,
      'confirmed',
      'no_show',
      {
        studentId: booking.studentId,
        instructorId: booking.instructorId,
        serviceId: booking.serviceId,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        status: 'no_show',
        previousStatus: 'confirmed',
        studentName: booking.student?.fullName,
        instructorName: booking.instructor?.displayName,
        serviceName: booking.service?.name,
        pickupAddress: booking.pickupAddress || undefined,
        dropoffAddress: booking.dropoffAddress || undefined,
        priceCents: booking.priceCents,
        platformFeeCents: booking.platformFeeCents,
        instructorShareCents: booking.instructorShareCents,
      }
    )

    console.log(`[CRON] Marked booking ${booking.id} as no-show`)
  }

  // ===== Scheduled State Transitions =====

  /**
   * Process scheduled state transitions
   */
  async processScheduledStateTransitions(): Promise<CronJobResult[]> {
    const results: CronJobResult[] = []

    try {
      // Find due state transitions
      const now = new Date()
      const dueTransitions = await this.prisma.scheduledStateTransition.findMany({
        where: {
          executeAt: {
            lte: now,
          },
          processedAt: null,
          attempts: {
            lt: 3, // Max 3 retry attempts
          },
        },
        include: {
          booking: {
            include: {
              student: { select: { fullName: true } },
              instructor: { select: { displayName: true } },
              service: { select: { name: true } },
            },
          },
        },
        take: 50, // Batch processing
      })

      if (dueTransitions.length === 0) {
        return results
      }

      console.log(`[CRON] Processing ${dueTransitions.length} scheduled state transitions`)

      for (const transition of dueTransitions) {
        const jobResult: CronJobResult = {
          jobId: transition.id,
          bookingId: transition.bookingId,
          success: false,
          executedAt: new Date(),
        }

        try {
          await this.executeStateTransition(transition)
          jobResult.success = true
          results.push(jobResult)
        } catch (error) {
          jobResult.error = error instanceof Error ? error.message : 'Unknown error'
          results.push(jobResult)

          // Update transition with error and increment attempts
          await this.prisma.scheduledStateTransition.update({
            where: { id: transition.id },
            data: {
              attempts: transition.attempts + 1,
              lastError: jobResult.error,
              updatedAt: new Date(),
            },
          })

          console.error(`[CRON] Failed to execute transition ${transition.id}:`, error)
        }
      }

    } catch (error) {
      console.error('[CRON] Error in scheduled state transitions:', error)
    }

    return results
  }

  /**
   * Execute a single state transition
   */
  private async executeStateTransition(transition: any): Promise<void> {
    const { booking } = transition

    // Update booking status
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: transition.toStatus,
        statusChangedAt: new Date(),
        statusChangedBy: null, // System action
      },
    })

    // Create state history
    await this.prisma.lessonStateHistory.create({
      data: {
        orgId: booking.orgId,
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: transition.toStatus,
        actorUserId: null,
        reason: transition.reason,
        metadata: transition.metadata || {},
      },
    })

    // Mark transition as processed
    await this.prisma.scheduledStateTransition.update({
      where: { id: transition.id },
      data: {
        processedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // Publish state change event
    await this.eventService.publishLessonStatusChanged(
      booking.id,
      booking.status,
      transition.toStatus,
      {
        studentId: booking.studentId,
        instructorId: booking.instructorId,
        serviceId: booking.serviceId,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        status: transition.toStatus,
        previousStatus: booking.status,
        studentName: booking.student?.fullName,
        instructorName: booking.instructor?.displayName,
        serviceName: booking.service?.name,
        pickupAddress: booking.pickupAddress || undefined,
        dropoffAddress: booking.dropoffAddress || undefined,
        priceCents: booking.priceCents,
        platformFeeCents: booking.platformFeeCents,
        instructorShareCents: booking.instructorShareCents,
      }
    )

    console.log(`[CRON] Executed state transition ${transition.id}: ${booking.status} -> ${transition.toStatus}`)
  }

  // ===== Scheduling Methods =====

  /**
   * Schedule a future state transition
   */
  async scheduleStateTransition(
    bookingId: string,
    toStatus: BookingStatus,
    executeAt: Date,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { orgId: true },
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    const transition = await this.prisma.scheduledStateTransition.create({
      data: {
        orgId: booking.orgId,
        bookingId,
        toStatus,
        executeAt,
        reason,
        metadata: metadata || {},
      },
    })

    return transition.id
  }

  /**
   * Cancel a scheduled state transition
   */
  async cancelScheduledTransition(transitionId: string): Promise<void> {
    await this.prisma.scheduledStateTransition.delete({
      where: { id: transitionId },
    })
  }

  // ===== Manual Operations =====

  /**
   * Manually trigger no-show detection (for testing/admin)
   */
  async triggerNoShowDetection(): Promise<NoShowDetectionResult> {
    console.log('[CRON] Manual no-show detection triggered')
    return this.detectAndProcessNoShows()
  }

  /**
   * Manually trigger state transition processing
   */
  async triggerStateTransitionProcessing(): Promise<CronJobResult[]> {
    console.log('[CRON] Manual state transition processing triggered')
    return this.processScheduledStateTransitions()
  }

  /**
   * Get cron service status
   */
  getStatus(): {
    isRunning: boolean
    pollingInterval: number
    noShowGracePeriod: number
    uptime?: number
  } {
    return {
      isRunning: this.isRunning,
      pollingInterval: this.POLLING_INTERVAL_MS,
      noShowGracePeriod: this.NO_SHOW_GRACE_PERIOD_MIN,
    }
  }

  /**
   * Get scheduled transitions for debugging
   */
  async getScheduledTransitions(): Promise<Array<{
    id: string
    bookingId: string
    toStatus: BookingStatus
    executeAt: string
    reason: string
    attempts: number
    isOverdue: boolean
  }>> {
    const transitions = await this.prisma.scheduledStateTransition.findMany({
      where: {
        processedAt: null,
      },
      orderBy: { executeAt: 'asc' },
      take: 100,
    })

    const now = new Date()

    return transitions.map(t => ({
      id: t.id,
      bookingId: t.bookingId,
      toStatus: t.toStatus,
      executeAt: t.executeAt.toISOString(),
      reason: t.reason,
      attempts: t.attempts,
      isOverdue: t.executeAt < now,
    }))
  }
}