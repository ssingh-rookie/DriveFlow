# DriveFlow Database Schema — 13-Step Junior-Friendly Guide (Prisma + Postgres)

> Save this file as **`DRIVEFLOW_DB_SCHEMA_STEPS.md`**.  
> It walks juniors through the full database design for DriveFlow in **13 clear steps** using **Prisma + PostgreSQL**.  
> Paths assume your API lives at `apps/api`.

---

## Step 1 — Initialize Prisma (Postgres)

Create or update `apps/api/prisma/schema.prisma` with the base generator + datasource:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Conventions we’ll follow:**
- IDs are **UUIDs**: `@id @default(uuid())`  
- **Money** in **integer cents** (avoid floats)  
- Every table has `createdAt` and `updatedAt` (where relevant)  
- **Multitenancy**: most records include `orgId`  
- No soft-delete for MVP (simpler logic).

---

## Step 2 — Tenancy, Users, and Roles

Schools (organisations) own data. A user can belong to multiple orgs with different roles.

```prisma
model Org {
  id          String       @id @default(uuid())
  name        String
  abn         String?
  timeZone    String       @default("Australia/Sydney")
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  users       UserOrg[]
  instructors Instructor[]
  students    Student[]
  services    Service[]
  rateCards   RateCard[]
  bookings    Booking[]
  lessons     Lesson[]
  messages    Message[]
  payments    Payment[]
  payouts     Payout[]

  @@index([name])
}

model User {
  id          String     @id @default(uuid())
  email       String     @unique
  fullName    String
  phone       String?
  externalId  String?    @unique // from Clerk/Auth0, etc.
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  orgs        UserOrg[]
}

enum OrgRole {
  owner
  admin
  instructor
  student
}

model UserOrg {
  id        String   @id @default(uuid())
  userId    String
  orgId     String
  role      OrgRole
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  org       Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId, role])
  @@index([orgId, role])
}
```

---

## Step 3 — People: Instructors, Students, Guardians

Instructors may be users (for login) and receive payouts via Stripe Connect. Students can have multiple guardians.

```prisma
model Instructor {
  id               String   @id @default(uuid())
  orgId            String
  userId           String?
  displayName      String
  phone            String?
  licenseId        String?
  active           Boolean  @default(true)

  stripeAccountId  String?  @unique
  kycStatus        String?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  org              Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user             User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  availabilities   InstructorAvailability[]
  bookings         Booking[]
  lessons          Lesson[]
  payouts          Payout[]

  @@index([orgId, active])
}

model Student {
  id         String    @id @default(uuid())
  orgId      String
  fullName   String
  phone      String?
  email      String?
  dob        DateTime?
  notes      String?

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  org        Org       @relation(fields: [orgId], references: [id], onDelete: Cascade)
  guardians  StudentGuardian[]
  bookings   Booking[]
  lessons    Lesson[]

  @@index([orgId, fullName])
}

model Guardian {
  id         String    @id @default(uuid())
  fullName   String
  phone      String?
  email      String?

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  students   StudentGuardian[]
}

model StudentGuardian {
  id         String   @id @default(uuid())
  studentId  String
  guardianId String
  relation   String?

  student    Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  guardian   Guardian @relation(fields: [guardianId], references: [id], onDelete: Cascade)

  @@unique([studentId, guardianId])
}
```

---

## Step 4 — Catalog & Pricing

Services describe lesson types. **RateCard** holds per-org prices; we snapshot price into bookings.

```prisma
model Service {
  id          String  @id @default(uuid())
  orgId       String
  name        String
  description String?
  durationMin Int
  active      Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  org         Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  rateItems   RateCardItem[]

  @@index([orgId, active])
  @@unique([orgId, name])
}

model RateCard {
  id          String   @id @default(uuid())
  orgId       String
  name        String
  currency    String   @default("AUD")
  isDefault   Boolean  @default(false)
  validFrom   DateTime?
  validTo     DateTime?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  org         Org       @relation(fields: [orgId], references: [id], onDelete: Cascade)
  items       RateCardItem[]

  @@index([orgId, isDefault])
  @@unique([orgId, name])
}

model RateCardItem {
  id          String   @id @default(uuid())
  rateCardId  String
  serviceId   String
  priceCents  Int      // integer cents

  createdAt   DateTime  @default(now())

  rateCard    RateCard  @relation(fields: [rateCardId], references: [id], onDelete: Cascade)
  service     Service   @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@unique([rateCardId, serviceId])
}
```

---

## Step 5 — Availability (Recurring + Exceptions)

Weekly templates per instructor plus date-specific exceptions.

