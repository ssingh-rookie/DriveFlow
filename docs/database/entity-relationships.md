# Entity Relationship Diagram & Mappings

## 🗺️ Complete Entity Relationship Overview

This document provides detailed relationship mappings for all entities in the DriveFlow schema.

## 📊 Visual Entity Groups

### **1. Identity & Access Management**

```mermaid
erDiagram
    Org ||--o{ UserOrg : "belongs to"
    User ||--o{ UserOrg : "member of"
    UserOrg {
        string userId FK
        string orgId FK
        OrgRole role
    }
    User {
        string id PK
        string email UK
        string externalId UK
    }
    Org {
        string id PK
        string name
        string timeZone
    }
```

### **2. People Management**

```mermaid
erDiagram
    Org ||--o{ Instructor : "employs"
    Org ||--o{ Student : "teaches"
    User ||--o{ Instructor : "can be"
    Student ||--o{ StudentGuardian : "has"
    Guardian ||--o{ StudentGuardian : "guards"
    
    Instructor {
        string id PK
        string orgId FK
        string userId FK
        string stripeAccountId UK
    }
    Student {
        string id PK
        string orgId FK
        string fullName
        datetime dob
    }
    Guardian {
        string id PK
        string fullName
        string email
    }
```

### **3. Service Catalog & Pricing**

```mermaid
erDiagram
    Org ||--o{ Service : "offers"
    Org ||--o{ RateCard : "uses"
    RateCard ||--o{ RateCardItem : "contains"
    Service ||--o{ RateCardItem : "priced by"
    
    Service {
        string id PK
        string orgId FK
        string name
        int durationMin
    }
    RateCard {
        string id PK
        string orgId FK
        boolean isDefault
        string currency
    }
    RateCardItem {
        string id PK
        string rateCardId FK
        string serviceId FK
        int priceCents
    }
```

### **4. Scheduling & Booking**

```mermaid
erDiagram
    Instructor ||--o{ InstructorAvailability : "available"
    Instructor ||--o{ AvailabilityException : "exceptions"
    Instructor ||--o{ Booking : "teaches"
    Student ||--o{ Booking : "books"
    Service ||--o{ Booking : "provides"
    
    Booking {
        string id PK
        string orgId FK
        string studentId FK
        string instructorId FK
        string serviceId FK
        datetime startAt
        datetime endAt
        BookingStatus status
        int priceCents
    }
```

### **5. Lesson Execution & GPS**

```mermaid
erDiagram
    Booking ||--|| Lesson : "executes as"
    Lesson ||--o{ Trip : "tracked by"
    Trip ||--o{ TripPoint : "contains"
    
    Lesson {
        string id PK
        string bookingId FK
        datetime startedAt
        datetime endedAt
        int distanceMeters
    }
    Trip {
        string id PK
        string lessonId FK
        datetime startedAt
    }
    TripPoint {
        string id PK
        string tripId FK
        datetime ts
        decimal lat
        decimal lng
        decimal speedKph
    }
```

### **6. Financial Operations**

```mermaid
erDiagram
    Booking ||--|| Payment : "paid by"
    Booking ||--o{ Payout : "generates"
    Instructor ||--o{ Payout : "receives"
    
    Payment {
        string id PK
        string bookingId FK
        PaymentStatus status
        int amountCents
        string stripePaymentIntentId UK
    }
    Payout {
        string id PK
        string instructorId FK
        string bookingId FK
        int amountCents
        string stripeTransferId UK
    }
```

## 🔗 Detailed Relationship Mappings

### **One-to-One Relationships**

| **Parent** | **Child** | **Description** | **Foreign Key** |
|------------|-----------|-----------------|----------------|
| `Booking` | `Lesson` | Each booking executes as one lesson | `Lesson.bookingId` |
| `Booking` | `Payment` | Each booking has one payment | `Payment.bookingId` |

### **One-to-Many Relationships**

| **Parent** | **Child** | **Description** | **Foreign Key** |
|------------|-----------|-----------------|----------------|
| `Org` | `User` (via UserOrg) | Organization has many users | `UserOrg.orgId` |
| `Org` | `Instructor` | Organization employs instructors | `Instructor.orgId` |
| `Org` | `Student` | Organization teaches students | `Student.orgId` |
| `Org` | `Service` | Organization offers services | `Service.orgId` |
| `Org` | `RateCard` | Organization uses rate cards | `RateCard.orgId` |
| `Org` | `Booking` | Organization manages bookings | `Booking.orgId` |
| `Student` | `Booking` | Student makes multiple bookings | `Booking.studentId` |
| `Instructor` | `Booking` | Instructor teaches multiple lessons | `Booking.instructorId` |
| `Service` | `Booking` | Service used in multiple bookings | `Booking.serviceId` |
| `Lesson` | `Trip` | Lesson can have multiple GPS trips | `Trip.lessonId` |
| `Trip` | `TripPoint` | Trip contains many GPS points | `TripPoint.tripId` |
| `Instructor` | `Payout` | Instructor receives multiple payouts | `Payout.instructorId` |

