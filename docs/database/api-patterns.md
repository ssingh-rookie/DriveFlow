# Database API Patterns & Best Practices

This document outlines the recommended patterns for interacting with the DriveFlow database, ensuring consistency, security, and performance.

## 🏛️ Architecture Patterns

### **Repository Pattern**
All database access goes through repositories to enforce multi-tenancy and business rules.

```typescript
// ✅ GOOD: Repository with org scoping
@Injectable()
export class BookingRepo {
  constructor(private readonly db: PrismaService) {}

  async findByOrg(orgId: string, filters?: BookingFilters): Promise<Booking[]> {
    return this.db.booking.findMany({
      where: {
        orgId, // Always scope by organization
        ...filters,
      },
      include: {
        student: true,
        instructor: true,
        service: true,
      },
    });
  }

  async findById(orgId: string, id: string): Promise<Booking | null> {
    return this.db.booking.findFirst({
      where: { id, orgId }, // Never allow cross-tenant access
    });
  }
}

// ❌ BAD: Direct Prisma access without org scoping
export class BookingService {
  async getBooking(id: string) {
    return this.db.booking.findUnique({ where: { id } }); // Security vulnerability!
  }
}
```

### **Service Layer Pattern**
Business logic separated from data access.

```typescript
@Injectable()
export class BookingService {
  constructor(
    private readonly bookingRepo: BookingRepo,
    private readonly paymentService: PaymentService,
    private readonly eventBus: EventBus,
  ) {}

  async createBooking(orgId: string, input: BookingCreate): Promise<Booking> {
    // 1. Business validation
    await this.validateBookingRules(orgId, input);
    
    // 2. Calculate pricing
    const pricing = await this.calculatePricing(orgId, input.serviceId);
    
    // 3. Create booking with price snapshot
    const booking = await this.bookingRepo.create(orgId, {
      ...input,
      ...pricing,
      status: 'requested',
    });
    
    // 4. Trigger side effects
    await this.eventBus.publish('booking.created', { bookingId: booking.id });
    
    return booking;
  }

  private async validateBookingRules(orgId: string, input: BookingCreate) {
    // Check instructor availability
    const availability = await this.checkAvailability(orgId, input);
    if (!availability.isAvailable) {
      throw new ConflictException('Instructor not available at requested time');
    }
    
    // Validate service exists and is active
    const service = await this.serviceRepo.findById(orgId, input.serviceId);
    if (!service?.active) {
      throw new NotFoundException('Service not found or inactive');
    }
  }
}
```

## 🔒 Multi-Tenancy Patterns

### **Automatic Org Scoping**
Use decorators to automatically inject org context.

```typescript
// Custom decorator for org context
export const OrgScoped = () => SetMetadata('org-scoped', true);

// Guard to inject orgId
@Injectable()
export class OrgScopingGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // Inject orgId from authenticated user context
    request.orgId = user.currentOrgId;
    return true;
  }
}

// Usage in controllers
@Controller('v1/bookings')
@UseGuards(OrgScopingGuard)
export class BookingController {
  @Get()
  @OrgScoped()
  async list(@Request() req) {
    const { orgId } = req;
    return this.bookingService.findByOrg(orgId);
  }
}
```

### **Repository Base Class**
Common multi-tenancy logic in base repository.

```typescript
export abstract class OrgScopedRepository<T> {
  protected abstract model: string;
  
  constructor(protected readonly db: PrismaService) {}

  async findMany(orgId: string, where: any = {}): Promise<T[]> {
    return this.db[this.model].findMany({
      where: { orgId, ...where },
    });
  }

  async findById(orgId: string, id: string): Promise<T | null> {
    return this.db[this.model].findFirst({
      where: { id, orgId },
    });
  }

  async create(orgId: string, data: any): Promise<T> {
    return this.db[this.model].create({
      data: { ...data, orgId },
    });
  }

  async update(orgId: string, id: string, data: any): Promise<T> {
    return this.db[this.model].update({
      where: { id, orgId },
      data,
    });
  }

  async delete(orgId: string, id: string): Promise<T> {
    return this.db[this.model].delete({
      where: { id, orgId },
    });
  }
}

// Specific repository implementation
@Injectable()
export class StudentRepo extends OrgScopedRepository<Student> {
  protected model = 'student';

  async findWithGuardians(orgId: string, id: string): Promise<StudentWithGuardians | null> {
    return this.db.student.findFirst({
      where: { id, orgId },
      include: {
        guardians: {
          include: { guardian: true },
        },
      },
    });
  }
}
```