```prisma
model InstructorAvailability {
  id            String   @id @default(uuid())
  orgId         String
  instructorId  String
  dayOfWeek     Int
  startMinute   Int
  endMinute     Int
  effectiveFrom DateTime?
  effectiveTo   DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  org           Org        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  instructor    Instructor @relation(fields: [instructorId], references: [id], onDelete: Cascade)

  @@index([orgId, instructorId, dayOfWeek])
}

model AvailabilityException {
  id           String   @id @default(uuid())
  orgId        String
  instructorId String
  date         DateTime
  isAvailable  Boolean
  note         String?

  createdAt    DateTime @default(now())

  org          Org        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  instructor   Instructor @relation(fields: [instructorId], references: [id], onDelete: Cascade)

  @@unique([instructorId, date])
  @@index([orgId])
}
```

---

## Step 6 — Bookings & Lessons

Booking = scheduled commitment with price snapshot.  
Lesson = the executed instance (created on lesson start in MVP).

```prisma
enum BookingStatus {
  requested
  confirmed
  in_progress
  completed
  cancelled
  no_show
}

model Booking {
  id                   String   @id @default(uuid())
  orgId                String
  studentId            String
  instructorId         String
  serviceId            String

  startAt              DateTime
  endAt                DateTime

  status               BookingStatus @default(requested)

  pickupAddress        String?
  pickupLat            Decimal?  @db.Decimal(9, 6)
  pickupLng            Decimal?  @db.Decimal(9, 6)
  dropoffAddress       String?
  dropoffLat           Decimal?  @db.Decimal(9, 6)
  dropoffLng           Decimal?  @db.Decimal(9, 6)

  currency             String   @default("AUD")
  priceCents           Int
  platformFeeCents     Int
  instructorShareCents Int

  notes                String?

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  org                  Org        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  student              Student    @relation(fields: [studentId], references: [id], onDelete: Restrict)
  instructor           Instructor @relation(fields: [instructorId], references: [id], onDelete: Restrict)
  service              Service    @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  lesson               Lesson?
  payment              Payment?

  @@index([orgId, startAt])
  @@index([instructorId, startAt])
  @@index([studentId, startAt])
}

model Lesson {
  id             String   @id @default(uuid())
  orgId          String
  bookingId      String   @unique
  instructorId   String
  studentId      String
  startedAt      DateTime?
  endedAt        DateTime?
  rating         Int?
  notes          String?

  distanceMeters Int?
  durationSec    Int?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  org            Org        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  booking        Booking    @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  instructor     Instructor @relation(fields: [instructorId], references: [id], onDelete: Restrict)
  student        Student    @relation(fields: [studentId], references: [id], onDelete: Restrict)

  trips          Trip[]
}
```

---

## Step 7 — GPS Tracking (MVP Simple, PostGIS-Ready)

Points are stored as `lat/lng/ts/speed`. Later, we can add a PostGIS `geom` column via raw SQL.

```prisma
model Trip {
  id         String   @id @default(uuid())
  lessonId   String
  startedAt  DateTime
  endedAt    DateTime?

  createdAt  DateTime @default(now())

  lesson     Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  points     TripPoint[]

  @@index([lessonId])
}

model TripPoint {
  id         String   @id @default(uuid())
  tripId     String
  ts         DateTime
  lat        Decimal  @db.Decimal(9, 6)
  lng        Decimal  @db.Decimal(9, 6)
  speedKph   Decimal? @db.Decimal(6, 2)

  createdAt  DateTime @default(now())

  trip       Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@index([tripId, ts])
}
```

---

## Step 8 — Payments (Stripe) & Payouts (Connect)

Payment = customer charge (PaymentIntent).  
Payout = transfer to instructor (Stripe Connect).

```prisma
enum PaymentStatus {
  intent_created
  succeeded
  failed
  refunded
}

model Payment {
  id                   String   @id @default(uuid())
  orgId                String
  bookingId            String   @unique
  status               PaymentStatus @default(intent_created)
  currency             String   @default("AUD")
  amountCents          Int
  platformFeeCents     Int
  instructorShareCents Int

  stripePaymentIntentId String  @unique
  stripeChargeId        String?
  stripeRefundId        String?

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  org                  Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  booking              Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([orgId, status])
}

model Payout {
  id                String   @id @default(uuid())
  orgId             String
  instructorId      String
  bookingId         String?
  currency          String   @default("AUD")
  amountCents       Int
  status            String   @default("pending") // 'paid','pending','canceled', etc.
  stripeTransferId  String?  @unique

  createdAt         DateTime @default(now())

  org               Org        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  instructor        Instructor @relation(fields: [instructorId], references: [id], onDelete: Restrict)
  booking           Booking?   @relation(fields: [bookingId], references: [id], onDelete: SetNull)

  @@index([orgId, instructorId])
}
```

