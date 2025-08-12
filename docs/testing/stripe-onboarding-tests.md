# Stripe Onboarding Test Suite Documentation

## Overview

This document outlines the comprehensive test coverage for the DriveFlow Stripe onboarding feature, including unit tests, integration tests, and end-to-end tests.

## Test Architecture

### 1. Unit Tests - React Component (`StripeOnboarding.test.tsx`)

**Location**: `apps/web/src/components/instructors/StripeOnboarding.test.tsx`

**Purpose**: Test React component behavior in isolation with mocked API calls.

**Coverage**:

- ✅ Loading state rendering
- ✅ API data fetching and display
- ✅ Connect button functionality
- ✅ User interaction handling (confirm/alert dialogs)
- ✅ Error handling (network errors, HTTP errors)
- ✅ Complete status rendering
- ✅ Stripe return URL handling
- ✅ URL parameter cleanup

**Key Features**:

- Uses `@testing-library/react` for component testing
- Mocks global `fetch` for API isolation
- Tests user interaction flows with `fireEvent`
- Validates error states and edge cases

### 2. Integration Tests - API Server (`working-api.integration.test.js`)

**Location**: `apps/api/src/__tests__/working-api.integration.test.js`

**Purpose**: Test the working HTTP API server with real HTTP requests.

**Coverage**:

- ✅ Health check endpoint (`GET /api/health`)
- ✅ Payout readiness endpoint (`GET /api/payments/instructors/:id/payout-readiness`)
- ✅ Stripe connect link endpoint (`GET /api/payments/instructors/:id/stripe/connect-link`)
- ✅ CORS headers validation
- ✅ Error handling (404, malformed IDs)
- ✅ Response format validation (JSON, headers)

**Key Features**:

- Spawns real server process using `child_process.spawn`
- Tests actual HTTP endpoints with `fetch`
- Validates CORS configuration
- Tests error scenarios and edge cases

### 3. End-to-End Tests - Full Flow (`StripeOnboarding.e2e.test.tsx`)

**Location**: `apps/web/src/components/instructors/__tests__/StripeOnboarding.e2e.test.tsx`

**Purpose**: Test complete integration between React component and API server.

**Coverage**:

- ✅ Complete onboarding flow (load → connect → simulate success)
- ✅ Stripe return URL flow with parameter handling
- ✅ Real API integration (component ↔ server)
- ✅ Network error handling with real server shutdown
- ✅ API response format validation
- ✅ Full simulation workflow testing

**Key Features**:

- Combines React Testing Library with real server
- Tests actual network communication
- Simulates real user workflows
- Validates error recovery scenarios

## Test Setup and Configuration

### Prerequisites

- Node.js 18+ installed
- Jest testing framework
- React Testing Library
- Working API server (`working-api.js`)

### Running Tests

#### Frontend Unit Tests

```bash
cd apps/web
npm test StripeOnboarding.test.tsx
```

#### API Integration Tests

```bash
cd apps/api
npm test working-api.integration.test.js
```

#### End-to-End Tests

```bash
cd apps/web
npm test StripeOnboarding.e2e.test.tsx
```

#### All Tests

```bash
# From project root
npm run test
```

### Test Environment Setup

#### Global Mocks (Unit Tests)

```javascript
// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock browser APIs
const confirmSpy = jest.spyOn(window, "confirm");
const alertSpy = jest.spyOn(window, "alert");
```

#### Server Process Management (Integration/E2E)

```javascript
// Start server for testing
const serverProcess = spawn("node", [serverPath], {
  stdio: "pipe",
  env: { ...process.env, NODE_ENV: "test" },
});

// Cleanup
afterAll(async () => {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }
});
```

## Test Coverage Summary

### API Endpoints Coverage

| Endpoint                                                | Unit Test   | Integration Test | E2E Test |
| ------------------------------------------------------- | ----------- | ---------------- | -------- |
| `GET /api/health`                                       | ❌          | ✅               | ✅       |
| `GET /api/payments/instructors/:id/payout-readiness`    | ✅ (mocked) | ✅               | ✅       |
| `GET /api/payments/instructors/:id/stripe/connect-link` | ✅ (mocked) | ✅               | ✅       |

### UI Component Coverage

| Feature             | Unit Test | E2E Test |
| ------------------- | --------- | -------- |
| Loading state       | ✅        | ✅       |
| Status display      | ✅        | ✅       |
| Connect button      | ✅        | ✅       |
| Confirmation dialog | ✅        | ✅       |
| Success simulation  | ✅        | ✅       |
| Error handling      | ✅        | ✅       |
| Stripe return flow  | ✅        | ✅       |
| URL cleanup         | ✅        | ✅       |

### Error Scenarios Coverage

| Error Type             | Unit Test | Integration Test | E2E Test |
| ---------------------- | --------- | ---------------- | -------- |
| Network errors         | ✅        | ❌               | ✅       |
| HTTP 404 errors        | ✅        | ✅               | ❌       |
| Server unavailable     | ❌        | ❌               | ✅       |
| Malformed responses    | ✅        | ✅               | ❌       |
| Invalid instructor IDs | ✅        | ✅               | ❌       |

## Current Implementation Status

### ✅ Working Features

- **API Server**: Fully functional HTTP server with all endpoints
- **Frontend Component**: Complete React component with real API integration
- **Test Suite**: Comprehensive unit, integration, and E2E tests
- **Documentation**: Complete test documentation and setup guides

### ⚠️ Known Limitations

- **NestJS Issues**: Original NestJS implementation has dependency conflicts
- **Mock Data**: API returns simulated data (not real Stripe integration)
- **Demo Mode**: Frontend shows confirmation dialog instead of real Stripe redirect

### 🧪 Test Environment Notes

- Tests use `NODE_ENV=test` for server processes
- API server runs on `localhost:3001` during tests
- Frontend tests mock browser APIs (`confirm`, `alert`, `fetch`)
- Integration tests spawn real server processes

## Troubleshooting

### Common Test Issues

#### Server Startup Timeout

```javascript
// Increase timeout if tests fail due to slow server startup
const timeout = setTimeout(() => {
  reject(new Error("Server startup timeout"));
}, 15000); // Increased from 10s to 15s
```

#### Port Already in Use

```bash
# Kill existing server processes
lsof -ti:3001 | xargs kill -9
```

#### Mock Cleanup Issues

```javascript
// Ensure proper cleanup between tests
beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
```

### Test Debugging

#### Enable Verbose Output

```bash
npm test -- --verbose
```

#### Server Process Debugging

```javascript
serverProcess.stdout.on("data", (data) => {
  console.log("Server stdout:", data.toString());
});
serverProcess.stderr.on("data", (data) => {
  console.error("Server stderr:", data.toString());
});
```

## Future Improvements

1. **Real Stripe Integration**: Replace mock responses with Stripe test environment
2. **Visual Regression Tests**: Add screenshot testing for UI components
3. **Performance Tests**: Add load testing for API endpoints
4. **Accessibility Tests**: Add a11y testing with jest-axe
5. **CI Integration**: Add automated test runs in GitHub Actions

## Related Documentation

- [Stripe Onboarding Implementation](../stripe-onboarding/README.md)
- [API Architecture](../api/README.md)
- [Frontend Components](../web/components.md)
- [Working API Server](../api/working-api.md)
