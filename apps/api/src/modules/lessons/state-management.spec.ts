import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, BookingStatus, OrgRole } from '@prisma/client';

describe('State Management System', () => {
  let db: PrismaClient;
  let orgId: string;
  let studentId: string;
  let instructorId: string;
  let serviceId: string;
  let userId: string;

  beforeAll(async () => {
    db = new PrismaClient();
    
    // Create test data
    const org = await db.org.create({
      data: { name: 'State Test Org', timeZone: 'Australia/Sydney' }
    });
    orgId = org.id;

    const user = await db.user.create({
      data: { email: 'state@test.com', fullName: 'State Test User' }
    });
    userId = user.id;

    const student = await db.student.create({
      data: { orgId, fullName: 'State Test Student' }
    });
    studentId = student.id;

    const instructor = await db.instructor.create({
      data: { orgId, displayName: 'State Test Instructor' }
    });
    instructorId = instructor.id;

    const service = await db.service.create({
      data: { orgId, name: 'State Test Service', durationMin: 60 }
    });
    serviceId = service.id;
  });

  afterEach(async () => {
    // Clean up test data after each test
    await db.scheduledStateTransition.deleteMany({ where: { orgId } });
    await db.lessonStateHistory.deleteMany({ where: { orgId } });
    await db.stateTransitionRule.deleteMany({ where: { orgId } });
    await db.booking.deleteMany({ where: { orgId } });
  });

  afterAll(async () => {
    // Final cleanup
    await db.scheduledStateTransition.deleteMany({ where: { orgId } });
    await db.lessonStateHistory.deleteMany({ where: { orgId } });
    await db.stateTransitionRule.deleteMany({ where: { orgId } });
    await db.booking.deleteMany({ where: { orgId } });
    await db.service.delete({ where: { id: serviceId } });
    await db.instructor.delete({ where: { id: instructorId } });
    await db.student.delete({ where: { id: studentId } });
    await db.user.delete({ where: { id: userId } });
    await db.org.delete({ where: { id: orgId } });
    await db.$disconnect();
  });

  describe('Extended BookingStatus Enum', () => {
    it('should support new booking statuses', async () => {
      const newStatuses: BookingStatus[] = ['draft', 'pending_payment', 'scheduled'];
      
      for (const status of newStatuses) {
        const booking = await db.booking.create({
          data: {
            orgId, studentId, instructorId, serviceId,
            startAt: new Date('2025-12-01T10:00:00Z'),
            endAt: new Date('2025-12-01T11:00:00Z'),
            status,
            priceCents: 9500,
            platformFeeCents: 950,
            instructorShareCents: 8550
          }
        });

        expect(booking.status).toBe(status);
        await db.booking.delete({ where: { id: booking.id } });
      }
    });

    it('should support legacy booking statuses', async () => {
      const legacyStatuses: BookingStatus[] = ['requested', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
      
      for (const status of legacyStatuses) {
        const booking = await db.booking.create({
          data: {
            orgId, studentId, instructorId, serviceId,
            startAt: new Date('2025-12-01T10:00:00Z'),
            endAt: new Date('2025-12-01T11:00:00Z'),
            status,
            priceCents: 9500,
            platformFeeCents: 950,
            instructorShareCents: 8550
          }
        });

        expect(booking.status).toBe(status);
        await db.booking.delete({ where: { id: booking.id } });
      }
    });
  });

  describe('LessonStateHistory', () => {
    it('should track state transitions with full audit context', async () => {
      // Create a booking
      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId,
          startAt: new Date('2025-12-01T10:00:00Z'),
          endAt: new Date('2025-12-01T11:00:00Z'),
          status: 'draft',
          priceCents: 9500,
          platformFeeCents: 950,
          instructorShareCents: 8550
        }
      });

      // Track initial creation
      const initialHistory = await db.lessonStateHistory.create({
        data: {
          orgId,
          bookingId: booking.id,
          fromStatus: null, // Initial creation
          toStatus: 'draft',
          actorUserId: userId,
          reason: 'Initial booking creation',
          metadata: { action: 'created', initialState: true }
        }
      });

      expect(initialHistory.fromStatus).toBeNull();
      expect(initialHistory.toStatus).toBe('draft');
      expect(initialHistory.actorUserId).toBe(userId);
      expect(initialHistory.reason).toBe('Initial booking creation');
      expect(initialHistory.metadata).toEqual({ action: 'created', initialState: true });

      // Track state transition
      const transitionHistory = await db.lessonStateHistory.create({
        data: {
          orgId,
          bookingId: booking.id,
          fromStatus: 'draft',
          toStatus: 'pending_payment',
          actorUserId: userId,
          reason: 'Student submitted payment',
          metadata: { 
            paymentIntentId: 'pi_test123',
            amount: 9500,
            transitionTime: new Date().toISOString()
          }
        }
      });

      expect(transitionHistory.fromStatus).toBe('draft');
      expect(transitionHistory.toStatus).toBe('pending_payment');
      expect(transitionHistory.metadata).toHaveProperty('paymentIntentId');
    });

    it('should enable complete state history queries', async () => {
      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId,
          startAt: new Date('2025-12-01T10:00:00Z'),
          endAt: new Date('2025-12-01T11:00:00Z'),
          status: 'completed',
          priceCents: 9500,
          platformFeeCents: 950,
          instructorShareCents: 8550
        }
      });

      // Create multiple state history entries
      const stateTransitions = [
        { fromStatus: null, toStatus: 'draft' as const, reason: 'Created' },
        { fromStatus: 'draft' as const, toStatus: 'pending_payment' as const, reason: 'Payment initiated' },
        { fromStatus: 'pending_payment' as const, toStatus: 'confirmed' as const, reason: 'Payment confirmed' },
        { fromStatus: 'confirmed' as const, toStatus: 'in_progress' as const, reason: 'Lesson started' },
        { fromStatus: 'in_progress' as const, toStatus: 'completed' as const, reason: 'Lesson completed' }
      ];

      for (const transition of stateTransitions) {
        await db.lessonStateHistory.create({
          data: {
            orgId,
            bookingId: booking.id,
            ...transition,
            actorUserId: userId
          }
        });
      }

      // Query complete history
      const history = await db.lessonStateHistory.findMany({
        where: { bookingId: booking.id },
        orderBy: { createdAt: 'asc' },
        include: { actor: { select: { fullName: true } } }
      });

      expect(history).toHaveLength(5);
      expect(history[0].fromStatus).toBeNull();
      expect(history[0].toStatus).toBe('draft');
      expect(history[4].toStatus).toBe('completed');
      expect(history[0].actor?.fullName).toBe('State Test User');
    });

    it('should support efficient queries with indexes', async () => {
      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId,
          startAt: new Date('2025-12-01T10:00:00Z'),
          endAt: new Date('2025-12-01T11:00:00Z'),
          status: 'confirmed',
          priceCents: 9500,
          platformFeeCents: 950,
          instructorShareCents: 8550
        }
      });

      await db.lessonStateHistory.create({
        data: {
          orgId,
          bookingId: booking.id,
          fromStatus: 'draft',
          toStatus: 'confirmed',
          actorUserId: userId,
          reason: 'Direct confirmation'
        }
      });

      // Query by org and status (should use indexes)
      const confirmations = await db.lessonStateHistory.findMany({
        where: {
          orgId,
          toStatus: 'confirmed'
        }
      });

      expect(confirmations).toHaveLength(1);
      expect(confirmations[0].toStatus).toBe('confirmed');
    });
  });

  describe('ScheduledStateTransition', () => {
    it('should schedule future state transitions', async () => {
      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId,
          startAt: new Date('2025-12-01T10:00:00Z'),
          endAt: new Date('2025-12-01T11:00:00Z'),
          status: 'confirmed',
          priceCents: 9500,
          platformFeeCents: 950,
          instructorShareCents: 8550
        }
      });

      const executeAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

      const scheduledTransition = await db.scheduledStateTransition.create({
        data: {
          orgId,
          bookingId: booking.id,
          toStatus: 'no_show',
          executeAt,
          reason: 'Auto NoShow detection after grace period',
          metadata: {
            graceMinutes: 15,
            autoDetected: true,
            scheduledBy: 'system'
          }
        }
      });

      expect(scheduledTransition.toStatus).toBe('no_show');
      expect(scheduledTransition.executeAt).toEqual(executeAt);
      expect(scheduledTransition.attempts).toBe(0);
      expect(scheduledTransition.processedAt).toBeNull();
      expect(scheduledTransition.metadata).toHaveProperty('graceMinutes', 15);
    });

    it('should track processing attempts and errors', async () => {
      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId,
          startAt: new Date('2025-12-01T10:00:00Z'),
          endAt: new Date('2025-12-01T11:00:00Z'),
          status: 'pending_payment',
          priceCents: 9500,
          platformFeeCents: 950,
          instructorShareCents: 8550
        }
      });

      const scheduled = await db.scheduledStateTransition.create({
        data: {
          orgId,
          bookingId: booking.id,
          toStatus: 'cancelled',
          executeAt: new Date(Date.now() - 1000), // Past time
          reason: 'Payment timeout',
          attempts: 1,
          lastError: 'Booking not found in payment system'
        }
      });

      expect(scheduled.attempts).toBe(1);
      expect(scheduled.lastError).toBe('Booking not found in payment system');

      // Update after retry
      await db.scheduledStateTransition.update({
        where: { id: scheduled.id },
        data: {
          attempts: 2,
          lastError: null,
          processedAt: new Date()
        }
      });

      const updated = await db.scheduledStateTransition.findUnique({
        where: { id: scheduled.id }
      });

      expect(updated?.attempts).toBe(2);
      expect(updated?.lastError).toBeNull();
      expect(updated?.processedAt).not.toBeNull();
    });

    it('should query pending transitions efficiently', async () => {
      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId,
          startAt: new Date('2025-12-01T10:00:00Z'),
          endAt: new Date('2025-12-01T11:00:00Z'),
          status: 'confirmed',
          priceCents: 9500,
          platformFeeCents: 950,
          instructorShareCents: 8550
        }
      });

      // Create pending transition
      await db.scheduledStateTransition.create({
        data: {
          orgId,
          bookingId: booking.id,
          toStatus: 'no_show',
          executeAt: new Date(Date.now() - 1000), // Past time (ready to execute)
          reason: 'NoShow detection'
        }
      });

      // Create already processed transition
      await db.scheduledStateTransition.create({
        data: {
          orgId,
          bookingId: booking.id,
          toStatus: 'completed',
          executeAt: new Date(Date.now() - 2000),
          reason: 'Auto completion',
          processedAt: new Date()
        }
      });

      // Query pending transitions (should use executeAt, processedAt index)
      const pendingTransitions = await db.scheduledStateTransition.findMany({
        where: {
          executeAt: { lte: new Date() },
          processedAt: null
        },
        orderBy: { executeAt: 'asc' }
      });

      expect(pendingTransitions).toHaveLength(1);
      expect(pendingTransitions[0].toStatus).toBe('no_show');
    });
  });

  describe('StateTransitionRule', () => {
    it('should define valid transitions per role', async () => {
      // Student can only cancel (not directly update to other states)
      const studentRule = await db.stateTransitionRule.create({
        data: {
          orgId,
          fromStatus: 'confirmed',
          toStatus: 'cancelled',
          requiredRole: 'student',
          description: 'Students can cancel confirmed bookings',
          conditions: {
            cutoffHours: 2,
            refundPolicy: 'standard'
          }
        }
      });

      // Instructor can start lessons
      const instructorRule = await db.stateTransitionRule.create({
        data: {
          orgId,
          fromStatus: 'confirmed',
          toStatus: 'in_progress',
          requiredRole: 'instructor',
          description: 'Instructors can start confirmed lessons'
        }
      });

      // Admin can do anything
      const adminRule = await db.stateTransitionRule.create({
        data: {
          orgId,
          fromStatus: null, // Any status
          toStatus: 'cancelled',
          requiredRole: 'admin',
          description: 'Admins can cancel any booking'
        }
      });

      expect(studentRule.requiredRole).toBe('student');
      expect(studentRule.fromStatus).toBe('confirmed');
      expect(studentRule.toStatus).toBe('cancelled');

      expect(instructorRule.requiredRole).toBe('instructor');
      expect(adminRule.fromStatus).toBeNull(); // Any status
    });

    it('should enforce unique constraints on transition rules', async () => {
      // Create first rule
      await db.stateTransitionRule.create({
        data: {
          orgId,
          fromStatus: 'draft',
          toStatus: 'pending_payment',
          requiredRole: 'student',
          description: 'Students can submit payment'
        }
      });

      // Try to create duplicate - should fail
      await expect(
        db.stateTransitionRule.create({
          data: {
            orgId,
            fromStatus: 'draft',
            toStatus: 'pending_payment',
            requiredRole: 'student',
            description: 'Duplicate rule'
          }
        })
      ).rejects.toThrow(/Unique constraint failed/);
    });

    it('should allow different roles for same transition', async () => {
      // Student rule
      const studentRule = await db.stateTransitionRule.create({
        data: {
          orgId,
          fromStatus: 'confirmed',
          toStatus: 'cancelled',
          requiredRole: 'student',
          description: 'Student cancellation with conditions'
        }
      });

      // Admin rule for same transition
      const adminRule = await db.stateTransitionRule.create({
        data: {
          orgId,
          fromStatus: 'confirmed',
          toStatus: 'cancelled',
          requiredRole: 'admin',
          description: 'Admin cancellation without conditions'
        }
      });

      expect(studentRule.id).not.toBe(adminRule.id);
      expect(studentRule.requiredRole).toBe('student');
      expect(adminRule.requiredRole).toBe('admin');
    });

    it('should support complex business rule conditions', async () => {
      const rule = await db.stateTransitionRule.create({
        data: {
          orgId,
          fromStatus: 'confirmed',
          toStatus: 'cancelled',
          requiredRole: 'student',
          description: 'Student cancellation with complex conditions',
          conditions: {
            cutoffHours: 24,
            refundPercentage: 50,
            requiresReason: true,
            allowedReasons: ['illness', 'emergency', 'schedule_conflict'],
            feeStructure: {
              baseFee: 0,
              percentageFee: 50
            },
            timeRestrictions: {
              businessHoursOnly: false,
              minHoursBeforeStart: 2
            }
          }
        }
      });

      expect(rule.conditions).toHaveProperty('cutoffHours', 24);
      expect(rule.conditions).toHaveProperty('feeStructure');
      expect(rule.conditions).toHaveProperty('allowedReasons');
    });
  });

  describe('Integrated State Management Workflow', () => {
    it('should handle complete booking lifecycle with state tracking', async () => {
      // Create booking in draft state
      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId,
          startAt: new Date('2025-12-01T10:00:00Z'),
          endAt: new Date('2025-12-01T11:00:00Z'),
          status: 'draft',
          priceCents: 9500,
          platformFeeCents: 950,
          instructorShareCents: 8550
        }
      });

      // Track initial creation
      await db.lessonStateHistory.create({
        data: {
          orgId, bookingId: booking.id,
          fromStatus: null, toStatus: 'draft',
          actorUserId: userId, reason: 'Booking created'
        }
      });

      // Simulate payment submission (draft → pending_payment)
      await db.booking.update({
        where: { id: booking.id },
        data: { status: 'pending_payment' }
      });

      await db.lessonStateHistory.create({
        data: {
          orgId, bookingId: booking.id,
          fromStatus: 'draft', toStatus: 'pending_payment',
          actorUserId: userId, reason: 'Payment submitted'
        }
      });

      // Schedule payment timeout check
      const timeoutAt = new Date(Date.now() + 30 * 60 * 1000);
      await db.scheduledStateTransition.create({
        data: {
          orgId, bookingId: booking.id,
          toStatus: 'cancelled', executeAt: timeoutAt,
          reason: 'Payment timeout after 30 minutes'
        }
      });

      // Simulate successful payment (pending_payment → confirmed)
      await db.booking.update({
        where: { id: booking.id },
        data: { status: 'confirmed' }
      });

      await db.lessonStateHistory.create({
        data: {
          orgId, bookingId: booking.id,
          fromStatus: 'pending_payment', toStatus: 'confirmed',
          actorUserId: userId, reason: 'Payment confirmed'
        }
      });

      // Cancel the timeout since payment succeeded
      await db.scheduledStateTransition.updateMany({
        where: { bookingId: booking.id, processedAt: null },
        data: { processedAt: new Date() }
      });

      // Verify complete state history
      const history = await db.lessonStateHistory.findMany({
        where: { bookingId: booking.id },
        orderBy: { createdAt: 'asc' }
      });

      expect(history).toHaveLength(3);
      expect(history[0].toStatus).toBe('draft');
      expect(history[1].toStatus).toBe('pending_payment');
      expect(history[2].toStatus).toBe('confirmed');

      // Verify scheduled transition was cancelled
      const scheduledTransitions = await db.scheduledStateTransition.findMany({
        where: { bookingId: booking.id }
      });

      expect(scheduledTransitions).toHaveLength(1);
      expect(scheduledTransitions[0].processedAt).not.toBeNull();
    });

    it('should demonstrate state transition rule validation', async () => {
      // Set up transition rules
      await db.stateTransitionRule.createMany({
        data: [
          {
            orgId, fromStatus: 'draft', toStatus: 'pending_payment',
            requiredRole: 'student', description: 'Students can submit payment'
          },
          {
            orgId, fromStatus: 'confirmed', toStatus: 'in_progress',
            requiredRole: 'instructor', description: 'Instructors can start lessons'
          },
          {
            orgId, fromStatus: null, toStatus: 'cancelled',
            requiredRole: 'admin', description: 'Admins can cancel anything'
          }
        ]
      });

      // Query valid transitions for student from draft state
      const studentTransitions = await db.stateTransitionRule.findMany({
        where: {
          orgId,
          fromStatus: 'draft',
          requiredRole: 'student',
          isActive: true
        }
      });

      expect(studentTransitions).toHaveLength(1);
      expect(studentTransitions[0].toStatus).toBe('pending_payment');

      // Query what instructors can do with confirmed bookings
      const instructorTransitions = await db.stateTransitionRule.findMany({
        where: {
          orgId,
          fromStatus: 'confirmed',
          requiredRole: 'instructor',
          isActive: true
        }
      });

      expect(instructorTransitions).toHaveLength(1);
      expect(instructorTransitions[0].toStatus).toBe('in_progress');

      // Admin can cancel from any state
      const adminTransitions = await db.stateTransitionRule.findMany({
        where: {
          orgId,
          fromStatus: null, // Any state
          requiredRole: 'admin',
          isActive: true
        }
      });

      expect(adminTransitions).toHaveLength(1);
      expect(adminTransitions[0].toStatus).toBe('cancelled');
    });
  });
});