### **Many-to-Many Relationships**

| **Entity A** | **Entity B** | **Junction Table** | **Description** |
|--------------|--------------|-------------------|-----------------|
| `User` | `Org` | `UserOrg` | Users can belong to multiple orgs with different roles |
| `Student` | `Guardian` | `StudentGuardian` | Students can have multiple guardians |
| `RateCard` | `Service` | `RateCardItem` | Rate cards price multiple services |

### **Optional Relationships**

| **Parent** | **Child** | **Field** | **Use Case** |
|------------|-----------|-----------|--------------|
| `User` | `Instructor` | `Instructor.userId` | Instructors may or may not have login accounts |
| `Booking` | `Payout` | `Payout.bookingId` | Payouts can be booking-specific or bulk |

## 🎯 Key Relationship Patterns

### **Multi-Tenancy Enforcement**
Every tenant-scoped entity includes `orgId`:
- Always filter by `orgId` in queries
- Never allow cross-tenant data access
- Use repository pattern to enforce scoping

### **Referential Integrity Rules**

#### **Cascade Deletes** (Data cleanup)
- `Org` deletion cascades to all org-owned entities
- `User` deletion cascades to `UserOrg` memberships
- `Booking` deletion cascades to `Lesson`, `Payment`, `Payout`

#### **Restrict Deletes** (Data protection)
- Cannot delete `Student` with active bookings
- Cannot delete `Instructor` with active lessons
- Cannot delete `Service` with bookings

#### **Set Null** (Soft references)
- `Instructor.userId` set to null if User deleted
- `AuditLog.actorUserId` set to null if User deleted

### **Indexing for Relationships**

#### **Foreign Key Indexes**
```sql
-- Multi-tenant queries
CREATE INDEX idx_booking_org_start ON Booking(orgId, startAt);
CREATE INDEX idx_payment_org_status ON Payment(orgId, status);

-- User activity
CREATE INDEX idx_booking_instructor_start ON Booking(instructorId, startAt);
CREATE INDEX idx_booking_student_start ON Booking(studentId, startAt);

-- GPS tracking
CREATE INDEX idx_trip_point_trip_ts ON TripPoint(tripId, ts);
```

#### **Unique Constraints**
```sql
-- Business rules
UNIQUE(userId, orgId, role) -- User can have one role per org
UNIQUE(studentId, guardianId) -- Guardian relationship uniqueness
UNIQUE(rateCardId, serviceId) -- Service priced once per rate card
UNIQUE(instructorId, date) -- Availability exception uniqueness

-- External system integration
UNIQUE(stripePaymentIntentId) -- Stripe payment deduplication
UNIQUE(stripeAccountId) -- Instructor payout account uniqueness
```

## 🔍 Query Patterns

### **Common Join Patterns**

#### **Booking with All Details**
```sql
SELECT b.*, s.fullName as studentName, i.displayName as instructorName, sv.name as serviceName
FROM Booking b
JOIN Student s ON b.studentId = s.id
JOIN Instructor i ON b.instructorId = i.id  
JOIN Service sv ON b.serviceId = sv.id
WHERE b.orgId = $1
```

#### **Student Progress Report**
```sql
SELECT s.fullName, COUNT(l.id) as completedLessons, AVG(l.rating) as avgRating
FROM Student s
LEFT JOIN Booking b ON s.id = b.studentId
LEFT JOIN Lesson l ON b.id = l.bookingId
WHERE s.orgId = $1 AND l.endedAt IS NOT NULL
GROUP BY s.id, s.fullName
```

#### **Instructor Revenue Report**
```sql
SELECT i.displayName, SUM(p.amountCents) as totalEarnings
FROM Instructor i
JOIN Payout p ON i.id = p.instructorId
WHERE i.orgId = $1 AND p.status = 'paid'
GROUP BY i.id, i.displayName
```

### **Relationship Validation Queries**

#### **Orphaned Records Check**
```sql
-- Find bookings without lessons (never started)
SELECT b.id FROM Booking b 
LEFT JOIN Lesson l ON b.id = l.bookingId 
WHERE l.id IS NULL AND b.status = 'completed'

-- Find lessons without GPS tracking
SELECT l.id FROM Lesson l
LEFT JOIN Trip t ON l.id = t.lessonId
WHERE t.id IS NULL AND l.endedAt IS NOT NULL
```

This relationship structure ensures **data integrity**, **performance**, and **multi-tenant security** throughout the DriveFlow platform.
