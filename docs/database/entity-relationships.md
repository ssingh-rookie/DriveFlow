# Entity Relationship Diagram & Mappings

## 🗺️ Complete Entity Relationship Overview

This document provides detailed relationship mappings for all entities in the DriveFlow schema.

## 📊 Complete Entity Relationship Diagram

### **Master ERD - All Entities & Relationships**

```mermaid
erDiagram
    %% Core Organization & Users
    Org ||--o{ UserOrg : "employs"
    User ||--o{ UserOrg : "member of"
    Org ||--o{ Instructor : "employs"
    Org ||--o{ Student : "teaches"
    User ||--o{ Instructor : "can be"

    %% People & Guardians
    Student ||--o{ StudentGuardian : "has"
    Guardian ||--o{ StudentGuardian : "guards"

    %% Services & Pricing
    Org ||--o{ Service : "offers"
    Org ||--o{ RateCard : "uses"
    RateCard ||--o{ RateCardItem : "contains"
    Service ||--o{ RateCardItem : "priced by"

    %% Booking & Lessons
    Student ||--o{ Booking : "books"
    Instructor ||--o{ Booking : "teaches"
    Service ||--o{ Booking : "provides"
    Org ||--o{ Booking : "manages"
    Booking ||--|| Lesson : "executes as"

    %% Availability & Scheduling
    Instructor ||--o{ InstructorAvailability : "available"
    Instructor ||--o{ AvailabilityException : "exceptions"
    Instructor ||--o{ InstructorWorkingHours : "schedule"
    Org ||--o{ TravelTimeCache : "caches"
    Org ||--o{ LicenseCompatibilityMatrix : "validates"

    %% GPS & Tracking
    Lesson ||--o{ Trip : "tracked by"
    Trip ||--o{ TripPoint : "contains"

    %% Payments & Payouts
    Booking ||--|| Payment : "paid by"
    Booking ||--o{ Payout : "generates"
    Instructor ||--o{ Payout : "receives"

    %% State Management
    Booking ||--o{ LessonStateHistory : "tracks"
    Booking ||--o{ ScheduledStateTransition : "schedules"
    User ||--o{ LessonStateHistory : "initiates"
    Org ||--o{ StateTransitionRule : "defines"

    %% Policies & Rules
    Org ||--o{ CancellationPolicy : "defines"

    %% Messaging & Events
    Org ||--o{ Message : "sends"
    User ||--o{ RefreshToken : "authenticates"

    %% Audit & Logging
    Org ||--o{ AuditLog : "logs"
    User ||--o{ AuditLog : "performs"
```

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
    Org ||--o{ Booking : "manages"

    Booking {
        string id PK
        string orgId FK
        string studentId FK
        string instructorId FK
        string serviceId FK
        datetime startAt
        datetime endAt
        BookingStatus status
        string pickupAddress
        decimal pickupLat
        decimal pickupLng
        string dropoffAddress
        decimal dropoffLat
        decimal dropoffLng
        string currency
        int priceCents
        int platformFeeCents
        int instructorShareCents
        string notes
        string cancelledBy
        datetime cancelledAt
        string cancellationReason
        datetime rescheduledFrom
        datetime rescheduledAt
        string rescheduleReason
        BookingStatus previousStatus
        datetime statusChangedAt
        string statusChangedBy
        string idempotencyKey
        datetime createdAt
        datetime updatedAt
    }
    InstructorAvailability {
        string id PK
        string orgId FK
        string instructorId FK
        int dayOfWeek
        int startMinute
        int endMinute
        datetime effectiveFrom
        datetime effectiveTo
    }
    AvailabilityException {
        string id PK
        string orgId FK
        string instructorId FK
        datetime date
        boolean isAvailable
        string note
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
    Org ||--o{ Payment : "processes"
    Org ||--o{ Payout : "manages"

    Payment {
        string id PK
        string orgId FK
        string bookingId FK
        PaymentStatus status
        string currency
        int amountCents
        int platformFeeCents
        int instructorShareCents
        string stripePaymentIntentId UK
        string stripeChargeId
        string stripeRefundId
        datetime createdAt
        datetime updatedAt
    }
    Payout {
        string id PK
        string orgId FK
        string instructorId FK
        string bookingId FK
        string currency
        int amountCents
        string status
        string stripeTransferId UK
        datetime createdAt
    }
```

### **7. Authentication & Security**

```mermaid
erDiagram
    User ||--o{ RefreshToken : "has tokens"

    RefreshToken {
        string id PK
        string userId FK
        string jti UK
        string rotationId
        string tokenHash
        boolean used
        datetime expiresAt
        datetime createdAt
    }
```

### **8. System Events & Integration**

```mermaid
erDiagram
    WebhookEvent {
        string id PK
        string provider
        string eventType
        string eventId UK
        json payload
        datetime processedAt
        datetime receivedAt
    }
    Outbox {
        string id PK
        string topic
        json payload
        int attempts
        string lastError
        datetime processedAt
        datetime createdAt
    }
```

## 🔗 Detailed Relationship Mappings

### **One-to-One Relationships**

| **Parent** | **Child** | **Description**                     | **Foreign Key**     |
| ---------- | --------- | ----------------------------------- | ------------------- |
| `Booking`  | `Lesson`  | Each booking executes as one lesson | `Lesson.bookingId`  |
| `Booking`  | `Payment` | Each booking has one payment        | `Payment.bookingId` |

### **One-to-Many Relationships**

| **Parent**   | **Child**            | **Description**                      | **Foreign Key**        |
| ------------ | -------------------- | ------------------------------------ | ---------------------- |
| `Org`        | `User` (via UserOrg) | Organization has many users          | `UserOrg.orgId`        |
| `Org`        | `Instructor`         | Organization employs instructors     | `Instructor.orgId`     |
| `Org`        | `Student`            | Organization teaches students        | `Student.orgId`        |
| `Org`        | `Service`            | Organization offers services         | `Service.orgId`        |
| `Org`        | `RateCard`           | Organization uses rate cards         | `RateCard.orgId`       |
| `Org`        | `Booking`            | Organization manages bookings        | `Booking.orgId`        |
| `Student`    | `Booking`            | Student makes multiple bookings      | `Booking.studentId`    |
| `Instructor` | `Booking`            | Instructor teaches multiple lessons  | `Booking.instructorId` |
| `Service`    | `Booking`            | Service used in multiple bookings    | `Booking.serviceId`    |
| `Lesson`     | `Trip`               | Lesson can have multiple GPS trips   | `Trip.lessonId`        |
| `Trip`       | `TripPoint`          | Trip contains many GPS points        | `TripPoint.tripId`     |
| `Instructor` | `Payout`             | Instructor receives multiple payouts | `Payout.instructorId`  |

### **Many-to-Many Relationships**

| **Entity A** | **Entity B** | **Junction Table** | **Description**                                        |
| ------------ | ------------ | ------------------ | ------------------------------------------------------ |
| `User`       | `Org`        | `UserOrg`          | Users can belong to multiple orgs with different roles |
| `Student`    | `Guardian`   | `StudentGuardian`  | Students can have multiple guardians                   |
| `RateCard`   | `Service`    | `RateCardItem`     | Rate cards price multiple services                     |

### **Optional Relationships**

| **Parent** | **Child**    | **Field**           | **Use Case**                                   |
| ---------- | ------------ | ------------------- | ---------------------------------------------- |
| `User`     | `Instructor` | `Instructor.userId` | Instructors may or may not have login accounts |
| `Booking`  | `Payout`     | `Payout.bookingId`  | Payouts can be booking-specific or bulk        |

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

---

## 7. Advanced State Management System

### **State Transition Engine**

```mermaid
erDiagram
    Booking ||--o{ LessonStateHistory : "tracks changes"
    Booking ||--o{ ScheduledStateTransition : "schedules"
    Org ||--o{ StateTransitionRule : "defines rules"
    User ||--o{ LessonStateHistory : "initiates"

    LessonStateHistory {
        string id PK
        string orgId FK
        string bookingId FK
        BookingStatus fromStatus
        BookingStatus toStatus
        string actorUserId FK
        string reason
        json metadata
        datetime createdAt
    }
    ScheduledStateTransition {
        string id PK
        string orgId FK
        string bookingId FK
        BookingStatus toStatus
        datetime executeAt
        string reason
        json metadata
        int attempts
        string lastError
        datetime processedAt
    }
    StateTransitionRule {
        string id PK
        string orgId FK
        BookingStatus fromStatus
        BookingStatus toStatus
        OrgRole requiredRole
        json conditions
        boolean isActive
        string description
    }
```

### **State Management Relationships**

| **Parent** | **Child**                  | **Description**                             | **Foreign Key**                      |
| ---------- | -------------------------- | ------------------------------------------- | ------------------------------------ |
| `Booking`  | `LessonStateHistory`       | Complete audit trail of status changes      | `LessonStateHistory.bookingId`       |
| `Booking`  | `ScheduledStateTransition` | Background state changes (NoShow, timeout)  | `ScheduledStateTransition.bookingId` |
| `Org`      | `StateTransitionRule`      | Configurable business rules for transitions | `StateTransitionRule.orgId`          |
| `User`     | `LessonStateHistory`       | Actor who initiated state change            | `LessonStateHistory.actorUserId`     |

---

## 8. Enhanced Availability System

### **Sophisticated Availability Management**

```mermaid
erDiagram
    Instructor ||--o{ InstructorWorkingHours : "has schedule"
    Instructor ||--o{ AvailabilityException : "has exceptions"
    Org ||--o{ TravelTimeCache : "caches routes"
    Org ||--o{ LicenseCompatibilityMatrix : "validates lessons"

    InstructorWorkingHours {
        string id PK
        string orgId FK
        string instructorId FK
        int dayOfWeek
        string startTime
        string endTime
        string breakStartTime
        string breakEndTime
        int maxLessonsPerDay
        int travelBufferMin
        boolean isActive
        datetime effectiveFrom
        datetime effectiveTo
    }
    TravelTimeCache {
        string id PK
        string orgId FK
        string fromLocationHash
        string toLocationHash
        decimal fromLat
        decimal fromLng
        decimal toLat
        decimal toLng
        int drivingTimeMin
        decimal trafficMultiplier
        int distanceMeters
        decimal peakHourMultiplier
        json timeOfDayFactors
        datetime lastUpdated
        datetime cacheValidUntil
        string source
        string reliability
    }
    LicenseCompatibilityMatrix {
        string id PK
        string orgId FK
        string studentLicenseType
        string lessonType
        string instructorLicenseReq
        boolean isCompatible
        int minStudentAge
        int maxStudentAge
        json prerequisites
        json restrictions
        int minLessonDuration
        int maxLessonDuration
        boolean requiresParentalConsent
        boolean isActive
    }
```

### **Enhanced Availability Relationships**

| **Parent**   | **Child**                    | **Description**                               | **Foreign Key**                       |
| ------------ | ---------------------------- | --------------------------------------------- | ------------------------------------- |
| `Instructor` | `InstructorWorkingHours`     | Detailed schedule with breaks and buffers     | `InstructorWorkingHours.instructorId` |
| `Org`        | `TravelTimeCache`            | Pre-calculated travel times between locations | `TravelTimeCache.orgId`               |
| `Org`        | `LicenseCompatibilityMatrix` | License type validation rules                 | `LicenseCompatibilityMatrix.orgId`    |

---

## 9. Policy Engine System

### **Cancellation & Business Rules**

```mermaid
erDiagram
    Org ||--o{ CancellationPolicy : "defines policies"

    CancellationPolicy {
        string id PK
        string orgId FK
        CancellationActor actor
        int hoursBeforeStart
        int refundPercentage
        int feeCents
        boolean isActive
        string description
        datetime createdAt
        datetime updatedAt
    }
```

### **Policy Engine Relationships**

| **Parent** | **Child**            | **Description**                         | **Foreign Key**            |
| ---------- | -------------------- | --------------------------------------- | -------------------------- |
| `Org`      | `CancellationPolicy` | Actor-based cancellation rules and fees | `CancellationPolicy.orgId` |

### **Cancellation Actor Types**

- **`student`**: Student-initiated cancellations
- **`parent`**: Parent/guardian cancellations
- **`instructor`**: Instructor cancellations
- **`admin`**: Administrative cancellations

---

## 10. Messaging & Events System

### **Communication & Event Processing**

```mermaid
erDiagram
    Org ||--o{ Message : "sends"

    Message {
        string id PK
        string orgId FK
        string toAddress
        MessageChannel channel
        string templateKey
        string subject
        string body
        string providerId
        MessageStatus status
        string error
        string relatedType
        string relatedId
        datetime createdAt
        datetime updatedAt
    }
    WebhookEvent {
        string id PK
        string provider
        string eventType
        string eventId UK
        json payload
        datetime processedAt
        datetime receivedAt
    }
    Outbox {
        string id PK
        string topic
        json payload
        int attempts
        string lastError
        datetime processedAt
        datetime createdAt
    }
    RefreshToken {
        string id PK
        string userId FK
        string jti UK
        string rotationId
        string tokenHash
        boolean used
        datetime expiresAt
        datetime createdAt
    }
```

### **Messaging & Events Relationships**

| **Parent** | **Child**      | **Description**                              | **Foreign Key**       |
| ---------- | -------------- | -------------------------------------------- | --------------------- |
| `Org`      | `Message`      | Email/SMS notifications sent by organization | `Message.orgId`       |
| `User`     | `RefreshToken` | JWT refresh tokens for authentication        | `RefreshToken.userId` |

### **Message Channel Types**

- **`email`**: Email notifications
- **`sms`**: SMS text messages
- **`whatsapp`**: WhatsApp messages

### **Event Processing**

- **`WebhookEvent`**: Inbound webhooks (Stripe, etc.)
- **`Outbox`**: Outbound events with retry logic
- **`RefreshToken`**: Secure token rotation system

---

## 🔗 Updated Complete Relationship Mappings

### **One-to-One Relationships**

| **Parent** | **Child** | **Description**                     | **Foreign Key**     |
| ---------- | --------- | ----------------------------------- | ------------------- |
| `Booking`  | `Lesson`  | Each booking executes as one lesson | `Lesson.bookingId`  |
| `Booking`  | `Payment` | Each booking has one payment        | `Payment.bookingId` |

### **One-to-Many Relationships**

| **Parent**   | **Child**                    | **Description**                      | **Foreign Key**                       |
| ------------ | ---------------------------- | ------------------------------------ | ------------------------------------- |
| `Org`        | `User` (via UserOrg)         | Organization has many users          | `UserOrg.orgId`                       |
| `Org`        | `Instructor`                 | Organization employs instructors     | `Instructor.orgId`                    |
| `Org`        | `Student`                    | Organization teaches students        | `Student.orgId`                       |
| `Org`        | `Service`                    | Organization offers services         | `Service.orgId`                       |
| `Org`        | `RateCard`                   | Organization uses rate cards         | `RateCard.orgId`                      |
| `Org`        | `Booking`                    | Organization manages bookings        | `Booking.orgId`                       |
| `Org`        | `Message`                    | Organization sends notifications     | `Message.orgId`                       |
| `Org`        | `CancellationPolicy`         | Organization defines policies        | `CancellationPolicy.orgId`            |
| `Org`        | `TravelTimeCache`            | Organization caches travel data      | `TravelTimeCache.orgId`               |
| `Org`        | `LicenseCompatibilityMatrix` | Organization validates licenses      | `LicenseCompatibilityMatrix.orgId`    |
| `Student`    | `Booking`                    | Student makes multiple bookings      | `Booking.studentId`                   |
| `Instructor` | `Booking`                    | Instructor teaches multiple lessons  | `Booking.instructorId`                |
| `Instructor` | `InstructorWorkingHours`     | Instructor has detailed schedule     | `InstructorWorkingHours.instructorId` |
| `Service`    | `Booking`                    | Service used in multiple bookings    | `Booking.serviceId`                   |
| `Lesson`     | `Trip`                       | Lesson can have multiple GPS trips   | `Trip.lessonId`                       |
| `Trip`       | `TripPoint`                  | Trip contains many GPS points        | `TripPoint.tripId`                    |
| `Instructor` | `Payout`                     | Instructor receives multiple payouts | `Payout.instructorId`                 |
| `Booking`    | `LessonStateHistory`         | Booking has complete audit trail     | `LessonStateHistory.bookingId`        |
| `Booking`    | `ScheduledStateTransition`   | Booking has scheduled transitions    | `ScheduledStateTransition.bookingId`  |
| `User`       | `RefreshToken`               | User has multiple refresh tokens     | `RefreshToken.userId`                 |

### **Many-to-Many Relationships**

| **Entity A** | **Entity B** | **Junction Table** | **Description**                                        |
| ------------ | ------------ | ------------------ | ------------------------------------------------------ |
| `User`       | `Org`        | `UserOrg`          | Users can belong to multiple orgs with different roles |
| `Student`    | `Guardian`   | `StudentGuardian`  | Students can have multiple guardians                   |
| `RateCard`   | `Service`    | `RateCardItem`     | Rate cards price multiple services                     |

### **Optional Relationships**

| **Parent** | **Child**            | **Field**                        | **Use Case**                                   |
| ---------- | -------------------- | -------------------------------- | ---------------------------------------------- |
| `User`     | `Instructor`         | `Instructor.userId`              | Instructors may or may not have login accounts |
| `Booking`  | `Payout`             | `Payout.bookingId`               | Payouts can be booking-specific or bulk        |
| `User`     | `LessonStateHistory` | `LessonStateHistory.actorUserId` | System changes have no actor                   |
| `User`     | `AuditLog`           | `AuditLog.actorUserId`           | System actions have no actor                   |

This comprehensive relationship structure ensures **data integrity**, **performance**, **multi-tenant security**, and **advanced business logic** throughout the DriveFlow platform.
