# Database Migration Guide

This guide walks you through setting up the DriveFlow database from scratch, running migrations, and seeding development data.

## 🚀 Quick Start

### **Prerequisites**
- PostgreSQL 14+ installed and running
- Node.js 18+ and pnpm
- DriveFlow repository cloned

### **1. Database Setup**
```bash
# Create database
createdb driveflow_dev

# Create user (optional)
psql -c "CREATE USER driveflow WITH PASSWORD 'your-password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE driveflow_dev TO driveflow;"
```

### **2. Environment Configuration**
Create `apps/api/.env`:
```bash
# Database connection
DATABASE_URL="postgresql://driveflow:your-password@localhost:5432/driveflow_dev?schema=public"

# Application
PORT=3001
NODE_ENV=development

# Optional: External services
STRIPE_SECRET_KEY="sk_test_..."
POSTMARK_API_KEY="your-key"
TWILIO_ACCOUNT_SID="your-sid"
```

### **3. Install Dependencies**
```bash
cd apps/api
pnpm install
```

### **4. Run Migrations**
```bash
# Generate Prisma client
pnpm prisma generate

# Create and apply initial migration
pnpm prisma migrate dev --name init_core

# Seed development data (optional)
pnpm tsx prisma/seed.ts
```

### **5. Verify Setup**
```bash
# Check database structure
pnpm prisma studio

# Run API server
pnpm run dev
```

## 📊 Migration Commands Reference

### **Development Migrations**
```bash
# Create new migration from schema changes
pnpm prisma migrate dev --name your_migration_name

# Reset database (⚠️ DESTRUCTIVE)
pnpm prisma migrate reset

# Apply pending migrations
pnpm prisma migrate dev

# Generate client after schema changes
pnpm prisma generate
```

### **Production Migrations**
```bash
# Deploy migrations to production
pnpm prisma migrate deploy

# Check migration status
pnpm prisma migrate status

# Resolve migration conflicts
pnpm prisma migrate resolve --rolled-back migration_name
```

### **Database Inspection**
```bash
# Launch Prisma Studio
pnpm prisma studio

# Introspect existing database
pnpm prisma db pull

# Validate schema
pnpm prisma validate

# Format schema file
pnpm prisma format
```

## 🗄️ Schema Evolution Patterns

### **Safe Schema Changes**
These changes can be applied without data loss:

#### **Adding Optional Fields**
```prisma
model Student {
  id        String @id @default(uuid())
  fullName  String
  // ✅ Safe: New optional field
  nickname  String?
}
```

#### **Adding New Tables**
```prisma
// ✅ Safe: New table doesn't affect existing data
model VehicleType {
  id   String @id @default(uuid())
  name String
}
```

#### **Adding Indexes**
```prisma
model Booking {
  @@index([orgId, status]) // ✅ Safe: Performance improvement
}
```

### **Breaking Schema Changes**
These changes require careful migration planning:

#### **Removing Fields**
```sql
-- Step 1: Mark as optional in Prisma
model Student {
  fullName  String
  nickname  String? // Make optional first
}

-- Step 2: Deploy migration to remove usage
-- Step 3: Remove field from schema
model Student {
  fullName  String
  -- nickname removed
}
```

#### **Renaming Fields**
```sql
-- Step 1: Add new field
ALTER TABLE "Student" ADD COLUMN "full_name" TEXT;

-- Step 2: Backfill data
UPDATE "Student" SET "full_name" = "fullName";

-- Step 3: Make required and remove old
ALTER TABLE "Student" ALTER COLUMN "full_name" SET NOT NULL;
ALTER TABLE "Student" DROP COLUMN "fullName";
```

#### **Changing Field Types**
```sql
-- Example: Change price from DECIMAL to INTEGER (cents)
-- Step 1: Add new field
ALTER TABLE "RateCardItem" ADD COLUMN "price_cents" INTEGER;

-- Step 2: Backfill with conversion
UPDATE "RateCardItem" SET "price_cents" = ROUND("price_decimal" * 100);

-- Step 3: Make required and remove old
ALTER TABLE "RateCardItem" ALTER COLUMN "price_cents" SET NOT NULL;
ALTER TABLE "RateCardItem" DROP COLUMN "price_decimal";
```

## 🔄 Migration Workflow

### **Development Process**
1. **Modify schema** in `prisma/schema.prisma`
2. **Create migration**: `pnpm prisma migrate dev --name descriptive_name`
3. **Test migration** with seed data
4. **Update application code** to use new schema
5. **Run tests** to ensure compatibility
6. **Commit changes** including migration files

### **Production Deployment**
1. **Review migration** in staging environment
2. **Backup production database**
3. **Apply migration**: `pnpm prisma migrate deploy`
4. **Verify application health**
5. **Monitor for issues**

### **Rollback Strategy**
```bash
# If migration fails, rollback options:

# 1. Restore from backup (safest)
pg_restore -d driveflow_prod backup_file.dump

# 2. Manual rollback (if safe)
# Write reverse migration SQL manually

# 3. Reset and rebuild (development only)
pnpm prisma migrate reset
```

## 📊 Database Seeding

### **Development Seed Data**
The included seed script creates a complete test organization:

```typescript
// Run seed script
pnpm tsx prisma/seed.ts

// Creates:
// - Demo Driving School organization
// - Owner user account
// - Instructor with availability
// - Student with guardian
// - Service catalog with pricing
```

### **Custom Seed Scripts**
Create domain-specific seed data:

```typescript
// prisma/seeds/users.seed.ts
export async function seedUsers(db: PrismaClient) {
  const users = [
    { email: 'admin@example.com', fullName: 'Admin User' },
    { email: 'instructor@example.com', fullName: 'Test Instructor' },
  ];

  for (const userData of users) {
    await db.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
  }
}

// prisma/seeds/index.ts
import { seedUsers } from './users.seed';
import { seedOrganizations } from './organizations.seed';

async function main() {
  const db = new PrismaClient();
  
  await seedUsers(db);
  await seedOrganizations(db);
  
  await db.$disconnect();
}
```

### **Production Data Setup**
For production environments, use controlled data scripts:

```typescript
// prisma/setup-prod.ts
async function setupProduction() {
  const db = new PrismaClient();
  
  // Only create essential data, no test data
  await createDefaultRateCards(db);
  await createSystemUsers(db);
  await setupDefaultServices(db);
  
  await db.$disconnect();
}
```

## 🔧 Advanced Migration Scenarios

### **Large Table Migrations**
For tables with millions of records:

```sql
-- Instead of single ALTER, use batched updates
DO $$
DECLARE
    batch_size INTEGER := 10000;
    total_rows INTEGER;
    current_offset INTEGER := 0;
BEGIN
    SELECT COUNT(*) INTO total_rows FROM "TripPoint";
    
    WHILE current_offset < total_rows LOOP
        UPDATE "TripPoint" 
        SET "processed_at" = NOW()
        WHERE "id" IN (
            SELECT "id" 
            FROM "TripPoint" 
            WHERE "processed_at" IS NULL
            LIMIT batch_size
        );
        
        current_offset := current_offset + batch_size;
        RAISE NOTICE 'Processed % of % rows', current_offset, total_rows;
        
        -- Allow other operations to proceed
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;
```

### **Zero-Downtime Migrations**
For production systems that can't afford downtime:

#### **Phase 1: Shadow Columns**
```sql
-- Add new column alongside old one
ALTER TABLE "Booking" ADD COLUMN "start_at_utc" TIMESTAMP WITH TIME ZONE;

-- Application writes to both columns
-- Old: startAt (local time)
-- New: startAtUtc (UTC time)
```

#### **Phase 2: Backfill Data**
```sql
-- Convert existing data in batches
UPDATE "Booking" 
SET "start_at_utc" = "start_at" AT TIME ZONE org.timezone
FROM "Org" org
WHERE "Booking"."org_id" = org.id
  AND "start_at_utc" IS NULL;
```

#### **Phase 3: Switch Application**
```typescript
// Update application to read from new column
const booking = await db.booking.findMany({
  select: {
    startAtUtc: true, // Use new column
    // startAt: true, // Stop using old column
  }
});
```

#### **Phase 4: Clean Up**
```sql
-- After confirming new column works
ALTER TABLE "Booking" DROP COLUMN "start_at";
ALTER TABLE "Booking" RENAME COLUMN "start_at_utc" TO "start_at";
```

### **Data Validation During Migration**
```typescript
// migration-validator.ts
export async function validateMigration(db: PrismaClient) {
  // Check referential integrity
  const orphanedBookings = await db.booking.count({
    where: {
      student: null,
    },
  });
  
  if (orphanedBookings > 0) {
    throw new Error(`Found ${orphanedBookings} bookings without students`);
  }
  
  // Check data consistency
  const invalidPricing = await db.booking.count({
    where: {
      OR: [
        { priceCents: { lte: 0 } },
        { platformFeeCents: { lt: 0 } },
        { instructorShareCents: { lt: 0 } },
      ],
    },
  });
  
  if (invalidPricing > 0) {
    throw new Error(`Found ${invalidPricing} bookings with invalid pricing`);
  }
  
  console.log('✅ Migration validation passed');
}
```

## 🚨 Troubleshooting

### **Common Issues**

#### **Migration Conflicts**
```bash
# Error: Migration already applied
# Solution: Mark as resolved
pnpm prisma migrate resolve --applied migration_name

# Error: Migration failed midway
# Solution: Mark as rolled back and fix
pnpm prisma migrate resolve --rolled-back migration_name
```

#### **Schema Drift**
```bash
# Error: Database schema differs from Prisma schema
# Solution: Reset development database
pnpm prisma db push --force-reset

# Or introspect and update schema
pnpm prisma db pull
```

#### **Connection Issues**
```bash
# Error: Can't connect to database
# Check DATABASE_URL format:
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# Test connection
pnpm prisma db execute --stdin < /dev/null
```

#### **Performance Issues**
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
  AND n_distinct > 100;
```

### **Monitoring Migration Health**
```typescript
// health-check.ts
export async function checkDatabaseHealth(db: PrismaClient) {
  const checks = [
    {
      name: 'Database Connection',
      check: () => db.$queryRaw`SELECT 1`,
    },
    {
      name: 'Table Counts',
      check: async () => {
        const counts = await Promise.all([
          db.org.count(),
          db.user.count(),
          db.booking.count(),
        ]);
        return { orgs: counts[0], users: counts[1], bookings: counts[2] };
      },
    },
    {
      name: 'Recent Activity',
      check: () => db.booking.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      }),
    },
  ];

  for (const check of checks) {
    try {
      const result = await check.check();
      console.log(`✅ ${check.name}:`, result);
    } catch (error) {
      console.error(`❌ ${check.name}:`, error.message);
    }
  }
}
```

This migration guide ensures **safe**, **reliable**, and **monitored** database evolution throughout the DriveFlow development lifecycle.
