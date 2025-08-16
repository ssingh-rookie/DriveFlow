# DriveFlow Lesson CRUD - Implementation Tasks

_Generated from [prd-lesson-crud.md](./prd-lesson-crud.md) - Gradual Enhancement Approach_

---

## 🎯 **Implementation Strategy**

**Approach**: Gradual enhancement of existing booking/lesson system

- ✅ **Keep existing `BookingStatus` enum** - Work within current state model
- ✅ **Maintain 1:1 Booking ↔ Lesson relationship** - Enhance existing pattern
- ✅ **Gradual evolution** - Build on existing functionality incrementally
- ✅ **Enhanced Read Operations** - Add comprehensive lesson retrieval with role-based scoping, pagination, and performance optimizations

---

## 📋 **Parent Task 1: Database Schema Enhancements**

_Enhance existing schema to support lesson CRUD requirements_

### **Sub-Tasks:**

#### **1.1: Add Cancellation Policy Support**

- [x] Create `CancellationPolicy` model for configurable rules
- [x] Add policy fields to support actor-based refund matrices
- [x] Link policies to organizations for multi-tenant rules
- [x] **Files**: `schema.prisma`, new migration

#### **1.2: Enhance Booking Model for Advanced Workflows**

- [x] Add `cancelledBy`, `cancelledAt`, `cancellationReason` fields
- [x] Add `rescheduledFrom`, `rescheduledAt`, `rescheduleReason` fields
- [x] Add `idempotencyKey` field for duplicate prevention
- [x] Add state transition tracking fields (`previousStatus`, `statusChangedAt`, `statusChangedBy`)
- [x] **Files**: `schema.prisma`, new migration

#### **1.3: Add State Management & Audit Trail**

- [x] Create `LessonStateHistory` table for state transition tracking
- [x] Add `ScheduledStateTransition` table for auto-progression (NoShow, payment timeout)
- [x] Create state machine configuration table (`StateTransitionRules`)
- [x] Enhance existing `AuditLog` to capture state transitions with context
- [x] Add database constraints for state transition validation
- [x] **Files**: `schema.prisma`, new migrations, audit utilities

#### **1.4: Add Availability & Constraint Tables**

- [x] Create `InstructorWorkingHours` table for scheduling windows
- [x] Add `TravelTimeCache` table for location-based buffers
- [x] Create `LicenseCompatibilityMatrix` table for lesson type validation
- [x] Add database constraint to prevent overlapping bookings
- [x] Create exclusion constraint for `(instructorId, startAt, endAt)`
- [x] Add indexes for availability queries: `(instructorId, date, status)`, `(orgId, startAt, endAt)`
- [x] **Files**: `schema.prisma`, new migrations, tests

---

## 📋 **Parent Task 2: Contract-First API Development**

_Define type-safe contracts for all lesson operations_

### **Sub-Tasks:**

#### **2.1: Create Lesson CRUD Schemas**

- [x] Define `CreateLessonSchema`, `UpdateLessonSchema`, `CancelLessonSchema` in `@driveflow/contracts`
- [x] Add `LessonQuerySchema` with filtering options (`actorScope`, `instructorId`, `learnerId`, `from`, `to`, `status`)
- [x] Create pagination schemas (`page`, `pageSize`, default 25, max 100)
- [x] Add location schema with lat/lng/label structure
- [x] **Files**: `packages/contracts/src/lessons/`

#### **2.2: Create Response DTOs**

- [x] Define `LessonDto`, `LessonListDto`, `LessonDetailsDto`
- [x] Add pagination response schema (`LessonPaginatedResponse`)
- [x] Create lesson summary schema for list views (minimal data)
- [x] Add status transition response schemas
- [x] Create error schemas for lesson-specific errors
- [x] **Files**: `packages/contracts/src/lessons/`

#### **2.3: Add API Request/Response Types**

- [x] Create availability check request/response schemas
- [x] Define refund calculation response schemas
- [x] Add audit trail response schemas
- [x] **Files**: `packages/contracts/src/lessons/`

#### **2.4: Generate OpenAPI Specifications**

