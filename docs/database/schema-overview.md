# Database Schema Overview

## 🎯 Design Philosophy

DriveFlow's database schema is built on **enterprise-grade principles** for a driving school CRM that scales from single instructors to large driving school networks.

### **Core Design Principles**

#### **1. Multi-Tenancy First**
- Every business entity scoped by `orgId` (Organization ID)
- Complete data isolation between driving schools
- Shared infrastructure, isolated data

#### **2. Type Safety Throughout**
- Prisma generates TypeScript types from schema
- No `any` types in application code
- Compile-time validation of database operations

#### **3. Audit & Compliance Ready**
- Complete audit trail via `AuditLog` model
- Immutable financial records
- GDPR/Privacy Act compliance patterns

#### **4. Performance Optimized**
- Strategic indexing on hot query paths
- Efficient pagination with cursor-based queries
- PostGIS ready for spatial queries

#### **5. Event-Driven Architecture**
- Outbox pattern for reliable event publishing
- Webhook processing with idempotency
- Eventual consistency support

## 📊 Schema Statistics

| Category | Count | Examples |
|----------|--------|----------|
| **Core Models** | 20+ | User, Org, Booking, Lesson |
| **Enums** | 6 | BookingStatus, PaymentStatus, OrgRole |
| **Indexes** | 15+ | Performance-critical paths |
| **Relations** | 25+ | Foreign keys with proper cascading |

## 🗄️ Database Tables Overview

### **Identity & Access Management**
```sql
Org                    -- Driving schools/organizations
User                   -- Platform users  
UserOrg                -- User-organization relationships with roles
```

### **People Management**
```sql
Instructor             -- Driving instructors
Student                -- Learning students
Guardian               -- Student guardians/parents
StudentGuardian        -- Student-guardian relationships
```

### **Service Catalog**
```sql
Service                -- Lesson types (60-min lesson, test prep, etc.)
RateCard               -- Pricing schemes
RateCardItem           -- Service pricing items
```

### **Scheduling & Availability**
```sql
InstructorAvailability -- Weekly recurring patterns
AvailabilityException  -- Date-specific overrides
```

### **Booking & Execution**
```sql
Booking                -- Scheduled lessons with pricing snapshot
Lesson                 -- Executed lesson instances
Trip                   -- GPS tracking sessions
TripPoint              -- Individual GPS coordinates
```

### **Financial Operations**
```sql
Payment                -- Customer payments (Stripe integration)
Payout                 -- Instructor payouts (Stripe Connect)
```

### **Communication & Events**
```sql
Message                -- Email/SMS/WhatsApp delivery tracking
WebhookEvent           -- Inbound webhook processing
Outbox                 -- Outbound event publishing
AuditLog               -- Change tracking and compliance
```

## 🔑 Key Relationships

### **Multi-Tenancy Pattern**
```
Org (1) → (N) Students
Org (1) → (N) Instructors  
Org (1) → (N) Bookings
Org (1) → (N) Services
```

### **User Management**
```
User (N) ↔ (N) Org (via UserOrg)
User (1) → (N) Instructor (optional)
```

### **Booking Workflow**
```
Student (1) → (N) Booking
Instructor (1) → (N) Booking
Service (1) → (N) Booking
Booking (1) → (1) Lesson (when executed)
Lesson (1) → (N) Trip (GPS tracking)
```

### **Financial Flow**
```
Booking (1) → (1) Payment
Booking (1) → (N) Payout (instructor share)
```

## 💰 Financial Architecture

### **Money Handling**
- All amounts stored as **integer cents** (no float precision issues)
- Currency field for multi-currency support
- Price snapshotting at booking creation

### **Platform Economics**
```
Student Payment = Total Amount
├── Platform Fee (retained)
└── Instructor Share (paid out)
```

### **Stripe Integration Points**
- `Payment.stripePaymentIntentId` - Customer charges
- `Instructor.stripeAccountId` - Connect accounts
- `Payout.stripeTransferId` - Instructor payouts

## 🌍 Location & GPS

### **Current Implementation**
- Decimal coordinates with 6 decimal precision
- Speed tracking in km/h
- Pickup/dropoff addresses with lat/lng

### **PostGIS Migration Path**
- Schema ready for PostGIS `POINT` columns
- Can add spatial indexes for proximity queries
- Enables advanced geospatial analytics

## 🔒 Security & Privacy

### **Data Protection**
- No PII in logs (structured logging with filters)
- Australian data residency defaults
- Proper cascade rules for data deletion

### **Access Control**
- RBAC via `OrgRole` enum: owner, admin, instructor, student
- Repository pattern enforces org-scoped queries
- Never expose cross-tenant data

## 📈 Scalability Considerations

### **Indexing Strategy**
- **Time-based queries**: `(orgId, startAt)` on bookings
- **User lookups**: `(instructorId, startAt)` for schedules
- **Financial queries**: `(orgId, status)` on payments

### **Partitioning Ready**
- Time-based partitioning possible on `TripPoint` (high volume)
- Org-based partitioning for massive multi-tenancy

### **Read Replicas**
- Reporting queries can use read replicas
- Real-time GPS ingestion on primary only

## 🎯 Domain Boundaries

The schema naturally separates into bounded contexts:

| **Domain** | **Primary Models** | **Responsibility** |
|------------|-------------------|-------------------|
| **Identity** | User, Org, UserOrg | Authentication & authorization |
| **People** | Instructor, Student, Guardian | Contact management |
| **Catalog** | Service, RateCard | Product & pricing |
| **Scheduling** | Availability, Booking | Time management |
| **Execution** | Lesson, Trip | Real-time operations |
| **Finance** | Payment, Payout | Money flows |
| **Communication** | Message | Notifications |
| **Events** | Webhook, Outbox, Audit | System integration |

This domain separation enables:
- **Microservices decomposition** (if needed)
- **Team ownership** of specific areas
- **Independent scaling** of hot domains
