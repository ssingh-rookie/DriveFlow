# DriveFlow Lesson CRUD - Implementation Tasks

*Generated from [prd-lesson-crud.md](./prd-lesson-crud.md) - Gradual Enhancement Approach*

---

## 🎯 **Implementation Strategy**

**Approach**: Gradual enhancement of existing booking/lesson system
- ✅ **Keep existing `BookingStatus` enum** - Work within current state model
- ✅ **Maintain 1:1 Booking ↔ Lesson relationship** - Enhance existing pattern  
- ✅ **Gradual evolution** - Build on existing functionality incrementally
- ✅ **Enhanced Read Operations** - Add comprehensive lesson retrieval with role-based scoping, pagination, and performance optimizations

---

## 📋 **Parent Task 1: Database Schema Enhancements**
*Enhance existing schema to support lesson CRUD requirements*

### **Sub-Tasks:**

#### **1.1: Add Cancellation Policy Support**
- [ ] Create `CancellationPolicy` model for configurable rules
- [ ] Add policy fields to support actor-based refund matrices
- [ ] Link policies to organizations for multi-tenant rules
- [ ] **Files**: `schema.prisma`, new migration

#### **1.2: Enhance Booking Model for Advanced Workflows**
- [ ] Add `cancelledBy`, `cancelledAt`, `cancellationReason` fields
- [ ] Add `rescheduledFrom`, `rescheduledAt`, `rescheduleReason` fields
- [ ] Add `idempotencyKey` field for duplicate prevention
- [ ] Add state transition tracking fields (`previousStatus`, `statusChangedAt`, `statusChangedBy`)
- [ ] **Files**: `schema.prisma`, new migration

#### **1.3: Add State Management & Audit Trail**
- [ ] Create `LessonStateHistory` table for state transition tracking
- [ ] Add `ScheduledStateTransition` table for auto-progression (NoShow, payment timeout)
- [ ] Create state machine configuration table (`StateTransitionRules`)
- [ ] Enhance existing `AuditLog` to capture state transitions with context
- [ ] Add database constraints for state transition validation
- [ ] **Files**: `schema.prisma`, new migrations, audit utilities

#### **1.4: Add Availability & Constraint Tables**
- [ ] Create `InstructorWorkingHours` table for scheduling windows
- [ ] Add `TravelTimeCache` table for location-based buffers
- [ ] Create `LicenseCompatibilityMatrix` table for lesson type validation
- [ ] Add database constraint to prevent overlapping bookings
- [ ] Create exclusion constraint for `(instructorId, startAt, endAt)`
- [ ] Add indexes for availability queries: `(instructorId, date, status)`, `(orgId, startAt, endAt)`
- [ ] **Files**: `schema.prisma`, new migrations, tests

---

## 📋 **Parent Task 2: Contract-First API Development** 
*Define type-safe contracts for all lesson operations*

### **Sub-Tasks:**

#### **2.1: Create Lesson CRUD Schemas**
- [ ] Define `CreateLessonSchema`, `UpdateLessonSchema`, `CancelLessonSchema` in `@driveflow/contracts`
- [ ] Add `LessonQuerySchema` with filtering options (`actorScope`, `instructorId`, `learnerId`, `from`, `to`, `status`)
- [ ] Create pagination schemas (`page`, `pageSize`, default 25, max 100)
- [ ] Add location schema with lat/lng/label structure
- [ ] **Files**: `packages/contracts/src/lessons/`

#### **2.2: Create Response DTOs**
- [ ] Define `LessonDto`, `LessonListDto`, `LessonDetailsDto`
- [ ] Add pagination response schema (`LessonPaginatedResponse`)
- [ ] Create lesson summary schema for list views (minimal data)
- [ ] Add status transition response schemas
- [ ] Create error schemas for lesson-specific errors
- [ ] **Files**: `packages/contracts/src/lessons/`