- [x] Run `pnpm gen` to generate types from Zod schemas
- [x] Verify all lesson endpoints are properly typed
- [x] Update API documentation
- [x] **Files**: Generated types, API docs

---

## 📋 **Parent Task 3: Lesson Service & Repository Layer**

_Implement business logic following DriveFlow patterns_

### **Sub-Tasks:**

#### **3.1: Create Lesson Repository**

- [x] Implement `LessonRepository` with all CRUD operations
- [x] Add optimized queries for lesson listing with filters (`orgId`, `instructorId`, `learnerId`, `status`, date ranges)
- [x] Implement role-based data scoping queries (learner, parent, instructor, admin)
- [x] Add database indexes: `(orgId, instructorId, start)`, `(orgId, learnerId, start)`
- [x] Add availability checking queries with instructor constraints
- [x] Implement overlap detection queries
- [x] Add pagination with eager/lazy loading for relations (instructor/learner names vs full details)
- [x] **Files**: `apps/api/src/modules/lessons/lesson.repo.ts`

#### **3.2: Build Lesson Service Core**

- [x] Create `LessonService` with pure business logic methods
- [x] Implement lesson creation with availability validation
- [x] Add lesson retrieval with RBAC filtering using `AuthenticatedUser` and `scopedResourceIds`:
  - **Role-based filtering**: Apply different query filters per role (owner/admin/instructor/student)
  - **Scoped access**: Use scopedResourceIds from RoleGuard for instructors/students
  - **Org context**: Always filter by user.orgId for multi-tenancy
- [x] Implement pagination logic with performance optimizations
- [x] Add caching layer for lesson lists (30s) and details (5min)
- [x] Add helper method `buildFilters(user: AuthenticatedUser, query)` for role-based query building
- [x] **Files**: `apps/api/src/modules/lessons/lesson.service.ts`

#### **3.3: Implement Basic State Management & Policy Engine** _(Iterative Approach)_

- [x] Create `LessonStateMachine` service for basic state validation
- [x] Implement core state transitions (requested → confirmed → completed → cancelled)
- [x] **MVP**: Manual state transitions only (no auto-progression initially)
- [x] Create `PolicyService` for basic cancellation/reschedule rules
- [x] Implement simple actor-based fee calculation (flat rates initially)
- [x] Add basic cutoff window validation (configurable hours)
- [ ] **Post-MVP**: Add cron job polling for NoShow detection (simple setInterval)
- [ ] **Future**: Upgrade to BullMQ when scaling needed
- [x] **Files**: `apps/api/src/modules/lessons/state-machine.service.ts`, `policy.service.ts`

#### **3.4: Build Basic Availability Service** _(Start Simple, Iterate)_

- [x] Create `AvailabilityService` with basic slot checking
- [x] **MVP**: Simple overlap detection using database queries
- [x] Add basic working hours validation (9am-5pm default)
- [x] **MVP**: Fixed buffer time between lessons (15min default)
- [x] **Post-MVP**: Add instructor-specific availability windows
- [ ] **Post-MVP**: Implement dynamic travel buffer calculations
- [ ] **Future**: Add license type compatibility and location filtering
- [x] **Files**: `apps/api/src/modules/lessons/availability.service.ts`

---

## 📋 **Parent Task 4: API Controllers & RBAC Integration**

_Build NestJS controllers following existing patterns_

### **Sub-Tasks:**

#### **4.1: Create Lesson Controller Foundation**

- [x] Create `LessonController` with proper decorators
- [x] Add route versioning (`/v1/lessons`)
- [x] Implement guards: `@UseGuards(JwtAuthGuard, RoleGuard, OrgScopeGuard)` on controller level
- [x] Import RBAC decorators: `@Permissions`, `@CurrentUser`, proper guard integration
- [x] Implement comprehensive CRUD endpoints structure with role-based access patterns
- [x] **Files**: `apps/api/src/modules/lessons/lesson.controller.ts`

#### **4.2: Implement Lesson Creation (POST /lessons)**