---

## Step 9 — Messaging (Email/SMS/WhatsApp)

Store outbound message attempts with minimal metadata for troubleshooting and analytics.

```prisma
enum MessageChannel {
  email
  sms
  whatsapp
}

enum MessageStatus {
  queued
  sent
  failed
}

model Message {
  id           String         @id @default(uuid())
  orgId        String
  toAddress    String
  channel      MessageChannel
  templateKey  String
  subject      String?
  body         String?
  providerId   String?
  status       MessageStatus  @default(queued)
  error        String?

  relatedType  String?
  relatedId    String?

  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  org          Org            @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, channel, status])
  @@index([relatedType, relatedId])
}
```

---

## Step 10 — Webhooks (Inbound) & Outbox (Internal)

Make processing idempotent and observable.

```prisma
model WebhookEvent {
  id          String   @id @default(uuid())
  provider    String   // 'stripe'
  eventType   String
  eventId     String   @unique
  payload     Json
  processedAt DateTime?

  receivedAt  DateTime @default(now())

  @@index([provider, processedAt])
}

model Outbox {
  id          String   @id @default(uuid())
  topic       String   // e.g., 'booking.created'
  payload     Json
  attempts    Int      @default(0)
  lastError   String?
  processedAt DateTime?

  createdAt   DateTime @default(now())

  @@index([topic, processedAt])
}
```

---

## Step 11 — Audit Log (Who did what)

Keep a record of important actions and changes for support and compliance.

```prisma
model AuditLog {
  id          String   @id @default(uuid())
  orgId       String
  actorUserId String?
  action      String    // e.g., 'BOOKING_UPDATED'
  entityType  String    // 'Booking'|'Lesson'|...
  entityId    String
  before      Json?
  after       Json?
  ip          String?

  createdAt   DateTime  @default(now())

  org         Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  actor       User?    @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([orgId, entityType, entityId])
  @@index([actorUserId])
}
```

---

## Step 12 — Run Migrations & Seed (Hands-on)

1) Ensure `apps/api/.env` contains a valid `DATABASE_URL` for Postgres.  
2) Run Prisma migrate + generate:

```bash
pnpm -C apps/api prisma migrate dev --name init_core
pnpm -C apps/api prisma generate
```

3) (Optional) Seed minimal demo data — `apps/api/prisma/seed.ts`:

```ts
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  const org = await db.org.create({ data: { name: 'Demo Driving School' }});
  const owner = await db.user.create({
    data: { email: 'owner@demo.com', fullName: 'Demo Owner' }
  });
  await db.userOrg.create({
    data: { userId: owner.id, orgId: org.id, role: 'owner' }
  });
  const instructor = await db.instructor.create({
    data: { orgId: org.id, displayName: 'Casey Instructor', active: true }
  });
  const student = await db.student.create({
    data: { orgId: org.id, fullName: 'Alex Student' }
  });
  const service = await db.service.create({
    data: { orgId: org.id, name: '60-min Lesson', durationMin: 60 }
  });
  const rate = await db.rateCard.create({
    data: { orgId: org.id, name: 'Default 2025', isDefault: true, currency: 'AUD' }
  });
  await db.rateCardItem.create({
    data: { rateCardId: rate.id, serviceId: service.id, priceCents: 9500 }
  });

  console.log({ org, owner, instructor, student, service, rate });
}

main().finally(() => db.$disconnect());
```

Run:
```bash
pnpm -C apps/api tsx prisma/seed.ts
```

---

## Step 13 — Indexing, Idempotency & Junior Reminders

**Indexes for hot paths**
- `Booking`: (`orgId`,`startAt`), (`instructorId`,`startAt`), (`studentId`,`startAt`)
- `TripPoint`: (`tripId`,`ts`)
- `Payment`: (`orgId`,`status`)

**Uniqueness and idempotency**
- `RateCardItem`: (`rateCardId`,`serviceId`) unique
- `StudentGuardian`: (`studentId`,`guardianId`) unique
- `Payment`: `bookingId` unique, `stripePaymentIntentId` unique
- `WebhookEvent.eventId` unique

**Juniors: remember**
- Always filter by **`orgId`** to enforce multi-tenancy
- **Amounts are cents**; format only in UI
- State transitions via **service layer guards** (not controllers)
- Repositories = **Prisma only**; business rules live in services
- Log important changes to **AuditLog**