#### **2.3: Add API Request/Response Types**
- [ ] Create availability check request/response schemas
- [ ] Define refund calculation response schemas  
- [ ] Add audit trail response schemas
- [ ] **Files**: `packages/contracts/src/lessons/`

#### **2.4: Generate OpenAPI Specifications**
- [ ] Run `pnpm gen` to generate types from Zod schemas
- [ ] Verify all lesson endpoints are properly typed
- [ ] Update API documentation
- [ ] **Files**: Generated types, API docs

---

## 📋 **Parent Task 3: Lesson Service & Repository Layer**
*Implement business logic following DriveFlow patterns*

### **Sub-Tasks:**

#### **3.1: Create Lesson Repository**
- [ ] Implement `LessonRepository` with all CRUD operations
- [ ] Add optimized queries for lesson listing with filters (`orgId`, `instructorId`, `learnerId`, `status`, date ranges)
- [ ] Implement role-based data scoping queries (learner, parent, instructor, admin)
- [ ] Add database indexes: `(orgId, instructorId, start)`, `(orgId, learnerId, start)`
- [ ] Add availability checking queries with instructor constraints
- [ ] Implement overlap detection queries
- [ ] Add pagination with eager/lazy loading for relations (instructor/learner names vs full details)
- [ ] **Files**: `apps/api/src/modules/lessons/lesson.repo.ts`

#### **3.2: Build Lesson Service Core**
- [ ] Create `LessonService` with pure business logic methods
- [ ] Implement lesson creation with availability validation
- [ ] Add lesson retrieval with RBAC filtering using `AuthenticatedUser` and `scopedResourceIds`:
  - **Role-based filtering**: Apply different query filters per role (owner/admin/instructor/student)
  - **Scoped access**: Use scopedResourceIds from RoleGuard for instructors/students
  - **Org context**: Always filter by user.orgId for multi-tenancy
- [ ] Implement pagination logic with performance optimizations
- [ ] Add caching layer for lesson lists (30s) and details (5min)
- [ ] Add helper method `buildFilters(user: AuthenticatedUser, query)` for role-based query building
- [ ] **Files**: `apps/api/src/modules/lessons/lesson.service.ts`

#### **3.3: Implement State Machine & Policy Engine**
- [ ] Create `LessonStateMachine` service for state transition management
- [ ] Implement state transition validation with guard conditions
- [ ] Add auto-progression scheduling for NoShow and payment timeout
- [ ] Create `PolicyService` for cancellation/reschedule rules
- [ ] Implement actor-based fee calculation logic
- [ ] Add cutoff window validation
- [ ] Create background job for scheduled state transitions
- [ ] **Files**: `apps/api/src/modules/lessons/state-machine.service.ts`, `policy.service.ts`, `state-transition.job.ts`

#### **3.4: Build Enhanced Availability Service**
- [ ] Create `AvailabilityService` with comprehensive slot checking
- [ ] Implement travel buffer calculations between lessons
- [ ] Add working hours validation (instructor schedules, org hours)
- [ ] Implement license type compatibility checking
- [ ] Add basic time-of-day restrictions (daylight hours for learners)
- [ ] Create availability query optimization with caching
- [ ] Add location-based availability filtering
- [ ] **Files**: `apps/api/src/modules/availability/availability.service.ts`, cache utilities

---

## 📋 **Parent Task 4: API Controllers & RBAC Integration**
*Build NestJS controllers following existing patterns*

### **Sub-Tasks:**

#### **4.1: Create Lesson Controller Foundation**
- [ ] Create `LessonController` with proper decorators
- [ ] Add route versioning (`/v1/lessons`)
- [ ] Implement guards: `@UseGuards(JwtAuthGuard, RoleGuard)` on controller level
- [ ] Import RBAC decorators: `ScopedLessonAccess`, `LessonManagement`, `Permissions`, `CurrentUser`
- [ ] Implement basic CRUD endpoints structure with role-based access patterns
- [ ] **Files**: `apps/api/src/modules/lessons/lesson.controller.ts`