## 💰 Financial Operations Patterns

### **Price Snapshotting**
Always capture pricing at booking time to handle rate changes.

```typescript
@Injectable()
export class PricingService {
  async calculateBookingPrice(orgId: string, serviceId: string): Promise<BookingPricing> {
    // Get current rate card
    const rateCard = await this.rateCardRepo.findDefault(orgId);
    const rateItem = await this.rateCardRepo.findServicePrice(rateCard.id, serviceId);
    
    // Calculate platform economics
    const totalCents = rateItem.priceCents;
    const platformFeeCents = Math.round(totalCents * 0.15); // 15% platform fee
    const instructorShareCents = totalCents - platformFeeCents;
    
    return {
      currency: rateCard.currency,
      priceCents: totalCents,
      platformFeeCents,
      instructorShareCents,
    };
  }

  // Price is snapshotted in booking, never recalculated
  async createBookingWithPricing(orgId: string, input: BookingCreate): Promise<Booking> {
    const pricing = await this.calculateBookingPrice(orgId, input.serviceId);
    
    return this.bookingRepo.create(orgId, {
      ...input,
      ...pricing, // Price locked at creation time
    });
  }
}
```

### **Payment Processing Pattern**
Stripe integration with proper error handling and webhook processing.

```typescript
@Injectable()
export class PaymentService {
  constructor(
    private readonly stripe: Stripe,
    private readonly paymentRepo: PaymentRepo,
  ) {}

  async createPaymentIntent(orgId: string, bookingId: string): Promise<Payment> {
    const booking = await this.bookingRepo.findById(orgId, bookingId);
    
    // Create Stripe PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: booking.priceCents,
      currency: booking.currency.toLowerCase(),
      metadata: {
        orgId,
        bookingId,
      },
    });

    // Store payment record
    return this.paymentRepo.create(orgId, {
      bookingId,
      status: 'intent_created',
      amountCents: booking.priceCents,
      platformFeeCents: booking.platformFeeCents,
      instructorShareCents: booking.instructorShareCents,
      currency: booking.currency,
      stripePaymentIntentId: paymentIntent.id,
    });
  }

  // Handle Stripe webhook
  async processWebhook(event: Stripe.Event): Promise<void> {
    // Idempotency check
    const existing = await this.webhookRepo.findByEventId(event.id);
    if (existing) return;

    // Store webhook event
    await this.webhookRepo.create({
      provider: 'stripe',
      eventType: event.type,
      eventId: event.id,
      payload: event,
    });

    // Process based on event type
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
    }
  }
}
```

## 📍 GPS & Location Patterns

### **Efficient GPS Ingestion**
Batch insert GPS points for performance.

```typescript
@Injectable()
export class GPSTrackingService {
  async startTrip(orgId: string, lessonId: string): Promise<Trip> {
    return this.tripRepo.create(orgId, {
      lessonId,
      startedAt: new Date(),
    });
  }

  async ingestGPSPoints(tripId: string, points: GPSPoint[]): Promise<void> {
    // Batch insert for performance
    const tripPoints = points.map(point => ({
      tripId,
      ts: point.timestamp,
      lat: new Decimal(point.latitude),
      lng: new Decimal(point.longitude),
      speedKph: point.speed ? new Decimal(point.speed) : null,
    }));

    await this.db.tripPoint.createMany({
      data: tripPoints,
      skipDuplicates: true, // Handle potential duplicates
    });
  }

  // Efficient route retrieval with pagination
  async getTripRoute(tripId: string, cursor?: string, limit = 1000): Promise<TripPoint[]> {
    return this.db.tripPoint.findMany({
      where: { tripId },
      cursor: cursor ? { id: cursor } : undefined,
      take: limit,
      orderBy: { ts: 'asc' },
    });
  }
}
```

