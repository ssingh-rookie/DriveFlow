# DriveFlow Manual Test Cases

## Overview

This document provides comprehensive manual test cases for the DriveFlow portal. These tests ensure all features work correctly across different user scenarios, browsers, and devices.

## Test Environment Setup

### Prerequisites

- [ ] API server running (http://localhost:3001)
- [ ] Web app running (http://localhost:3000)
- [ ] Database seeded with test data
- [ ] Browser dev tools available for monitoring
- [ ] Test accounts for different user roles

### Test Data Requirements

- Minimum 5 instructors (mix of available/unavailable)
- All 5 service types configured with pricing
- Sample lessons in various states (requested, confirmed, completed, cancelled)
- Multiple test user accounts with different roles

## Test Suite Organization

## 1. Core User Journey Tests

### 1.1 Complete Lesson Booking Flow

#### Test: Book a Standard Driving Lesson

- [ ] Navigate to homepage (http://localhost:3000)
- [ ] Click "Book Your First Lesson" CTA button
- [ ] **Step 1 - Details Selection:**
  - [ ] Select "Standard Driving Lesson (60 min) - $80.00" from service dropdown
  - [ ] Select an available instructor (e.g., "John Smith")
  - [ ] Enter pickup address: "123 Main Street, City"
  - [ ] Leave dropoff address empty (should default to pickup)
  - [ ] Add note: "First time driver, nervous"
  - [ ] Click "Next" button
- [ ] **Step 2 - Time Selection:**
  - [ ] Verify service and instructor details displayed
  - [ ] Select tomorrow's date using date picker
  - [ ] Select 10:00 AM from time picker
  - [ ] Verify end time auto-calculates to 11:00 AM
  - [ ] Test quick time buttons (Tomorrow 9 AM, etc.)
  - [ ] Click "Next" button
- [ ] **Step 3 - Payment:**
  - [ ] Review booking summary for accuracy
  - [ ] Verify total shows $80.00
  - [ ] Confirm all details correct
  - [ ] Click "Book Lesson" button
- [ ] **Step 4 - Confirmation:**
  - [ ] Verify success message displays
  - [ ] Check booking details accuracy
  - [ ] Click "View My Lessons"
  - [ ] Confirm new lesson appears in dashboard

### 1.2 Lesson Management Workflow

#### Test: Manage Existing Lessons

- [ ] Navigate to "/lessons" dashboard
- [ ] Verify demo context shows "Student User" persona
- [ ] **View Lesson Details:**
  - [ ] Click "View Details" on any lesson
  - [ ] Verify modal opens with complete information
  - [ ] Check all fields display correctly
  - [ ] Close modal with X button
- [ ] **Cancel Upcoming Lesson:**
  - [ ] Find a confirmed future lesson
  - [ ] Click "Cancel" button
  - [ ] Verify status changes to "cancelled"
  - [ ] Check notification appears
- [ ] **Test Reschedule (Info Only):**
  - [ ] Click "Reschedule" on upcoming lesson
  - [ ] Verify info notification about future feature

## 2. Filtering & Search Tests

### 2.1 Filter Functionality

#### Test: Apply Multiple Filters

- [ ] Navigate to lessons dashboard
- [ ] **Status Filter:**
  - [ ] Select "Confirmed" from status dropdown
  - [ ] Verify only confirmed lessons display
  - [ ] Change to "All Statuses"
  - [ ] Verify all lessons return
- [ ] **Date Range Filter:**
  - [ ] Set "From Date" to last week
  - [ ] Set "To Date" to next week
  - [ ] Verify lessons within range display
- [ ] **Instructor Filter:**
  - [ ] Select specific instructor
  - [ ] Verify only their lessons show
- [ ] **Search Filter:**
  - [ ] Enter "Main Street" in search
  - [ ] Verify matching lessons display
- [ ] **Combined Filters:**
  - [ ] Apply status + date + search
  - [ ] Verify correct filtering
  - [ ] Click "Clear All Filters"
  - [ ] Verify all lessons return

### 2.2 Pagination

#### Test: Navigate Through Pages

- [ ] Set page size to 5 items
- [ ] Verify 5 lessons display
- [ ] Click "Next" button
- [ ] Verify next 5 lessons display
- [ ] Click page number directly
- [ ] Verify correct page loads
- [ ] Change page size to 25
- [ ] Verify pagination updates

## 3. API Integration Tests

### 3.1 Lessons API

#### Test: GET /api/v1/lessons

- [ ] Open Network tab in dev tools
- [ ] Refresh lessons page
- [ ] Verify GET request to /api/v1/lessons
- [ ] Check response status 200
- [ ] Verify response contains array of lessons

#### Test: POST /api/v1/lessons

- [ ] Start booking flow
- [ ] Complete all steps
- [ ] Monitor POST request on submission
- [ ] Verify request payload contains all fields
- [ ] Check response status 201
- [ ] Verify response contains new lesson ID

#### Test: PUT /api/v1/lessons/:id

- [ ] Cancel a lesson
- [ ] Monitor PUT request
- [ ] Verify status update in payload
- [ ] Check response status 200

### 3.2 Reference Data APIs

#### Test: Instructors & Services

- [ ] Navigate to booking form
- [ ] Monitor GET /api/v1/instructors
- [ ] Verify 5 instructors returned
- [ ] Monitor GET /api/v1/services
- [ ] Verify 5 services returned with pricing

## 4. Data Validation Tests

### 4.1 Form Validation

#### Test: Required Fields

- [ ] Try to proceed without selecting service
- [ ] Verify error message appears
- [ ] Try to proceed without instructor
- [ ] Verify validation prevents submission
- [ ] Try empty pickup address
- [ ] Verify field validation

#### Test: Date/Time Validation

- [ ] Try to select past date
- [ ] Verify past dates disabled
- [ ] Try time outside 9 AM - 5 PM
- [ ] Verify time constraints work
- [ ] Select date, then change service
- [ ] Verify end time recalculates

### 4.2 Edge Cases

#### Test: Special Characters

- [ ] Enter address with apostrophe: "O'Connor Street"
- [ ] Enter notes with quotes: "Need "extra" time"
- [ ] Verify data saves correctly
- [ ] Check display in dashboard

#### Test: Long Text Input

- [ ] Enter 500+ character note
- [ ] Verify text area expands
- [ ] Submit and verify saved correctly

## 5. Notification System Tests

### 5.1 Notification Types

#### Test: Success Notifications

- [ ] Complete a booking
- [ ] Verify green success notification
- [ ] Check auto-dismiss after ~5 seconds
- [ ] Verify message content accurate

#### Test: Error Notifications

- [ ] Trigger network error (disconnect internet)
- [ ] Try to load lessons
- [ ] Verify red error notification
- [ ] Check notification persists
- [ ] Verify close button works

#### Test: Info Notifications

- [ ] Click reschedule button
- [ ] Verify blue info notification
- [ ] Check message about future feature
- [ ] Test manual dismiss

### 5.2 Multiple Notifications

#### Test: Notification Stacking

- [ ] Trigger multiple actions quickly
- [ ] Verify notifications stack vertically
- [ ] Check each can be dismissed independently
- [ ] Verify proper spacing between notifications

## 6. Responsive Design Tests

### 6.1 Mobile View (< 640px)

#### Test: Mobile Layout

- [ ] Resize browser to 375px width (iPhone)
- [ ] **Homepage:**
  - [ ] Verify single column layout
  - [ ] Check navigation is mobile-friendly
  - [ ] Test touch targets are large enough
- [ ] **Booking Form:**
  - [ ] Verify form fields stack vertically
  - [ ] Test date/time pickers on mobile
  - [ ] Check buttons are full width
- [ ] **Lessons Dashboard:**
  - [ ] Verify cards stack vertically
  - [ ] Test horizontal scroll if needed
  - [ ] Check filter controls are accessible

### 6.2 Tablet View (640-1024px)

#### Test: Tablet Layout

- [ ] Resize to 768px width (iPad)
- [ ] Verify 2-column grid where appropriate
- [ ] Check navigation remains functional
- [ ] Test form layouts are optimized

### 6.3 Desktop View (> 1024px)

#### Test: Desktop Layout

- [ ] Full screen browser window
- [ ] Verify full feature layout
- [ ] Check all grids display correctly
- [ ] Test hover states work

## 7. Browser Compatibility Tests

### 7.1 Chrome (Latest)

- [ ] All features work correctly
- [ ] No console errors
- [ ] Smooth animations

### 7.2 Firefox (Latest)

- [ ] Date/time inputs work
- [ ] CSS displays correctly
- [ ] No functionality issues

### 7.3 Safari (Latest)

- [ ] Test on macOS
- [ ] Verify date picker compatibility
- [ ] Check form submissions

### 7.4 Edge (Latest)

- [ ] Basic functionality test
- [ ] Form validation works
- [ ] API calls successful

## 8. Performance Tests

### 8.1 Load Times

#### Test: Page Load Performance

- [ ] Clear browser cache
- [ ] **Homepage:** Should load < 2 seconds
- [ ] **Lessons Dashboard:** Should load < 3 seconds
- [ ] **Booking Form:** Should load < 2 seconds
- [ ] Open Network tab, check total load time

### 8.2 API Response Times

#### Test: API Performance

- [ ] Monitor API calls in Network tab
- [ ] GET lessons: Should respond < 500ms
- [ ] GET instructors: Should respond < 300ms
- [ ] GET services: Should respond < 300ms
- [ ] POST lesson: Should respond < 1 second

### 8.3 Large Dataset Handling

#### Test: Pagination Performance

- [ ] If available, load 100+ lessons
- [ ] Test filter performance
- [ ] Verify smooth scrolling
- [ ] Check memory usage in dev tools

## 9. Accessibility Tests

### 9.1 Keyboard Navigation

#### Test: Tab Navigation

- [ ] Start at homepage
- [ ] Use Tab key to navigate all links
- [ ] Verify focus indicators visible
- [ ] Test form navigation with keyboard
- [ ] Ensure all buttons accessible

### 9.2 Screen Reader Compatibility

#### Test: Basic Screen Reader Support

- [ ] Enable screen reader (VoiceOver/NVDA)
- [ ] Navigate through main content
- [ ] Verify form labels read correctly
- [ ] Check button purposes announced

### 9.3 Color Contrast

#### Test: WCAG Compliance

- [ ] Verify text has sufficient contrast
- [ ] Check button contrast ratios
- [ ] Ensure status badges are readable

## 10. Security Tests

### 10.1 Input Sanitization

#### Test: XSS Prevention

- [ ] Try entering `<script>alert('XSS')</script>` in notes
- [ ] Verify script doesn't execute
- [ ] Check data displays safely

### 10.2 Authentication

#### Test: Protected Routes

- [ ] Try accessing /lessons without login (if auth enabled)
- [ ] Verify redirect to login page
- [ ] Check session management

## 11. Integration Tests

### 11.1 Real-time Updates

#### Test: Live Data Updates

- [ ] Open lessons in two browser tabs
- [ ] Create lesson in one tab
- [ ] Verify appears in other tab (after polling interval)
- [ ] Check 30-second refresh cycle

### 11.2 State Management

#### Test: TanStack Query Cache

- [ ] Navigate between pages
- [ ] Return to previous page
- [ ] Verify data loads from cache (instant)
- [ ] Wait for background refetch

## 12. Regression Testing Checklist

### After Each Update

- [ ] All navigation links work
- [ ] Booking flow completes successfully
- [ ] Lessons dashboard loads
- [ ] Filters function correctly
- [ ] Notifications display properly
- [ ] No console errors
- [ ] API endpoints respond
- [ ] Mobile view works

## Bug Reporting Template

When issues are found, document using this format:

```markdown
**Issue:** [Brief description]

**Steps to Reproduce:**

1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Environment:**

- Browser: [Chrome/Firefox/Safari/Edge]
- Version: [Browser version]
- OS: [Windows/Mac/Linux]
- Viewport: [Desktop/Tablet/Mobile]
- Screen Size: [1920x1080, etc.]

**Screenshots:**
[Attach if applicable]

**Additional Notes:**
[Any other relevant information]

**Severity:** [Critical/High/Medium/Low]
```

## Test Execution Summary

### Quick Smoke Test (15 minutes)

1. Homepage loads
2. Book one lesson successfully
3. View lessons dashboard
4. Apply one filter
5. View lesson details
6. Cancel a lesson

### Full Test Suite (2-3 hours)

- Complete all test sections
- Document any issues found
- Verify fixes after updates

### Release Testing (4-5 hours)

- Full test suite
- Multiple browsers
- Mobile devices
- Performance testing
- Security validation

## Automation Candidates

Consider automating these tests in future:

- API endpoint testing
- Form validation
- Basic user flows
- Regression test suite
- Performance benchmarks

## Maintenance

This document should be updated when:

- New features are added
- UI/UX changes are made
- API contracts change
- New integrations added
- Bug patterns identified

---

_Last Updated: Current Sprint_
_Version: 1.0_
_DriveFlow Test Documentation_