#### **4.2: Implement Lesson Creation (POST /lessons)**
- [ ] Add `@Permissions('lessons:create', 'bookings:create')` decorator
- [ ] Add endpoint with idempotency key support
- [ ] Implement role-based creation logic (students book own, admins book for others)
- [ ] Add `@CurrentUser()` parameter injection for user context
- [ ] Integrate with existing payment service patterns
- [ ] Implement proper error handling with ProblemDetails
- [ ] **Files**: `lesson.controller.ts`, error handlers

#### **4.3: Add Lesson Retrieval (GET /lessons, GET /lessons/:id)**
- [ ] Add `@ScopedLessonAccess()` decorator for automatic RBAC scoping
- [ ] Implement list endpoint with filtering and pagination (`actorScope`, `from`, `to`, `status`)
- [ ] Add role-based data scoping using `request.scopedResourceIds` from RoleGuard:
  - **Instructors**: Only lessons they teach (assignedStudentIds)
  - **Students**: Only own/children lessons (scopedResourceIds)  
  - **Admin/Owner**: All org lessons (no scoping)
- [ ] Add detailed view with `@ScopedLessonAccess()` for single lesson access
- [ ] Implement performance optimizations (indexes, caching, eager/lazy loading)
- [ ] **Files**: `lesson.controller.ts`, RBAC guards, caching layer

#### **4.4: Implement Lesson Updates (PUT /lessons/:id)**
- [ ] Add `@AuthorizedEndpoint(['owner', 'admin', 'instructor'], ['lessons:write'], true)` decorator
- [ ] Implement scoped update logic (instructors can only update their lessons)
- [ ] Add reschedule endpoint with availability recheck
- [ ] Integrate policy engine for fee calculation
- [ ] Handle payment processing for reschedule fees  
- [ ] Use `@CurrentUser()` for actor context in audit logs
- [ ] **Files**: `lesson.controller.ts`, payment integration

#### **4.5: Add Lesson Cancellation (DELETE /lessons/:id)**
- [ ] Add `@Permissions('lessons:delete')` with role restrictions (admin/owner only for hard delete)
- [ ] Implement actor-based cancellation logic using `@CurrentUser()`:
  - **Students**: Can request cancellation (soft cancel)
  - **Instructors**: Can cancel their lessons
  - **Admin/Owner**: Can cancel any org lesson
- [ ] Add refund calculation and processing based on actor and policy
- [ ] Ensure proper audit trail for cancellations with user context
- [ ] **Files**: `lesson.controller.ts`, refund processing

#### **4.6: RBAC Integration & Testing**
- [ ] Test all endpoints with different user roles (owner, admin, instructor, student)
- [ ] Verify scoped access works correctly:
  - Instructors can only see/modify lessons for assigned students
  - Students can only see/modify their own lessons (+ children for parents)
  - Admin/Owner can see/modify all org lessons