- [x] Add `@Permissions('lessons:create', 'bookings:create')` decorator
- [x] Add endpoint with idempotency key support
- [x] Implement role-based creation logic (students book own, admins book for others)
- [x] Add `@CurrentUser()` parameter injection for user context
- [x] Integrate with existing payment service patterns
- [x] Implement proper error handling with ProblemDetails
- [x] **Files**: `lesson.controller.ts`, error handlers

#### **4.3: Add Lesson Retrieval (GET /lessons, GET /lessons/:id)**

- [x] Add RBAC scoping through service layer integration (automatic through guards)
- [x] Implement list endpoint with filtering and pagination (`actorScope`, `from`, `to`, `status`)
- [x] Add role-based data scoping using service layer RBAC filtering:
  - **Instructors**: Only lessons they teach (assignedStudentIds)
  - **Students**: Only own/children lessons (scopedResourceIds)
  - **Admin/Owner**: All org lessons (no scoping)
- [x] Add detailed view with permission-based access for single lesson access
- [x] Implement performance optimizations (indexes, caching, eager/lazy loading)
- [x] **Files**: `lesson.controller.ts`, RBAC guards, caching layer

#### **4.4: Implement Lesson Updates (PUT /lessons/:id)**

- [x] Add `@Permissions('lessons:write')` decorator with role-based authorization
- [x] Implement scoped update logic (instructors can only update their lessons)
- [x] Add reschedule functionality with availability recheck
- [x] Integrate policy engine for fee calculation through service layer
- [x] Handle payment processing for reschedule fees through service integration
- [x] Use `@CurrentUser()` for actor context in audit logs
- [x] **Files**: `lesson.controller.ts`, payment integration

#### **4.5: Add Lesson Cancellation (DELETE /lessons/:id)**

- [x] Add `@Permissions('lessons:delete')` with role-based access control
- [x] Implement actor-based cancellation logic using `@CurrentUser()`:
  - **Students**: Can request cancellation (soft cancel)
  - **Instructors**: Can cancel their lessons
  - **Admin/Owner**: Can cancel any org lesson
- [x] Add refund calculation and processing based on actor and policy
- [x] Ensure proper audit trail for cancellations with user context
- [x] **Files**: `lesson.controller.ts`, refund processing

#### **4.6: RBAC Integration & Testing**

- [x] RBAC implemented across all endpoints with proper role-based access control
- [x] Scoped access implemented correctly through service layer:
  - Instructors can only see/modify lessons for assigned students
  - Students can only see/modify their own lessons (+ children for parents)
  - Admin/Owner can see/modify all org lessons
- [x] Cross-org data isolation implemented (automatic orgId filtering)
- [x] Audit logging captures all RBAC decisions and user context
- [x] Permission edge cases handled (proper 403 Forbidden responses)
- [x] **Files**: Full RBAC integration in controller, service, and repository layers

---

## 📋 **Parent Task 5: Integration Services**

_Connect lessons with payment, notification, and event systems_

### **Sub-Tasks:**

#### **5.1: Payment Service Integration**

- [x] Enhance existing payment service for lesson operations
- [x] Add reschedule fee processing capability
- [x] Implement refund logic with pro-rata calculations
- [x] **Files**: `apps/api/src/modules/payments/payments.service.ts`

#### **5.2: Basic Notification Integration** _(Simple REST First)_

- [x] **MVP**: Direct database inserts to `Message` table for notifications
- [x] Create basic lesson notification templates (email only initially)
- [x] Add notification triggers for core lesson events (created, cancelled)
- [x] **Post-MVP**: Add SMS notifications (structure ready)
- [ ] **Future**: Add real-time Socket.IO notifications
- [x] **Files**: `apps/api/src/modules/lessons/notification.service.ts`

#### **5.3: Simple Event Patterns** _(REST-Based Initially)_

- [x] **MVP**: Direct database logging of lesson events to `AuditLog`
- [x] Create basic `LessonCreated`, `LessonCancelled` event handlers
- [x] **MVP**: Synchronous event processing in same transaction
- [ ] **Post-MVP**: Add `Outbox` table integration for reliability
- [ ] **Future**: Add async event consumers and external integrations
- [x] **Files**: Event utilities, audit logging

#### **5.4: Simple State Management** _(Polling-Based Initially)_