---

## Appendix A — Full Prisma Schema (MVP, copy-paste ready)

> Paste this into `apps/api/prisma/schema.prisma` if you want the complete model in one go (then run migrations).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum OrgRole {
  owner
  admin
  instructor
  student
}

enum BookingStatus {
  requested
  confirmed
  in_progress
  completed
  cancelled
  no_show
}

enum PaymentStatus {
  intent_created
  succeeded
  failed
  refunded
}

enum MessageChannel {
  email
  sms
  whatsapp
}

enum MessageStatus {
  queued
  sent
  failed
}

model Org {
  id          String       @id @default(uuid())
  name        String
  abn         String?
  timeZone    String       @default("Australia/Sydney")
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  users       UserOrg[]
  instructors Instructor[]
  students    Student[]
  services    Service[]
  rateCards   RateCard[]
  bookings    Booking[]
  lessons     Lesson[]
  messages    Message[]
  payments    Payment[]
  payouts     Payout[]

  @@index([name])
}

model User {
  id          String     @id @default(uuid())
  email       String     @unique
  fullName    String
  phone       String?
  externalId  String?    @unique
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  orgs        UserOrg[]
}

model UserOrg {
  id        String   @id @default(uuid())
  userId    String
  orgId     String
  role      OrgRole
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  org       Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId, role])
  @@index([orgId, role])
}

model Instructor {
  id               String   @id @default(uuid())
  orgId            String
  userId           String?
  displayName      String
  phone            String?
  licenseId        String?
  active           Boolean  @default(true)

  stripeAccountId  String?  @unique
  kycStatus        String?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  org              Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user             User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  availabilities   InstructorAvailability[]
  bookings         Booking[]
  lessons          Lesson[]
  payouts          Payout[]

  @@index([orgId, active])
}

model Student {
  id         String    @id @default(uuid())
  orgId      String
  fullName   String
  phone      String?
  email      String?
  dob        DateTime?
  notes      String?

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  org        Org       @relation(fields: [orgId], references: [id], onDelete: Cascade)
  guardians  StudentGuardian[]
  bookings   Booking[]
  lessons    Lesson[]

  @@index([orgId, fullName])
}

model Guardian {
  id         String    @id @default(uuid())
  fullName   String
  phone      String?
  email      String?

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  students   StudentGuardian[]
}

model StudentGuardian {
  id         String   @id @default(uuid())
  studentId  String
  guardianId String
  relation   String?

  student    Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  guardian   Guardian @relation(fields: [guardianId], references: [id], onDelete: Cascade)

  @@unique([studentId, guardianId])
}

model Service {
  id          String  @id @default(uuid())
  orgId       String
  name        String
  description String?
  durationMin Int
  active      Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  org         Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  rateItems   RateCardItem[]

  @@index([orgId, active])
  @@unique([orgId, name])
}

model RateCard {
  id          String   @id @default(uuid())
  orgId       String
  name        String
  currency    String   @default("AUD")
  isDefault   Boolean  @default(false)
  validFrom   DateTime?
  validTo     DateTime?

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  org         Org       @relation(fields: [orgId], references: [id], onDelete: Cascade)
  items       RateCardItem[]

  @@index([orgId, isDefault])
  @@unique([orgId, name])
}

model RateCardItem {
  id          String   @id @default(uuid())
  rateCardId  String
  serviceId   String
  priceCents  Int

  createdAt   DateTime  @default(now())

  rateCard    RateCard  @relation(fields: [rateCardId], references: [id], onDelete: Cascade)
  service     Service   @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@unique([rateCardId, serviceId])
}

model InstructorAvailability {
  id            String   @id @default(uuid())
  orgId         String
  instructorId  String
  dayOfWeek     Int
  startMinute   Int
  endMinute     Int
  effectiveFrom DateTime?
  effectiveTo   DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  org           Org        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  instructor    Instructor @relation(fields: [instructorId], references: [id], onDelete: Cascade)

  @@index([orgId, instructorId, dayOfWeek])
}

model AvailabilityException {
  id           String   @id @default(uuid())
  orgId        String
  instructorId String
  date         DateTime
  isAvailable  Boolean
  note         String?

  createdAt    DateTime @default(now())

  org          Org        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  instructor   Instructor @relation(fields: [instructorId], references: [id], onDelete: Cascade)

  @@unique([instructorId, date])
  @@index([orgId])
}