### **Location Queries**
Spatial queries ready for PostGIS upgrade.

```typescript
@Injectable()
export class LocationService {
  // Current implementation with decimal coordinates
  async findNearbyInstructors(orgId: string, lat: number, lng: number, radiusKm: number): Promise<Instructor[]> {
    // Simple bounding box query (will upgrade to PostGIS spatial query)
    const latDelta = radiusKm / 111; // Rough km to degree conversion
    const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    return this.db.instructor.findMany({
      where: {
        orgId,
        active: true,
        // This would become a PostGIS ST_DWithin query
        // For now, we'll handle in application logic
      },
    });
  }

  // Future PostGIS implementation
  async findNearbyInstructorsPostGIS(orgId: string, lat: number, lng: number, radiusKm: number): Promise<Instructor[]> {
    return this.db.$queryRaw`
      SELECT i.* FROM "Instructor" i
      WHERE i."orgId" = ${orgId}
        AND i.active = true
        AND ST_DWithin(
          i.location_geom,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
          ${radiusKm * 1000}
        )
    `;
  }
}
```

## 📊 Query Optimization Patterns

### **Efficient Pagination**
Cursor-based pagination for large datasets.

```typescript
export interface CursorPaginationArgs {
  cursor?: string;
  limit?: number;
  orderBy?: 'asc' | 'desc';
}

@Injectable()
export class BookingRepo {
  async findManyPaginated(
    orgId: string,
    args: CursorPaginationArgs,
    filters?: BookingFilters,
  ): Promise<{ bookings: Booking[]; nextCursor?: string }> {
    const limit = Math.min(args.limit || 20, 100); // Cap at 100

    const bookings = await this.db.booking.findMany({
      where: {
        orgId,
        ...filters,
      },
      cursor: args.cursor ? { id: args.cursor } : undefined,
      take: limit + 1, // Fetch one extra to determine if there's a next page
      orderBy: { createdAt: args.orderBy || 'desc' },
    });

    const hasNextPage = bookings.length > limit;
    const results = hasNextPage ? bookings.slice(0, -1) : bookings;
    const nextCursor = hasNextPage ? results[results.length - 1].id : undefined;

    return {
      bookings: results,
      nextCursor,
    };
  }
}
```

### **Optimized Joins**
Strategic use of Prisma includes and selects.

```typescript
// ✅ GOOD: Selective includes
async findBookingWithDetails(orgId: string, id: string): Promise<BookingWithDetails | null> {
  return this.db.booking.findFirst({
    where: { id, orgId },
    include: {
      student: {
        select: { id: true, fullName: true, email: true } // Only needed fields
      },
      instructor: {
        select: { id: true, displayName: true, phone: true }
      },
      service: {
        select: { id: true, name: true, durationMin: true }
      },
      lesson: {
        include: {
          trips: {
            select: { id: true, startedAt: true, endedAt: true }
          }
        }
      }
    }
  });
}

// ❌ BAD: Over-fetching data
async findBookingBadExample(orgId: string, id: string) {
  return this.db.booking.findFirst({
    where: { id, orgId },
    include: {
      student: {
        include: {
          guardians: {
            include: { guardian: true } // Unnecessary for basic booking view
          }
        }
      },
      // Including everything without consideration
    }
  });
}
```

### **Aggregate Queries**
Efficient reporting queries.

```typescript
@Injectable()
export class ReportingService {
  async getInstructorStats(orgId: string, instructorId: string, dateRange: DateRange) {
    const stats = await this.db.booking.aggregate({
      where: {
        orgId,
        instructorId,
        startAt: {
          gte: dateRange.from,
          lte: dateRange.to,
        },
        status: 'completed',
      },
      _count: { id: true },
      _sum: { instructorShareCents: true },
      _avg: { 
        lesson: {
          rating: true,
          distanceMeters: true,
        }
      },
    });

    return {
      totalLessons: stats._count.id,
      totalEarningsCents: stats._sum.instructorShareCents || 0,
      avgRating: stats._avg.lesson?.rating || 0,
      avgDistanceMeters: stats._avg.lesson?.distanceMeters || 0,
    };
  }
}
```