- [x] **MVP**: Create simple cron service with `setInterval` polling
- [x] Add basic NoShow detection (check lessons 30min after end time)
- [x] **MVP**: Simple retry logic with exponential backoff
- [ ] **Post-MVP**: Add worker app with BullMQ for production
- [ ] **Future**: Add monitoring, alerting, and complex job scheduling
- [x] **Files**: Simple cron service, state polling utilities

---

## 📋 **Parent Task 6: Frontend Components & Integration**

_Build React components using existing DriveFlow patterns_

### **Sub-Tasks:**

#### **6.1: Lesson Booking Flow**

- [ ] Create lesson booking form with instructor/time selection
- [ ] Add availability display with real-time updates
- [ ] Implement payment integration UI
- [ ] **Files**: `apps/web/src/components/lessons/LessonBookingForm.tsx`

#### **6.2: Lesson Management Dashboard**

- [x] Build lesson list view with filtering (`actorScope`, date ranges, status filters)
- [x] Implement pagination controls with performance optimizations
- [x] Add role-based views (learner: own lessons, parent: children's lessons, instructor: teaching lessons, admin: all org lessons)
- [x] Add lesson detail view with all information and related data
- [x] Implement lesson actions (reschedule, cancel) with proper permissions
- [x] Add real-time filter feedback and active filter display
- [x] **Files**: Enhanced `apps/web/src/app/lessons/page.tsx` with comprehensive dashboard features

#### **6.3: Basic Updates & State Management** _(REST-First Approach)_

- [x] **MVP**: Use standard REST API calls with periodic refresh
- [x] Implement optimistic updates with TanStack Query
- [x] Add basic notification banners for lesson status changes
- [x] **Post-MVP**: Add polling for live updates (30s intervals)
- [ ] **Future**: Integrate Socket.IO for real-time updates
- [x] **Files**: React hooks, notification components

#### **6.4: Mobile App Enhancement**

- [ ] Add lesson management screens to React Native app
- [ ] Implement GPS integration for lesson tracking
- [ ] Add push notification handling
- [ ] **Files**: `apps/mobile/src/screens/lessons/`

---

## 📋 **Parent Task 7: Testing & Quality Assurance**

_Comprehensive testing following DriveFlow standards_

### **Sub-Tasks:**

#### **7.1: Unit Testing**

- [ ] Test all service layer business logic
- [ ] Test policy engine calculations
- [ ] Test repository layer database operations
- [ ] **Files**: `.spec.ts` files for all services

#### **7.2: Integration Testing**

- [ ] Test all API endpoints with authentication
- [ ] Test payment integration flows
- [ ] Test notification delivery
- [ ] **Files**: Integration test suites

#### **7.3: End-to-End Testing**

- [ ] Test complete lesson booking flow
- [ ] Test reschedule with fee scenarios
- [ ] Test cancellation with refund scenarios
- [ ] **Files**: E2E test suites, Playwright tests

#### **7.4: Performance Testing**

- [ ] Test availability query performance
- [ ] Test lesson list query performance with large datasets
- [ ] Test pagination performance across different page sizes
- [ ] Test concurrent booking scenarios
- [ ] Test database constraint performance
- [ ] Test caching effectiveness for list/detail views
- [ ] **Files**: Performance test suites

---

## 🎯 **Implementation Phases**

### **Phase 1: Foundation (Tasks 1-2)**

- Database schema enhancements
- Contract definitions and type generation
- **Goal**: Type-safe foundation ready

### **Phase 2: Core Logic (Task 3)**

- Repository and service layer implementation
- Business logic and policy engine
- **Goal**: Backend logic complete

### **Phase 3: API Layer (Task 4)**

- Controller implementation
- RBAC integration
- **Goal**: Functional API endpoints

### **Phase 4: Integration (Task 5)**

- Payment, notification, and event integration
- **Goal**: Complete backend functionality

### **Phase 5: Frontend (Task 6)**

- React components and user interfaces
- **Goal**: End-to-end user experience

### **Phase 6: Quality (Task 7)**

- Comprehensive testing
- **Goal**: Production-ready feature

---

## 📁 **Key Files to Create/Modify**

### **Database & Schema**

- `apps/api/prisma/schema.prisma` - Schema enhancements
- `apps/api/prisma/migrations/` - New migrations

### **Contracts & Types**

- `packages/contracts/src/lessons/` - All lesson schemas
- `packages/contracts/src/index.ts` - Export lesson contracts

### **API Backend**

- `apps/api/src/modules/lessons/` - Complete lesson module
- `apps/api/src/modules/payments/` - Payment enhancements

### **Frontend**

- `apps/web/src/components/lessons/` - React components
- `apps/mobile/src/screens/lessons/` - Mobile screens

### **Testing**

- Test files alongside all implementation files
- Integration and E2E test suites

---

## ✅ **Acceptance Criteria**

### **Functional Requirements**

- ✅ All PRD API contracts implemented and working
- ✅ Complete RBAC integration with role-based access
- ✅ Payment integration for booking/reschedule/cancellation
- ✅ Real-time notifications for all lesson events
- ✅ Mobile and web UI for all lesson operations

### **Non-Functional Requirements**

- ✅ All endpoints respond within 300ms (p95)
- ✅ No data consistency issues under concurrent load
- ✅ Complete audit trail for all lesson operations
- ✅ 100% test coverage for business logic
- ✅ Proper error handling and user feedback

### **DriveFlow Standards**

- ✅ Repository pattern for all data access
- ✅ Contract-first with generated types
- ✅ Multi-tenant data scoping
- ✅ Comprehensive error handling
- ✅ Structured logging without PII

### **RBAC Security Requirements**

- ✅ All endpoints protected with `@UseGuards(JwtAuthGuard, RoleGuard)`
- ✅ Proper permission decorators on all CRUD operations
- ✅ Role-based data scoping enforced (instructors, students see only relevant data)
- ✅ Cross-org data isolation maintained (orgId filtering)
- ✅ Audit trail for all authorization decisions
- ✅ Scoped resource access working correctly (assignedStudentIds, childStudentIds)
- ✅ Permission matrix correctly implemented per role

---

## 🎯 **MVP vs Post-MVP Scope** _(Risk-Mitigated Approach)_

### **MVP Core Requirements (Must Have)** _(Simple, Working First)_

- ✅ **Basic State Management**: Manual state transitions, simple validation
- ✅ **Simple Availability Service**: Basic slot checking with fixed buffers
- ✅ **RBAC Integration**: Role-based access with existing scoped permissions
- ✅ **Basic Payment Flow**: Create, simple reschedule fees, basic refunds
- ✅ **Core CRUD Operations**: Create, read, update, cancel lessons (REST-based)
- ✅ **Basic Audit Trail**: Direct logging to AuditLog table

### **Post-MVP Enhancements (Iterative Improvements)**

- 🔄 **Enhanced State Management**: Auto-transitions, BullMQ, complex workflows
- 🔄 **Advanced Availability**: Travel buffers, license validation, location filtering
- 🔄 **Real-time Features**: Socket.IO, live updates, push notifications
- 🔄 **Advanced Payment Scenarios**: 3D Secure, split payments, complex refunds
- 🔄 **Mobile GPS Integration**: Lesson tracking, check-in/out, location validation
- 🔄 **Performance Optimizations**: Advanced caching, query optimization, scalability

### **Future Enhancements (Scale & Polish)**

- 🚀 **External Integrations**: Weather API, Maps API, advanced geocoding
- 🚀 **Advanced RBAC Edge Cases**: Dynamic roles, permission escalation prevention
- 🚀 **Enterprise Features**: Multi-region, advanced analytics, integrations

### **Implementation Strategy** _(Mitigation-Focused)_

1. **Phase 1-2**: Database + Contracts (solid foundation)
2. **Phase 3**: Basic services (simple implementations that work)
3. **Phase 4**: REST APIs with existing RBAC (leverage what works)
4. **Phase 5**: Basic frontend (standard patterns)
5. **Phase 6**: Testing (ensure MVP works reliably)
6. **Phase 7+**: Iterative enhancements based on usage

---

**Next Step**: Begin MVP implementation with Phase 1 (Database schema enhancements) - would you like me to start with the first sub-task?
