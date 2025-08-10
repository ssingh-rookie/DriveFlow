# Database Performance Guide

This guide covers optimization strategies, indexing, and scaling considerations for the DriveFlow database.

## 🎯 Performance Principles

### **Design for Scale**
- **Query patterns first**: Design indexes based on actual query patterns
- **Multi-tenant aware**: Every query includes `orgId` filtering
- **Time-series friendly**: Optimize for time-based queries (bookings, GPS data)
- **Read-heavy optimization**: Driving schools query more than they write

### **Key Metrics to Monitor**
- **Query response time**: < 100ms for simple queries, < 500ms for complex
- **Connection pool utilization**: < 80% under normal load
- **Index hit ratio**: > 99% for frequently accessed tables
- **Lock contention**: Minimal blocking queries

## 📊 Indexing Strategy

### **Primary Indexes (Already Implemented)**

#### **Multi-Tenant Queries**
```sql
-- Organization-scoped queries (most common pattern)
CREATE INDEX idx_booking_org_start ON "Booking"("orgId", "startAt");
CREATE INDEX idx_payment_org_status ON "Payment"("orgId", "status");
CREATE INDEX idx_instructor_org_active ON "Instructor"("orgId", "active");
CREATE INDEX idx_student_org_name ON "Student"("orgId", "fullName");
```

#### **User Activity Patterns**
```sql
-- Instructor schedule lookups
CREATE INDEX idx_booking_instructor_start ON "Booking"("instructorId", "startAt");
CREATE INDEX idx_availability_instructor_day ON "InstructorAvailability"("instructorId", "dayOfWeek");

-- Student history
CREATE INDEX idx_booking_student_start ON "Booking"("studentId", "startAt");
```

#### **GPS & Tracking**
```sql
-- Time-series GPS data
CREATE INDEX idx_trip_point_trip_ts ON "TripPoint"("tripId", "ts");
CREATE INDEX idx_trip_lesson ON "Trip"("lessonId");
```

#### **Event Processing**
```sql
-- Webhook idempotency
CREATE UNIQUE INDEX idx_webhook_event_id ON "WebhookEvent"("eventId");
CREATE INDEX idx_webhook_provider_processed ON "WebhookEvent"("provider", "processedAt");

-- Outbox processing
CREATE INDEX idx_outbox_topic_processed ON "Outbox"("topic", "processedAt");
```

### **Performance-Critical Indexes**

#### **Financial Queries**
```sql
-- Revenue reporting
CREATE INDEX idx_payment_org_created_status ON "Payment"("orgId", "createdAt", "status");
CREATE INDEX idx_payout_instructor_created ON "Payout"("instructorId", "createdAt");

-- Stripe reconciliation
CREATE INDEX idx_payment_stripe_intent ON "Payment"("stripePaymentIntentId");
CREATE INDEX idx_payout_stripe_transfer ON "Payout"("stripeTransferId");
```

#### **Availability Lookups**
```sql
-- Availability checking (hot path)
CREATE INDEX idx_availability_instructor_effective ON "InstructorAvailability"("instructorId", "effectiveFrom", "effectiveTo");
CREATE INDEX idx_availability_exception_instructor_date ON "AvailabilityException"("instructorId", "date");
```

#### **Audit & Compliance**
```sql
-- Audit trail queries
CREATE INDEX idx_audit_org_entity ON "AuditLog"("orgId", "entityType", "entityId");
CREATE INDEX idx_audit_actor_created ON "AuditLog"("actorUserId", "createdAt");
```

### **Composite Index Optimization**

#### **Order Matters**
```sql
-- ✅ GOOD: Most selective column first
CREATE INDEX idx_booking_status_org_date ON "Booking"("status", "orgId", "startAt");
-- For queries: WHERE status = 'confirmed' AND orgId = ? AND startAt > ?

-- ❌ BAD: Less selective column first
CREATE INDEX idx_booking_org_status_date ON "Booking"("orgId", "status", "startAt");
-- Less efficient for status-specific queries
```

#### **Query Pattern Analysis**
```sql
-- Analyze actual query patterns
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows
FROM pg_stat_statements 
WHERE query LIKE '%Booking%'
ORDER BY total_exec_time DESC;
```

## 🚀 Query Optimization

### **Efficient Pagination**
Use cursor-based pagination for large datasets:

```typescript
// ✅ GOOD: Cursor-based pagination
async function getBookings(orgId: string, cursor?: string, limit = 20) {
  return db.booking.findMany({
    where: { orgId },
    cursor: cursor ? { id: cursor } : undefined,
    take: limit,
    orderBy: { startAt: 'desc' },
  });
}

// ❌ BAD: Offset-based pagination (slow for large offsets)
async function getBookingsBad(orgId: string, page = 1, limit = 20) {
  return db.booking.findMany({
    where: { orgId },
    skip: (page - 1) * limit, // Becomes very slow
    take: limit,
  });
}
```