- [ ] Test cross-org data isolation (users cannot access other org's lessons)
- [ ] Verify audit logging captures all RBAC decisions and user context
- [ ] Test permission edge cases (instructor trying to access unassigned lesson)
- [ ] **Files**: Integration tests, RBAC test suites

---

## 📋 **Parent Task 5: Integration Services**
*Connect lessons with payment, notification, and event systems*

### **Sub-Tasks:**

#### **5.1: Payment Service Integration**
- [ ] Enhance existing payment service for lesson operations
- [ ] Add reschedule fee processing capability
- [ ] Implement refund logic with pro-rata calculations
- [ ] **Files**: `apps/api/src/modules/payments/`, payment utilities

#### **5.2: Notification Service Integration**
- [ ] Create lesson-specific notification templates
- [ ] Add notification triggers for all lesson events
- [ ] Implement calendar invite generation (iCal)
- [ ] **Files**: Notification templates, messaging service

#### **5.3: Outbox Event Patterns**
- [ ] Create `LessonCreated`, `LessonRescheduled`, `LessonCancelled` events
- [ ] Implement reliable event publishing to outbox
- [ ] Add event consumers for downstream processing
- [ ] **Files**: Event definitions, outbox handlers

#### **5.4: Background Jobs & State Management**
- [ ] Create scheduled jobs for state transitions (NoShow, payment timeout)
- [ ] Implement retry logic for failed state transitions
- [ ] Add monitoring and alerting for state management system
- [ ] Create cleanup jobs for expired draft lessons
- [ ] **Files**: Background job scheduler, monitoring utilities

---

## 📋 **Parent Task 6: Frontend Components & Integration**
*Build React components using existing DriveFlow patterns*

### **Sub-Tasks:**

#### **6.1: Lesson Booking Flow**
- [ ] Create lesson booking form with instructor/time selection
- [ ] Add availability display with real-time updates
- [ ] Implement payment integration UI
- [ ] **Files**: `apps/web/src/components/lessons/LessonBookingForm.tsx`

#### **6.2: Lesson Management Dashboard**
- [ ] Build lesson list view with filtering (`actorScope`, date ranges, status filters)
- [ ] Implement pagination controls with performance optimizations
- [ ] Add role-based views (learner: own lessons, parent: children's lessons, instructor: teaching lessons, admin: all org lessons)
- [ ] Add lesson detail view with all information and related data
- [ ] Implement lesson actions (reschedule, cancel) with proper permissions
- [ ] Add real-time updates for lesson status changes
- [ ] **Files**: `apps/web/src/components/lessons/LessonDashboard.tsx`, `LessonListView.tsx`, `LessonDetailView.tsx`

#### **6.3: Real-time Updates**
- [ ] Integrate Socket.IO for live lesson updates
- [ ] Add notification handling for lesson events
- [ ] Implement optimistic updates with TanStack Query
- [ ] **Files**: Socket integration, React hooks

#### **6.4: Mobile App Enhancement**
- [ ] Add lesson management screens to React Native app
- [ ] Implement GPS integration for lesson tracking
- [ ] Add push notification handling
- [ ] **Files**: `apps/mobile/src/screens/lessons/`

---

## 📋 **Parent Task 7: Testing & Quality Assurance**
*Comprehensive testing following DriveFlow standards*

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

## 🎯 **MVP vs Post-MVP Scope**

### **MVP Core Requirements (Must Have)**
- ✅ **State Management Engine**: Complete lesson lifecycle with auto-transitions
- ✅ **Enhanced Availability Service**: Travel buffers, working hours, license validation  
- ✅ **RBAC Integration**: Role-based access with scoped permissions
- ✅ **Basic Payment Flow**: Create, reschedule fees, cancellation refunds
- ✅ **Core CRUD Operations**: Create, read, update, cancel lessons
- ✅ **Audit Trail**: Full state transition and action logging

### **Post-MVP Enhancements (Future Iterations)**
- 🔄 **Advanced Payment Scenarios**: 3D Secure, split payments, complex refund scenarios
- 🔄 **Real-time Features**: Socket.IO, calendar integration, push notifications
- 🔄 **Mobile GPS Integration**: Lesson tracking, check-in/out, location validation
- 🔄 **Performance Optimizations**: Advanced caching, query optimization, scalability
- 🔄 **Advanced RBAC Edge Cases**: Dynamic role changes, permission escalation prevention
- 🔄 **External Integrations**: Weather API, Maps API traffic data, advanced geocoding

### **Implementation Priority**
1. **Phase 1-4**: MVP Core (State Management + Availability + RBAC + Basic Payments)
2. **Phase 5-6**: Frontend integration with MVP backend
3. **Phase 7**: Testing and quality assurance for MVP
4. **Future Phases**: Post-MVP enhancements based on user feedback

---

**Next Step**: Begin MVP implementation with Phase 1 (Database schema enhancements) - would you like me to start with the first sub-task?
