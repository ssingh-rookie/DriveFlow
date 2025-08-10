# Domain Models Deep Dive

This document breaks down the DriveFlow database schema by business domain, explaining the purpose and relationships within each domain.

## 🏢 1. Identity & Access Management

### **Purpose**
Multi-tenant user management with role-based access control for driving schools.

### **Models**

#### **`Org` - Organizations/Driving Schools**
```prisma
model Org {
  id          String   @id @default(uuid())
  name        String   // "Sydney Driving School"
  abn         String?  // Australian Business Number
  timeZone    String   @default("Australia/Sydney")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Key Features:**
- **Multi-tenancy root**: All data scoped to organizations
- **Timezone awareness**: Proper scheduling across regions
- **Business registration**: ABN for compliance

#### **`User` - Platform Users**
```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  fullName    String
  phone       String?
  externalId  String?  @unique // Clerk/Auth0 integration
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Key Features:**
- **External auth ready**: Works with Clerk, Auth0, etc.
- **Global identity**: Users can belong to multiple orgs
- **Contact information**: Phone for SMS notifications

#### **`UserOrg` - Membership & Roles**
```prisma
model UserOrg {
  userId    String
  orgId     String
  role      OrgRole  // owner | admin | instructor | student
  createdAt DateTime @default(now())
  
  @@unique([userId, orgId, role])
}
```

**Business Rules:**
- Users can have **different roles** in different organizations
- **Owner**: Full org control, billing management
- **Admin**: User management, booking oversight
- **Instructor**: Lesson management, student interaction
- **Student**: Booking creation, progress viewing

### **Use Cases**
- **B2B SaaS**: Multiple driving schools on one platform
- **Franchise management**: Central control with local autonomy
- **Role separation**: Clear permissions per user type

---

## 👥 2. People Management

### **Purpose**
Comprehensive contact management for all people involved in driving education.

### **Models**