### **Selective Field Loading**
Only fetch required fields:

```typescript
// ✅ GOOD: Select only needed fields
async function getBookingList(orgId: string) {
  return db.booking.findMany({
    where: { orgId },
    select: {
      id: true,
      startAt: true,
      status: true,
      student: { select: { id: true, fullName: true } },
      instructor: { select: { id: true, displayName: true } },
      service: { select: { id: true, name: true } },
    },
  });
}

// ❌ BAD: Fetching all fields and relations
async function getBookingListBad(orgId: string) {
  return db.booking.findMany({
    where: { orgId },
    include: {
      student: { include: { guardians: true } }, // Unnecessary data
      instructor: true,
      service: true,
      lesson: { include: { trips: true } }, // Heavy nested data
    },
  });
}
```

### **Batch Operations**
Minimize database round trips:

```typescript
// ✅ GOOD: Batch operations
async function createMultipleBookings(orgId: string, bookings: BookingCreate[]) {
  // Single transaction with multiple inserts
  return db.$transaction(
    bookings.map(booking => 
      db.booking.create({
        data: { ...booking, orgId }
      })
    )
  );
}

// ✅ BETTER: Use createMany for bulk inserts
async function bulkCreateBookings(orgId: string, bookings: BookingCreate[]) {
  return db.booking.createMany({
    data: bookings.map(booking => ({ ...booking, orgId })),
    skipDuplicates: true,
  });
}

// ❌ BAD: Multiple individual queries
async function createBookingsSequentially(orgId: string, bookings: BookingCreate[]) {
  const results = [];
  for (const booking of bookings) {
    const result = await db.booking.create({
      data: { ...booking, orgId }
    });
    results.push(result);
  }
  return results;
}
```

### **Efficient Joins**
Minimize join complexity:

```typescript
// ✅ GOOD: Targeted joins with filtering
async function getActiveInstructorBookings(orgId: string, date: Date) {
  return db.booking.findMany({
    where: {
      orgId,
      startAt: {
        gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      },
      instructor: { active: true }, // Filter in the join
    },
    include: {
      instructor: { select: { id: true, displayName: true } },
      student: { select: { id: true, fullName: true } },
    },
  });
}

// ❌ BAD: Post-query filtering
async function getActiveInstructorBookingsBad(orgId: string, date: Date) {
  const allBookings = await db.booking.findMany({
    where: { orgId, startAt: { /* date range */ } },
    include: {
      instructor: true, // Fetch all instructor data
      student: true,
    },
  });
  
  // Filter in application code (inefficient)
  return allBookings.filter(booking => booking.instructor.active);
}
```

## 📈 Scaling Strategies

### **Read Replicas**
Separate read and write workloads:

```typescript
// Primary database for writes
const primaryDb = new PrismaClient({
  datasources: { db: { url: process.env.PRIMARY_DATABASE_URL } }
});

// Read replica for queries
const replicaDb = new PrismaClient({
  datasources: { db: { url: process.env.REPLICA_DATABASE_URL } }
});

@Injectable()
export class BookingService {
  // Use primary for writes
  async createBooking(data: BookingCreate) {
    return primaryDb.booking.create({ data });
  }
  
  // Use replica for reads
  async getBookings(orgId: string) {
    return replicaDb.booking.findMany({ where: { orgId } });
  }
}
```

### **Connection Pooling**
Optimize database connections:

```typescript
// apps/api/src/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Connection pool configuration
      __internal: {
        engine: {
          connectionLimit: 20, // Limit concurrent connections
        },
      },
    });
  }
}
```

### **Caching Strategies**

#### **Query Result Caching**
```typescript
@Injectable()
export class CachedBookingService {
  constructor(
    private readonly bookingRepo: BookingRepo,
    private readonly cacheManager: Cache,
  ) {}

  async getBooking(orgId: string, id: string): Promise<Booking> {
    const cacheKey = `booking:${orgId}:${id}`;
    
    // Try cache first
    const cached = await this.cacheManager.get<Booking>(cacheKey);
    if (cached) return cached;
    
    // Fetch from database
    const booking = await this.bookingRepo.findById(orgId, id);
    
    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, booking, 300);
    
    return booking;
  }
}
```

#### **Materialized Views**
For complex reporting queries:

```sql
-- Create materialized view for instructor statistics
CREATE MATERIALIZED VIEW instructor_stats AS
SELECT 
  i.id,
  i.org_id,
  i.display_name,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  AVG(l.rating) as avg_rating,
  SUM(p.amount_cents) as total_earnings_cents
FROM "Instructor" i
LEFT JOIN "Booking" b ON i.id = b.instructor_id
LEFT JOIN "Lesson" l ON b.id = l.booking_id
LEFT JOIN "Payout" p ON i.id = p.instructor_id AND p.status = 'paid'
GROUP BY i.id, i.org_id, i.display_name;

-- Refresh materialized view (run via cron job)
REFRESH MATERIALIZED VIEW instructor_stats;

-- Create index on materialized view
CREATE INDEX idx_instructor_stats_org ON instructor_stats(org_id);
```

