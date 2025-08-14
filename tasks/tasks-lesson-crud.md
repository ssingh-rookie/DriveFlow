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
- [ ] **Files**: `schema.prisma`, new migration

#### **1.3: Add Audit Trail Enhancements**
- [ ] Enhance existing `AuditLog` to capture state transitions
- [ ] Add specific audit for booking changes (reschedule, cancel)
- [ ] Ensure all policy decisions are audited
- [ ] **Files**: `schema.prisma`, audit utilities

#### **1.4: Create Instructor Overlap Constraints**
- [ ] Add database constraint to prevent overlapping bookings
- [ ] Create exclusion constraint for `(instructorId, startAt, endAt)`
- [ ] Test constraint behavior with edge cases
- [ ] **Files**: `schema.prisma`, new migration, tests

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
- [ ] Add lesson retrieval with proper RBAC filtering and role-based scoping
- [ ] Implement pagination logic with performance optimizations
- [ ] Add caching layer for lesson lists (30s) and details (5min)
- [ ] **Files**: `apps/api/src/modules/lessons/lesson.service.ts`

#### **3.3: Implement Policy Engine**
- [ ] Create `PolicyService` for cancellation/reschedule rules
- [ ] Implement actor-based fee calculation logic
- [ ] Add cutoff window validation
- [ ] **Files**: `apps/api/src/modules/lessons/policy.service.ts`

#### **3.4: Add State Transition Logic**
- [ ] Enhance existing booking status transitions
- [ ] Add validation for allowed state changes
- [ ] Implement audit logging for all transitions
- [ ] **Files**: `lesson.service.ts`, audit utilities

---

## 📋 **Parent Task 4: API Controllers & RBAC Integration**
*Build NestJS controllers following existing patterns*

### **Sub-Tasks:**

#### **4.1: Create Lesson Controller Foundation**
- [ ] Create `LessonController` with proper decorators
- [ ] Add route versioning (`/v1/lessons`)
- [ ] Implement basic CRUD endpoints structure
- [ ] **Files**: `apps/api/src/modules/lessons/lesson.controller.ts`

#### **4.2: Implement Lesson Creation (POST /lessons)**
- [ ] Add endpoint with idempotency key support
- [ ] Integrate with existing payment service patterns
- [ ] Implement proper error handling with ProblemDetails
- [ ] **Files**: `lesson.controller.ts`, error handlers

#### **4.3: Add Lesson Retrieval (GET /lessons, GET /lessons/:id)**
- [ ] Implement list endpoint with filtering and pagination (`actorScope`, `from`, `to`, `status`)
- [ ] Add role-based data scoping (learner, parent, instructor, admin views)
- [ ] Implement performance optimizations (indexes, caching, eager/lazy loading)
- [ ] Add detailed view endpoint with full lesson data and relations
- [ ] Apply RBAC filters based on user role and org scope
- [ ] **Files**: `lesson.controller.ts`, RBAC guards, caching layer

#### **4.4: Implement Lesson Updates (PUT /lessons/:id)**
- [ ] Add reschedule endpoint with availability recheck
- [ ] Integrate policy engine for fee calculation
- [ ] Handle payment processing for reschedule fees
- [ ] **Files**: `lesson.controller.ts`, payment integration

#### **4.5: Add Lesson Cancellation (DELETE /lessons/:id)**
- [ ] Implement cancellation with actor detection
- [ ] Add refund calculation and processing
- [ ] Ensure proper audit trail for cancellations
- [ ] **Files**: `lesson.controller.ts`, refund processing

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

#### **5.4: Availability Service Enhancement**
- [ ] Enhance existing availability checking logic
- [ ] Add travel buffer calculation between lessons
- [ ] Implement working hours and license type validation
- [ ] **Files**: Availability service, validation utilities

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

---

**Next Step**: Begin implementation with Phase 1 (Database schema enhancements) - would you like me to start with the first sub-task?
