import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient, BookingStatus } from '@prisma/client';

describe('Booking Model Enhancements', () => {
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
      data: { name: 'Test Org', timeZone: 'Australia/Sydney' }
    });
    orgId = org.id;

    const user = await db.user.create({
      data: { email: 'test@example.com', fullName: 'Test User' }
    });
    userId = user.id;

    const student = await db.student.create({
      data: { orgId, fullName: 'Test Student' }
    });
    studentId = student.id;

    const instructor = await db.instructor.create({
      data: { orgId, displayName: 'Test Instructor' }
    });
    instructorId = instructor.id;

    const service = await db.service.create({
      data: { orgId, name: 'Test Service', durationMin: 60 }
    });
    serviceId = service.id;
  });

  afterEach(async () => {
    // Clean up bookings after each test
    await db.booking.deleteMany({ where: { orgId } });
  });

  afterAll(async () => {
    // Clean up all test data
    await db.booking.deleteMany({ where: { orgId } });
    await db.service.delete({ where: { id: serviceId } });
    await db.instructor.delete({ where: { id: instructorId } });
    await db.student.delete({ where: { id: studentId } });
    await db.user.delete({ where: { id: userId } });
    await db.org.delete({ where: { id: orgId } });
    await db.$disconnect();
  });

  describe('Idempotency Support', () => {
    it('should create booking with idempotency key', async () => {
      const idempotencyKey = 'test-key-123';
      const startAt = new Date('2025-12-01T10:00:00Z');
      const endAt = new Date('2025-12-01T11:00:00Z');

      const booking = await db.booking.create({
        data: {
          orgId,
          studentId,
          instructorId,
          serviceId,
          startAt,
          endAt,
          status: 'requested',
          priceCents: 9500,
          platformFeeCents: 950,
          instructorShareCents: 8550,
          idempotencyKey
        }
      });

      expect(booking.idempotencyKey).toBe(idempotencyKey);
    });

    it('should enforce unique constraint on idempotency key', async () => {
      const idempotencyKey = 'duplicate-key';
      const startAt = new Date('2025-12-01T10:00:00Z');
      const endAt = new Date('2025-12-01T11:00:00Z');

      // Create first booking
      await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId, startAt, endAt,
          status: 'requested', priceCents: 9500, platformFeeCents: 950,
          instructorShareCents: 8550, idempotencyKey
        }
      });

      // Try to create duplicate - should fail
      await expect(
        db.booking.create({
          data: {
            orgId, studentId, instructorId, serviceId, 
            startAt: new Date('2025-12-01T14:00:00Z'),
            endAt: new Date('2025-12-01T15:00:00Z'),
            status: 'requested', priceCents: 9500, platformFeeCents: 950,
            instructorShareCents: 8550, idempotencyKey // Same key
          }
        })
      ).rejects.toThrow(/Unique constraint failed/);
    });
  });

  describe('State Transition Tracking', () => {
    it('should track status changes with actor and timestamp', async () => {
      const startAt = new Date('2025-12-01T10:00:00Z');
      const endAt = new Date('2025-12-01T11:00:00Z');

      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId, startAt, endAt,
          status: 'requested', priceCents: 9500, platformFeeCents: 950,
          instructorShareCents: 8550,
          statusChangedBy: userId,
          statusChangedAt: new Date()
        }
      });

      expect(booking.status).toBe('requested');
      expect(booking.statusChangedBy).toBe(userId);
      expect(booking.statusChangedAt).toBeInstanceOf(Date);

      // Update status
      const updatedBooking = await db.booking.update({
        where: { id: booking.id },
        data: {
          previousStatus: booking.status,
          status: 'confirmed',
          statusChangedBy: userId,
          statusChangedAt: new Date()
        }
      });

      expect(updatedBooking.previousStatus).toBe('requested');
      expect(updatedBooking.status).toBe('confirmed');
      expect(updatedBooking.statusChangedBy).toBe(userId);
    });

    it('should query bookings by status and change timestamp', async () => {
      const now = new Date();
      const startAt = new Date('2025-12-01T10:00:00Z');
      const endAt = new Date('2025-12-01T11:00:00Z');

      // Create booking with recent status change
      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId, startAt, endAt,
          status: 'confirmed', priceCents: 9500, platformFeeCents: 950,
          instructorShareCents: 8550, statusChangedAt: now
        }
      });

      // Query by status and timestamp
      const recentBookings = await db.booking.findMany({
        where: {
          orgId,
          status: 'confirmed',
          statusChangedAt: { gte: new Date(now.getTime() - 1000) }
        },
        orderBy: { statusChangedAt: 'desc' }
      });

      expect(recentBookings).toHaveLength(1);
      expect(recentBookings[0].id).toBe(booking.id);
    });
  });

  describe('Cancellation Tracking', () => {
    it('should track cancellation details', async () => {
      const startAt = new Date('2025-12-01T10:00:00Z');
      const endAt = new Date('2025-12-01T11:00:00Z');
      const cancelledAt = new Date();

      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId, startAt, endAt,
          status: 'cancelled', priceCents: 9500, platformFeeCents: 950,
          instructorShareCents: 8550,
          cancelledBy: userId,
          cancelledAt,
          cancellationReason: 'Student feeling unwell'
        }
      });

      expect(booking.status).toBe('cancelled');
      expect(booking.cancelledBy).toBe(userId);
      expect(booking.cancelledAt).toEqual(cancelledAt);
      expect(booking.cancellationReason).toBe('Student feeling unwell');
    });

    it('should find bookings cancelled by specific user', async () => {
      const startAt = new Date('2025-12-01T10:00:00Z');
      const endAt = new Date('2025-12-01T11:00:00Z');

      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId, startAt, endAt,
          status: 'cancelled', priceCents: 9500, platformFeeCents: 950,
          instructorShareCents: 8550, cancelledBy: userId
        }
      });

      const cancelledBookings = await db.booking.findMany({
        where: { orgId, cancelledBy: userId }
      });

      expect(cancelledBookings).toHaveLength(1);
      expect(cancelledBookings[0].id).toBe(booking.id);
    });
  });

  describe('Reschedule Tracking', () => {
    it('should track reschedule details', async () => {
      const originalStartAt = new Date('2025-12-01T10:00:00Z');
      const newStartAt = new Date('2025-12-01T14:00:00Z');
      const newEndAt = new Date('2025-12-01T15:00:00Z');
      const rescheduledAt = new Date();

      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId,
          startAt: newStartAt, endAt: newEndAt,
          status: 'confirmed', priceCents: 9500, platformFeeCents: 950,
          instructorShareCents: 8550,
          rescheduledFrom: originalStartAt,
          rescheduledAt,
          rescheduleReason: 'Conflict with school exam'
        }
      });

      expect(booking.rescheduledFrom).toEqual(originalStartAt);
      expect(booking.rescheduledAt).toEqual(rescheduledAt);
      expect(booking.rescheduleReason).toBe('Conflict with school exam');
      expect(booking.startAt).toEqual(newStartAt);
    });

    it('should find all rescheduled bookings', async () => {
      const originalStartAt = new Date('2025-12-01T10:00:00Z');
      const newStartAt = new Date('2025-12-01T14:00:00Z');
      const newEndAt = new Date('2025-12-01T15:00:00Z');

      const booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId,
          startAt: newStartAt, endAt: newEndAt,
          status: 'confirmed', priceCents: 9500, platformFeeCents: 950,
          instructorShareCents: 8550, rescheduledFrom: originalStartAt
        }
      });

      const rescheduledBookings = await db.booking.findMany({
        where: { orgId, rescheduledFrom: { not: null } }
      });

      expect(rescheduledBookings).toHaveLength(1);
      expect(rescheduledBookings[0].id).toBe(booking.id);
    });
  });

  describe('Index Performance', () => {
    it('should efficiently query by org and status', async () => {
      const startAt = new Date('2025-12-01T10:00:00Z');
      const endAt = new Date('2025-12-01T11:00:00Z');

      // Create multiple bookings with different statuses
      await Promise.all([
        db.booking.create({
          data: {
            orgId, studentId, instructorId, serviceId, startAt, endAt,
            status: 'requested', priceCents: 9500, platformFeeCents: 950,
            instructorShareCents: 8550
          }
        }),
        db.booking.create({
          data: {
            orgId, studentId, instructorId, serviceId, 
            startAt: new Date('2025-12-01T12:00:00Z'),
            endAt: new Date('2025-12-01T13:00:00Z'),
            status: 'confirmed', priceCents: 9500, platformFeeCents: 950,
            instructorShareCents: 8550
          }
        })
      ]);

      // Query by org and status (should use orgId_status index)
      const confirmedBookings = await db.booking.findMany({
        where: { orgId, status: 'confirmed' }
      });

      expect(confirmedBookings).toHaveLength(1);
      expect(confirmedBookings[0].status).toBe('confirmed');
    });
  });

  describe('Combined Workflow Tracking', () => {
    it('should handle complete booking lifecycle with all tracking fields', async () => {
      const originalStartAt = new Date('2025-12-01T10:00:00Z');
      const rescheduledStartAt = new Date('2025-12-01T14:00:00Z');
      const endAt = new Date('2025-12-01T15:00:00Z');
      const idempotencyKey = 'lifecycle-test';

      // Initial booking creation
      let booking = await db.booking.create({
        data: {
          orgId, studentId, instructorId, serviceId,
          startAt: originalStartAt,
          endAt: new Date('2025-12-01T11:00:00Z'),
          status: 'requested', priceCents: 9500, platformFeeCents: 950,
          instructorShareCents: 8550, idempotencyKey,
          statusChangedBy: userId, statusChangedAt: new Date()
        }
      });

      // Confirm booking
      booking = await db.booking.update({
        where: { id: booking.id },
        data: {
          previousStatus: 'requested',
          status: 'confirmed',
          statusChangedBy: userId,
          statusChangedAt: new Date()
        }
      });

      // Reschedule booking
      booking = await db.booking.update({
        where: { id: booking.id },
        data: {
          rescheduledFrom: originalStartAt,
          startAt: rescheduledStartAt,
          endAt,
          rescheduledAt: new Date(),
          rescheduleReason: 'Student request',
          previousStatus: 'confirmed',
          statusChangedBy: userId,
          statusChangedAt: new Date()
        }
      });

      // Verify all tracking data is preserved
      expect(booking.idempotencyKey).toBe(idempotencyKey);
      expect(booking.rescheduledFrom).toEqual(originalStartAt);
      expect(booking.startAt).toEqual(rescheduledStartAt);
      expect(booking.rescheduleReason).toBe('Student request');
      expect(booking.previousStatus).toBe('confirmed');
      expect(booking.statusChangedBy).toBe(userId);
    });
  });
});