### **Partitioning High-Volume Tables**

#### **Time-Based Partitioning for GPS Data**
```sql
-- Partition TripPoint by month for better performance
CREATE TABLE "TripPoint" (
  id          UUID DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL,
  ts          TIMESTAMP WITH TIME ZONE NOT NULL,
  lat         DECIMAL(9,6) NOT NULL,
  lng         DECIMAL(9,6) NOT NULL,
  speed_kph   DECIMAL(6,2),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (ts);

-- Create monthly partitions
CREATE TABLE "TripPoint_2025_01" PARTITION OF "TripPoint"
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE "TripPoint_2025_02" PARTITION OF "TripPoint"
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Automated partition creation
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
  partition_name text;
  end_date date;
BEGIN
  partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
  end_date := start_date + interval '1 month';
  
  EXECUTE format('CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    partition_name, table_name, start_date, end_date);
    
  EXECUTE format('CREATE INDEX %I ON %I (trip_id, ts)',
    'idx_' || partition_name || '_trip_ts', partition_name);
END;
$$ LANGUAGE plpgsql;
```

## 🔍 Performance Monitoring

### **Query Performance Analysis**
```sql
-- Enable query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  stddev_exec_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 20;

-- Find most frequent queries
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time
FROM pg_stat_statements 
ORDER BY calls DESC 
LIMIT 20;
```

### **Index Usage Analysis**
```sql
-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes 
WHERE idx_scan = 0
  AND indexname NOT LIKE '%_pkey';

-- Check index size
SELECT 
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
ORDER BY pg_relation_size(indexrelid) DESC;
```

### **Connection & Lock Monitoring**
```sql
-- Monitor active connections
SELECT 
  state,
  COUNT(*) as connections,
  AVG(EXTRACT(EPOCH FROM (now() - state_change))) as avg_duration_seconds
FROM pg_stat_activity 
WHERE datname = 'driveflow_prod'
GROUP BY state;

-- Check for lock contention
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

### **Automated Performance Monitoring**
```typescript
// performance-monitor.ts
@Injectable()
export class PerformanceMonitor {
  constructor(private readonly db: PrismaService) {}

  async checkDatabaseHealth(): Promise<HealthReport> {
    const [
      slowQueries,
      connectionCount,
      indexHealth,
      tableStats
    ] = await Promise.all([
      this.getSlowQueries(),
      this.getConnectionCount(),
      this.checkIndexHealth(),
      this.getTableStats(),
    ]);

    return {
      slowQueries,
      connectionCount,
      indexHealth,
      tableStats,
      timestamp: new Date(),
    };
  }

  private async getSlowQueries() {
    return this.db.$queryRaw`
      SELECT query, calls, mean_exec_time
      FROM pg_stat_statements 
      WHERE mean_exec_time > 100  -- Queries slower than 100ms
      ORDER BY mean_exec_time DESC 
      LIMIT 10
    `;
  }

  private async getConnectionCount() {
    const result = await this.db.$queryRaw<[{count: number}]>`
      SELECT COUNT(*) as count
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    return result[0].count;
  }
}

// Schedule health checks
@Cron('*/5 * * * *') // Every 5 minutes
async function monitorPerformance() {
  const report = await performanceMonitor.checkDatabaseHealth();
  
  // Alert on performance issues
  if (report.slowQueries.length > 5) {
    await alertingService.sendAlert('High number of slow queries detected');
  }
  
  if (report.connectionCount > 80) {
    await alertingService.sendAlert('High connection count detected');
  }
}
```

## 🎯 Performance Best Practices

### **Application Level**
1. **Use connection pooling**: Limit concurrent database connections
2. **Implement caching**: Cache frequently accessed, rarely changing data
3. **Batch operations**: Group multiple database operations
4. **Lazy loading**: Only fetch data when needed
5. **Query optimization**: Use appropriate indexes and query patterns

### **Database Level**
1. **Regular VACUUM**: Keep tables optimized with regular maintenance
2. **Statistics updates**: Keep query planner statistics current
3. **Monitor growth**: Track table and index sizes
4. **Backup strategy**: Regular backups with minimal performance impact
5. **Capacity planning**: Monitor and plan for growth

### **Infrastructure Level**
1. **SSD storage**: Use fast storage for database files
2. **Sufficient RAM**: Keep working set in memory
3. **CPU resources**: Adequate processing power for concurrent queries
4. **Network optimization**: Low-latency connection between app and database
5. **Monitoring**: Comprehensive monitoring and alerting

This performance guide ensures DriveFlow can **scale efficiently** while maintaining **fast response times** and **optimal resource utilization**.
