import type { PrismaService } from "@/core/prisma/prisma.service";
import { Injectable } from "@nestjs/common";

interface CreateLessonRequest {
  instructorId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  pickupAddress: string;
  dropoffAddress?: string;
  notes?: string;
}

interface UpdateLessonRequest {
  status: string;
}

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async getLessons() {
    // Get bookings from database
    const bookings = await this.prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        service: true,
        instructor: true,
        student: true,
      },
    });

    // Convert database bookings to API format
    return bookings.map((booking) => ({
      id: booking.id,
      studentId: booking.studentId,
      instructorId: booking.instructorId,
      instructorName: booking.instructor?.displayName || "Unknown Instructor",
      serviceId: booking.serviceId,
      serviceName: booking.service?.name || "Unknown Service",
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      pickupAddress: booking.pickupAddress || "",
      dropoffAddress: booking.dropoffAddress || booking.pickupAddress || "",
      notes: booking.notes || "",
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
      totalCents: booking.priceCents,
    }));
  }

  async createLesson(request: CreateLessonRequest) {
    // Get the first organization and student for demo purposes
    const org = await this.prisma.org.findFirst();
    const student = await this.prisma.student.findFirst({
      where: { orgId: org?.id },
    });

    if (!org || !student) {
      throw new Error(
        "Demo organization or student not found. Please run seed.",
      );
    }

    // Get the service to calculate price
    const service = await this.prisma.service.findUnique({
      where: { id: request.serviceId },
    });

    // Get the default rate card and pricing
    const rateCard = await this.prisma.rateCard.findFirst({
      where: {
        orgId: org.id,
        isDefault: true,
      },
    });

    let priceCents = 8000; // Default $80
    if (rateCard && service) {
      const rateCardItem = await this.prisma.rateCardItem.findFirst({
        where: {
          rateCardId: rateCard.id,
          serviceId: service.id,
        },
      });
      if (rateCardItem) {
        priceCents = rateCardItem.priceCents;
      }
    }

    // Create the booking in database
    const booking = await this.prisma.booking.create({
      data: {
        orgId: org.id,
        studentId: student.id,
        instructorId: request.instructorId,
        serviceId: request.serviceId,
        startAt: new Date(request.startAt),
        endAt: new Date(request.endAt),
        pickupAddress: request.pickupAddress,
        dropoffAddress: request.dropoffAddress || request.pickupAddress,
        notes: request.notes || "",
        status: "requested",
        priceCents,
        platformFeeCents: Math.floor(priceCents * 0.15), // 15% platform fee
        instructorShareCents: Math.floor(priceCents * 0.85), // 85% to instructor
        currency: "AUD",
      },
    });

    // Return in API format
    return {
      id: booking.id,
      studentId: booking.studentId,
      instructorId: booking.instructorId,
      serviceId: booking.serviceId,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      pickupAddress: booking.pickupAddress || "",
      dropoffAddress: booking.dropoffAddress || "",
      notes: booking.notes || "",
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
      totalCents: booking.priceCents,
    };
  }

  async updateLesson(id: string, request: UpdateLessonRequest) {
    // Map the status if needed (the API uses simple strings, DB uses enum)
    const statusMap: Record<string, any> = {
      cancelled: "cancelled",
      confirmed: "confirmed",
      completed: "completed",
      requested: "requested",
      pending_payment: "pending_payment",
      in_progress: "in_progress",
      no_show: "no_show",
    };

    const booking = await this.prisma.booking.update({
      where: { id },
      data: {
        status: statusMap[request.status] || request.status,
        statusChangedAt: new Date(),
      },
    });

    return {
      id: booking.id,
      studentId: booking.studentId,
      instructorId: booking.instructorId,
      serviceId: booking.serviceId,
      startAt: booking.startAt.toISOString(),
      endAt: booking.endAt.toISOString(),
      pickupAddress: booking.pickupAddress || "",
      dropoffAddress: booking.dropoffAddress || "",
      notes: booking.notes || "",
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
      totalCents: booking.priceCents,
    };
  }

  // Seed some demo bookings if needed
  async seedDemoLessons() {
    const bookingCount = await this.prisma.booking.count();

    if (bookingCount === 0) {
      console.log("📚 Seeding demo bookings...");

      const org = await this.prisma.org.findFirst();
      const student = await this.prisma.student.findFirst({
        where: { orgId: org?.id },
      });
      const instructor = await this.prisma.instructor.findFirst({
        where: { orgId: org?.id },
      });
      const service = await this.prisma.service.findFirst({
        where: { orgId: org?.id },
      });

      if (org && student && instructor && service) {
        // Get pricing from rate card
        const rateCard = await this.prisma.rateCard.findFirst({
          where: { orgId: org.id, isDefault: true },
        });

        let priceCents = 9500; // Default
        if (rateCard) {
          const rateCardItem = await this.prisma.rateCardItem.findFirst({
            where: { rateCardId: rateCard.id, serviceId: service.id },
          });
          if (rateCardItem) {
            priceCents = rateCardItem.priceCents;
          }
        }

        // Create some demo bookings
        const now = new Date();
        const bookings = [
          {
            orgId: org.id,
            studentId: student.id,
            instructorId: instructor.id,
            serviceId: service.id,
            startAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
            endAt: new Date(
              now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
            ), // Tomorrow + 1 hour
            pickupAddress: "123 Main St, Sydney NSW 2000",
            dropoffAddress: "123 Main St, Sydney NSW 2000",
            status: "confirmed" as const,
            priceCents,
            platformFeeCents: Math.floor(priceCents * 0.15),
            instructorShareCents: Math.floor(priceCents * 0.85),
            currency: "AUD",
            notes: "First lesson - highway driving practice",
          },
          {
            orgId: org.id,
            studentId: student.id,
            instructorId: instructor.id,
            serviceId: service.id,
            startAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Last week
            endAt: new Date(
              now.getTime() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
            ),
            pickupAddress: "456 Park Ave, Sydney NSW 2000",
            dropoffAddress: "789 City Rd, Sydney NSW 2000",
            status: "completed" as const,
            priceCents,
            platformFeeCents: Math.floor(priceCents * 0.15),
            instructorShareCents: Math.floor(priceCents * 0.85),
            currency: "AUD",
            notes: "Parallel parking practice - Great progress!",
          },
          {
            orgId: org.id,
            studentId: student.id,
            instructorId: instructor.id,
            serviceId: service.id,
            startAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // In 3 days
            endAt: new Date(
              now.getTime() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
            ),
            pickupAddress: "789 Queen St, Sydney NSW 2000",
            dropoffAddress: "789 Queen St, Sydney NSW 2000",
            status: "requested" as const,
            priceCents,
            platformFeeCents: Math.floor(priceCents * 0.15),
            instructorShareCents: Math.floor(priceCents * 0.85),
            currency: "AUD",
            notes: "Test preparation session",
          },
          {
            orgId: org.id,
            studentId: student.id,
            instructorId: instructor.id,
            serviceId: service.id,
            startAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Next week
            endAt: new Date(
              now.getTime() + 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000,
            ),
            pickupAddress: "321 George St, Sydney NSW 2000",
            dropoffAddress: "321 George St, Sydney NSW 2000",
            status: "pending_payment" as const,
            priceCents,
            platformFeeCents: Math.floor(priceCents * 0.15),
            instructorShareCents: Math.floor(priceCents * 0.85),
            currency: "AUD",
            notes: "Extended highway driving session",
          },
          {
            orgId: org.id,
            studentId: student.id,
            instructorId: instructor.id,
            serviceId: service.id,
            startAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
            endAt: new Date(
              now.getTime() - 14 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
            ),
            pickupAddress: "555 Kent St, Sydney NSW 2000",
            dropoffAddress: "555 Kent St, Sydney NSW 2000",
            status: "completed" as const,
            priceCents,
            platformFeeCents: Math.floor(priceCents * 0.15),
            instructorShareCents: Math.floor(priceCents * 0.85),
            currency: "AUD",
            notes: "Three-point turn practice",
          },
          {
            orgId: org.id,
            studentId: student.id,
            instructorId: instructor.id,
            serviceId: service.id,
            startAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
            endAt: new Date(
              now.getTime() - 10 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
            ),
            pickupAddress: "999 Pitt St, Sydney NSW 2000",
            dropoffAddress: "999 Pitt St, Sydney NSW 2000",
            status: "cancelled" as const,
            priceCents,
            platformFeeCents: Math.floor(priceCents * 0.15),
            instructorShareCents: Math.floor(priceCents * 0.85),
            currency: "AUD",
            notes: "Cancelled due to weather",
            cancelledAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
            cancellationReason: "Weather conditions unsafe for driving",
          },
        ];

        for (const bookingData of bookings) {
          await this.prisma.booking.create({ data: bookingData });
        }

        console.log("✅ Demo bookings created:", bookings.length);
      }
    } else {
      console.log(`ℹ️ Database already has ${bookingCount} bookings`);
    }
  }
}