model Booking {
  id                   String   @id @default(uuid())
  orgId                String
  studentId            String
  instructorId         String
  serviceId            String

  startAt              DateTime
  endAt                DateTime

  status               BookingStatus @default(requested)

  pickupAddress        String?
  pickupLat            Decimal?  @db.Decimal(9, 6)
  pickupLng            Decimal?  @db.Decimal(9, 6)
  dropoffAddress       String?
  dropoffLat           Decimal?  @db.Decimal(9, 6)
  dropoffLng           Decimal?  @db.Decimal(9, 6)

  currency             String   @default("AUD")
  priceCents           Int
  platformFeeCents     Int
  instructorShareCents Int

  notes                String?

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  org                  Org        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  student              Student    @relation(fields: [studentId], references: [id], onDelete: Restrict)
  instructor           Instructor @relation(fields: [instructorId], references: [id], onDelete: Restrict)
  service              Service    @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  lesson               Lesson?
  payment              Payment?

  @@index([orgId, startAt])
  @@index([instructorId, startAt])
  @@index([studentId, startAt])
}

model Lesson {
  id             String   @id @default(uuid())
  orgId          String
  bookingId      String   @unique
  instructorId   String
  studentId      String
  startedAt      DateTime?
  endedAt        DateTime?
  rating         Int?
  notes          String?

  distanceMeters Int?
  durationSec    Int?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  org            Org        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  booking        Booking    @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  instructor     Instructor @relation(fields: [instructorId], references: [id], onDelete: Restrict)
  student        Student    @relation(fields: [studentId], references: [id], onDelete: Restrict)

  trips          Trip[]
}

model Trip {
  id         String   @id @default(uuid())
  lessonId   String
  startedAt  DateTime
  endedAt    DateTime?

  createdAt  DateTime @default(now())

  lesson     Lesson   @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  points     TripPoint[]

  @@index([lessonId])
}

model TripPoint {
  id         String   @id @default(uuid())
  tripId     String
  ts         DateTime
  lat        Decimal  @db.Decimal(9, 6)
  lng        Decimal  @db.Decimal(9, 6)
  speedKph   Decimal? @db.Decimal(6, 2)

  createdAt  DateTime @default(now())

  trip       Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@index([tripId, ts])
}

model Payment {
  id                   String   @id @default(uuid())
  orgId                String
  bookingId            String   @unique
  status               PaymentStatus @default(intent_created)
  currency             String   @default("AUD")
  amountCents          Int
  platformFeeCents     Int
  instructorShareCents Int

  stripePaymentIntentId String  @unique
  stripeChargeId        String?
  stripeRefundId        String?

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  org                  Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  booking              Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@index([orgId, status])
}

model Payout {
  id                String   @id @default(uuid())
  orgId             String
  instructorId      String
  bookingId         String?
  currency          String   @default("AUD")
  amountCents       Int
  status            String   @default("pending")
  stripeTransferId  String?  @unique

  createdAt         DateTime @default(now())

  org               Org        @relation(fields: [orgId], references: [id], onDelete: Cascade)
  instructor        Instructor @relation(fields: [instructorId], references: [id], onDelete: Restrict)
  booking           Booking?   @relation(fields: [bookingId], references: [id], onDelete: SetNull)

  @@index([orgId, instructorId])
}

model Message {
  id           String         @id @default(uuid())
  orgId        String
  toAddress    String
  channel      MessageChannel
  templateKey  String
  subject      String?
  body         String?
  providerId   String?
  status       MessageStatus  @default(queued)
  error        String?

  relatedType  String?
  relatedId    String?

  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  org          Org            @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, channel, status])
  @@index([relatedType, relatedId])
}

model WebhookEvent {
  id          String   @id @default(uuid())
  provider    String
  eventType   String
  eventId     String   @unique
  payload     Json
  processedAt DateTime?

  receivedAt  DateTime @default(now())

  @@index([provider, processedAt])
}

model Outbox {
  id          String   @id @default(uuid())
  topic       String
  payload     Json
  attempts    Int      @default(0)
  lastError   String?
  processedAt DateTime?

  createdAt   DateTime @default(now())

  @@index([topic, processedAt])
}

model AuditLog {
  id          String   @id @default(uuid())
  orgId       String
  actorUserId String?
  action      String
  entityType  String
  entityId    String
  before      Json?
  after       Json?
  ip          String?

  createdAt   DateTime  @default(now())

  org         Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  actor       User?    @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([orgId, entityType, entityId])
  @@index([actorUserId])
}
```
```

---

## Appendix B — Quick Commands

```bash
# From repo root
pnpm -C apps/api prisma migrate dev --name init_core
pnpm -C apps/api prisma generate
pnpm -C apps/api tsx prisma/seed.ts  # optional seed
```