## 🔄 Event & Audit Patterns

### **Audit Logging**
Automatic audit trail for important changes.

```typescript
@Injectable()
export class AuditService {
  async logChange<T>(
    orgId: string,
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    before: T | null,
    after: T | null,
    ip?: string,
  ): Promise<void> {
    await this.db.auditLog.create({
      data: {
        orgId,
        actorUserId,
        action,
        entityType,
        entityId,
        before: before as any,
        after: after as any,
        ip,
      },
    });
  }
}

// Usage in service layer
@Injectable()
export class BookingService {
  async updateBookingStatus(
    orgId: string,
    bookingId: string,
    newStatus: BookingStatus,
    actorUserId: string,
  ): Promise<Booking> {
    const before = await this.bookingRepo.findById(orgId, bookingId);
    
    const updated = await this.bookingRepo.update(orgId, bookingId, {
      status: newStatus,
    });

    // Audit the change
    await this.auditService.logChange(
      orgId,
      actorUserId,
      'BOOKING_STATUS_UPDATED',
      'Booking',
      bookingId,
      before,
      updated,
    );

    return updated;
  }
}
```

### **Outbox Pattern Implementation**
Reliable event publishing with transactional guarantees.

```typescript
@Injectable()
export class OutboxService {
  async publishEvent(topic: string, payload: any): Promise<void> {
    await this.db.outbox.create({
      data: {
        topic,
        payload,
      },
    });
  }

  // Background processor
  async processOutboxEvents(): Promise<void> {
    const events = await this.db.outbox.findMany({
      where: { processedAt: null },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    for (const event of events) {
      try {
        await this.eventBus.publish(event.topic, event.payload);
        
        await this.db.outbox.update({
          where: { id: event.id },
          data: { processedAt: new Date() },
        });
      } catch (error) {
        await this.db.outbox.update({
          where: { id: event.id },
          data: {
            attempts: { increment: 1 },
            lastError: error.message,
          },
        });
      }
    }
  }
}
```

## 🔍 Testing Patterns

### **Repository Testing**
Mock-free testing with test database.

```typescript
describe('BookingRepo', () => {
  let repo: BookingRepo;
  let testDb: PrismaService;
  let orgId: string;

  beforeEach(async () => {
    // Use separate test database
    testDb = new PrismaService({
      datasources: { db: { url: process.env.TEST_DATABASE_URL } }
    });
    
    repo = new BookingRepo(testDb);
    
    // Create test org
    const org = await testDb.org.create({
      data: { name: 'Test Org', timeZone: 'UTC' }
    });
    orgId = org.id;
  });

  it('should enforce org scoping', async () => {
    const otherOrg = await testDb.org.create({
      data: { name: 'Other Org', timeZone: 'UTC' }
    });

    const booking = await createTestBooking(otherOrg.id);
    
    // Should not find booking from different org
    const result = await repo.findById(orgId, booking.id);
    expect(result).toBeNull();
  });
});
```

### **Service Testing**
Test business logic with mocked repositories.

```typescript
describe('BookingService', () => {
  let service: BookingService;
  let mockBookingRepo: jest.Mocked<BookingRepo>;
  let mockPricingService: jest.Mocked<PricingService>;

  beforeEach(() => {
    mockBookingRepo = createMockRepository();
    mockPricingService = createMockService();
    
    service = new BookingService(
      mockBookingRepo,
      mockPricingService,
      mockEventBus,
    );
  });

  it('should create booking with price snapshot', async () => {
    const pricing = { priceCents: 9500, platformFeeCents: 1425, instructorShareCents: 8075 };
    mockPricingService.calculateBookingPrice.mockResolvedValue(pricing);

    const input = { serviceId: 'service-1', instructorId: 'instructor-1' };
    
    await service.createBooking('org-1', input);
    
    expect(mockBookingRepo.create).toHaveBeenCalledWith('org-1', {
      ...input,
      ...pricing,
      status: 'requested',
    });
  });
});
```

These patterns ensure **consistent**, **secure**, and **performant** database interactions throughout the DriveFlow platform while maintaining **multi-tenancy** and **audit compliance**.