#### **`Instructor` - Driving Instructors**
```prisma
model Instructor {
  id               String   @id @default(uuid())
  orgId            String   // Multi-tenant scoping
  userId           String?  // Optional platform account
  displayName      String   // "Casey Smith"
  phone            String?
  licenseId        String?  // Driver instructor license
  active           Boolean  @default(true)
  
  // Stripe Connect for payouts
  stripeAccountId  String?  @unique
  kycStatus        String?  // Know Your Customer status
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

**Key Features:**
- **Flexible accounts**: Can exist without platform login
- **Stripe Connect**: Direct payouts to instructors
- **License tracking**: Compliance with local regulations
- **Active status**: Enable/disable without deletion

#### **`Student` - Learning Students**
```prisma
model Student {
  id         String    @id @default(uuid())
  orgId      String
  fullName   String
  phone      String?
  email      String?
  dob        DateTime? // Age verification
  notes      String?   // Learning preferences, restrictions
  
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}
```

**Key Features:**
- **Age tracking**: Important for license eligibility
- **Contact flexibility**: Phone OR email required
- **Learning notes**: Instructor preferences, special needs

#### **`Guardian` - Student Guardians/Parents**
```prisma
model Guardian {
  id         String   @id @default(uuid())
  fullName   String
  phone      String?
  email      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

#### **`StudentGuardian` - Relationships**
```prisma
model StudentGuardian {
  studentId  String
  guardianId String
  relation   String?  // "Parent", "Guardian", "Emergency Contact"
  
  @@unique([studentId, guardianId])
}
```

**Business Rules:**
- **Multiple guardians**: Students can have multiple emergency contacts
- **Billing contacts**: Guardians receive lesson notifications
- **Relationship types**: Parent vs guardian vs emergency contact

### **Use Cases**
- **Minor student management**: Parent communication and consent
- **Emergency contacts**: Safety during lessons
- **Billing relationships**: Who pays for lessons
- **Communication preferences**: Different contacts for different purposes

---

## 📋 3. Service Catalog & Pricing

### **Purpose**
Flexible service offerings with sophisticated pricing strategies.

### **Models**

#### **`Service` - Lesson Types**
```prisma
model Service {
  id          String  @id @default(uuid())
  orgId       String
  name        String  // "60-min Standard Lesson"
  description String? // "Highway driving focus"
  durationMin Int     // 60, 90, 120 minutes
  active      Boolean @default(true)
}
```

**Service Examples:**
- Standard 60-minute lesson
- Highway driving specialty
- Parallel parking intensive
- Mock driving test
- Night driving lesson

#### **`RateCard` - Pricing Schemes**
```prisma
model RateCard {
  id          String    @id @default(uuid())
  orgId       String
  name        String    // "2025 Standard Rates"
  currency    String    @default("AUD")
  isDefault   Boolean   @default(false)
  validFrom   DateTime?
  validTo     DateTime?
}
```

**Pricing Strategies:**
- **Seasonal pricing**: Summer vs winter rates
- **Bulk discounts**: 10-lesson packages
- **Student types**: Adult vs teen pricing
- **Time-based**: Peak vs off-peak hours

#### **`RateCardItem` - Service Pricing**
```prisma
model RateCardItem {
  rateCardId  String
  serviceId   String
  priceCents  Int    // $95.00 = 9500 cents
  
  @@unique([rateCardId, serviceId])
}
```

**Key Features:**
- **Cents storage**: No floating-point precision issues
- **Price snapshotting**: Booking captures price at creation time
- **Flexible pricing**: Same service, different prices in different rate cards

### **Business Rules**
- Services are **org-specific** (driving schools set their own offerings)
- Rate cards enable **price experimentation** without changing services
- **Historical pricing**: Bookings preserve original prices
- **Multi-currency ready**: Supports international expansion

### **Use Cases**
- **Dynamic pricing**: Adjust rates based on demand
- **Package deals**: Multi-lesson discounts
- **Seasonal campaigns**: Holiday specials
- **A/B testing**: Compare different pricing strategies

---

## 📅 4. Scheduling & Availability

### **Purpose**
Sophisticated scheduling system handling recurring availability and exceptions.

### **Models**

#### **`InstructorAvailability` - Weekly Patterns**
```prisma
model InstructorAvailability {
  instructorId  String
  dayOfWeek     Int        // 0=Sunday, 1=Monday, etc.
  startMinute   Int        // 540 = 9:00 AM (9*60)
  endMinute     Int        // 1020 = 5:00 PM (17*60)
  effectiveFrom DateTime?
  effectiveTo   DateTime?
}
```

**Examples:**
- Monday-Friday: 9:00 AM - 5:00 PM
- Saturday: 8:00 AM - 2:00 PM  
- Sunday: Unavailable

#### **`AvailabilityException` - Date Overrides**
```prisma
model AvailabilityException {
  instructorId String
  date         DateTime  // Specific date
  isAvailable  Boolean   // Available or blocked
  note         String?   // "Public holiday", "Sick leave"
}
```

**Exception Types:**
- **Holidays**: Public holiday closures
- **Sick leave**: Instructor unavailable
- **Extended availability**: Working extra hours
- **Training days**: Instructor development

#### **`Booking` - Scheduled Lessons**
```prisma
model Booking {
  id                   String        @id @default(uuid())
  orgId                String
  studentId            String
  instructorId         String
  serviceId            String
  
  startAt              DateTime
  endAt                DateTime
  status               BookingStatus // requested | confirmed | in_progress | completed | cancelled
  
  // Location details
  pickupAddress        String?
  pickupLat            Decimal?  @db.Decimal(9, 6)
  pickupLng            Decimal?  @db.Decimal(9, 6)
  dropoffAddress       String?
  dropoffLat           Decimal?  @db.Decimal(9, 6)
  dropoffLng           Decimal?  @db.Decimal(9, 6)
  
  // Financial snapshot
  currency             String    @default("AUD")
  priceCents           Int       // Total price
  platformFeeCents     Int       // Platform's share
  instructorShareCents Int       // Instructor's share
  
  notes                String?
}
```

**Booking Status Flow:**
1. **`requested`**: Student creates booking
2. **`confirmed`**: Instructor/admin approves
3. **`in_progress`**: Lesson has started
4. **`completed`**: Lesson finished successfully
5. **`cancelled`**: Booking cancelled
6. **`no_show`**: Student didn't attend

### **Business Rules**
- **Availability checking**: Bookings must fit instructor availability
- **No double-booking**: One instructor, one time slot
- **Price snapshotting**: Booking preserves price at creation
- **Location flexibility**: Pickup/dropoff anywhere in service area

### **Use Cases**
- **Recurring schedules**: Same time every week
- **Holiday management**: Automatic closure handling
- **Dynamic pricing**: Peak hour rate adjustments
- **Route optimization**: Efficient instructor travel

---

## 🚗 5. Lesson Execution & GPS Tracking

### **Purpose**
Real-time lesson tracking with comprehensive GPS data collection.

### **Models**

#### **`Lesson` - Executed Lesson Instance**
```prisma
model Lesson {
  id             String    @id @default(uuid())
  orgId          String
  bookingId      String    @unique
  instructorId   String
  studentId      String
  
  startedAt      DateTime? // When lesson actually began
  endedAt        DateTime? // When lesson actually ended
  rating         Int?      // 1-5 stars
  notes          String?   // Instructor feedback
  
  distanceMeters Int?      // Total distance driven
  durationSec    Int?      // Actual lesson duration
}
```

#### **`Trip` - GPS Tracking Session**
```prisma
model Trip {
  id         String   @id @default(uuid())
  lessonId   String
  startedAt  DateTime // GPS tracking start
  endedAt    DateTime? // GPS tracking end
}
```

#### **`TripPoint` - Individual GPS Coordinates**
```prisma
model TripPoint {
  tripId     String
  ts         DateTime // Timestamp
  lat        Decimal  @db.Decimal(9, 6) // Latitude
  lng        Decimal  @db.Decimal(9, 6) // Longitude
  speedKph   Decimal? @db.Decimal(6, 2) // Speed in km/h
}
```

**GPS Data Collection:**
- **High precision**: 6 decimal places (~10cm accuracy)
- **Speed monitoring**: Safety and performance analysis
- **Timestamp accuracy**: Millisecond precision
- **Route reconstruction**: Complete lesson path

### **Business Features**
- **Progress tracking**: Distance and time metrics
- **Safety monitoring**: Speed analysis and alerts
- **Route optimization**: Learn efficient pickup routes
- **Performance analytics**: Instructor and student insights

### **Privacy & Compliance**
- **Explicit consent**: Students must agree to GPS tracking
- **Lesson-only tracking**: GPS only during lessons
- **Data retention**: Configurable retention periods
- **Export capability**: Students can request their data

### **PostGIS Migration Path**
The schema is designed for easy PostGIS upgrade:
```sql
-- Future spatial enhancement
ALTER TABLE TripPoint ADD COLUMN geom GEOMETRY(POINT, 4326);
CREATE INDEX idx_trip_point_geom ON TripPoint USING GIST(geom);
```

---

## 💰 6. Financial Operations

### **Purpose**
Complete payment processing with marketplace-style instructor payouts.

### **Models**

#### **`Payment` - Customer Payments**
```prisma
model Payment {
  id                   String        @id @default(uuid())
  orgId                String
  bookingId            String        @unique
  status               PaymentStatus // intent_created | succeeded | failed | refunded
  currency             String        @default("AUD")
  amountCents          Int          // Total payment amount
  platformFeeCents     Int          // DriveFlow's fee
  instructorShareCents Int          // Instructor's earnings
  
  // Stripe integration
  stripePaymentIntentId String @unique
  stripeChargeId        String?
  stripeRefundId        String?
}
```

#### **`Payout` - Instructor Payouts**
```prisma
model Payout {
  id                String   @id @default(uuid())
  orgId             String
  instructorId      String
  bookingId         String? // Can be booking-specific or bulk
  currency          String  @default("AUD")
  amountCents       Int
  status            String  @default("pending") // pending | paid | failed
  stripeTransferId  String? @unique
}
```

### **Payment Flow**
1. **Student books lesson**: Creates booking with price snapshot
2. **Payment collection**: Stripe PaymentIntent created
3. **Payment success**: Status updated to 'succeeded'
4. **Payout calculation**: Platform fee vs instructor share
5. **Instructor payout**: Stripe Connect transfer
6. **Payout completion**: Status updated to 'paid'

### **Financial Architecture**
```
$100 Lesson Payment
├── $15 Platform Fee (15%)
└── $85 Instructor Share (85%)
```

### **Stripe Integration Points**
- **Customer payments**: PaymentIntents API
- **Instructor onboarding**: Connect accounts
- **Automatic payouts**: Connect transfers
- **Webhook processing**: Payment status updates

### **Business Rules**
- **Immediate charge**: Payment collected at booking
- **Delayed payout**: Instructor paid after lesson completion
- **Refund handling**: Partial/full refunds supported
- **Fee transparency**: Clear breakdown of charges

---

## 📬 7. Communication & Messaging

### **Purpose**
Centralized communication logging across email, SMS, and WhatsApp.

### **Models**

#### **`Message` - Communication Log**
```prisma
model Message {
  id           String         @id @default(uuid())
  orgId        String
  toAddress    String         // email@example.com or +61412345678
  channel      MessageChannel // email | sms | whatsapp
  templateKey  String         // "booking_confirmation", "lesson_reminder"
  subject      String?        // For emails
  body         String?        // Message content
  providerId   String?        // External provider ID
  status       MessageStatus  // queued | sent | failed
  error        String?        // Error details if failed
  
  // Related entity tracking
  relatedType  String?        // "Booking", "Payment"
  relatedId    String?        // Entity ID
}
```

### **Message Templates**
- **Booking confirmations**: "Your lesson is confirmed for..."
- **Lesson reminders**: "Reminder: Lesson tomorrow at..."
- **Payment receipts**: "Payment successful for $95.00"
- **Cancellation notices**: "Your lesson has been cancelled"
- **Progress updates**: "Great lesson today! Next focus: parallel parking"

### **Multi-Channel Strategy**
- **Email**: Detailed information, receipts
- **SMS**: Time-sensitive reminders
- **WhatsApp**: Rich media, two-way communication

### **Provider Integration**
- **Email**: Postmark, SendGrid, AWS SES
- **SMS**: Twilio, MessageBird
- **WhatsApp**: Twilio, WhatsApp Business API

### **Compliance Features**
- **Delivery tracking**: Success/failure status
- **Opt-out handling**: Unsubscribe management
- **Rate limiting**: Prevent spam
- **Template management**: Consistent messaging

---

## 🔄 8. Events & Integration

### **Purpose**
Reliable event processing and external system integration.

### **Models**

#### **`WebhookEvent` - Inbound Webhooks**
```prisma
model WebhookEvent {
  id          String    @id @default(uuid())
  provider    String    // "stripe", "clerk", "postmark"
  eventType   String    // "payment_intent.succeeded"
  eventId     String    @unique // Provider's event ID
  payload     Json      // Full webhook payload
  processedAt DateTime? // When we processed it
  receivedAt  DateTime  @default(now())
}
```

#### **`Outbox` - Outbound Events**
```prisma
model Outbox {
  id          String    @id @default(uuid())
  topic       String    // "booking.created", "lesson.completed"
  payload     Json      // Event data
  attempts    Int       @default(0)
  lastError   String?
  processedAt DateTime?
}
```

#### **`AuditLog` - Change Tracking**
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  orgId       String
  actorUserId String?  // Who made the change
  action      String   // "BOOKING_UPDATED", "PAYMENT_REFUNDED"
  entityType  String   // "Booking", "Payment"
  entityId    String   // Entity ID
  before      Json?    // State before change
  after       Json?    // State after change
  ip          String?  // Client IP address
}
```

### **Event Processing Patterns**

#### **Webhook Idempotency**
- **Event ID deduplication**: Prevent duplicate processing
- **Status tracking**: Know what's been processed
- **Retry logic**: Handle temporary failures

#### **Outbox Pattern**
- **Transactional safety**: Events published with database changes
- **Guaranteed delivery**: Retry until successful
- **Event ordering**: Maintain proper sequence

#### **Audit Trail**
- **Complete history**: Every important change logged
- **Compliance ready**: Meet regulatory requirements
- **Debugging aid**: Trace issues through system

### **Integration Examples**
- **Stripe webhooks**: Payment status updates
- **Email delivery**: Postmark delivery confirmations
- **Calendar sync**: Google Calendar integration
- **Accounting**: Xero/QuickBooks synchronization

---

## 🔍 Cross-Domain Patterns

### **Multi-Tenancy**
Every domain respects organization boundaries:
```sql
-- Always filter by orgId
WHERE orgId = $userOrgId
```

### **Event Sourcing**
Key business events are captured:
- Booking state changes
- Payment transitions  
- Lesson completion
- User role changes

### **Temporal Patterns**
Time-based data handled consistently:
- **Effective dates**: Availability, rate cards
- **Audit timestamps**: Created/updated tracking
- **Event timestamps**: Precise event ordering

### **Reference Data**
Lookup tables support business operations:
- Currency codes
- Timezone definitions
- Message templates
- Service categories

This domain-driven design ensures **clear boundaries**, **maintainable code**, and **business-aligned data structures** throughout the DriveFlow platform.
