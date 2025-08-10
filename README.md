# DriveFlow

> An AI-first CRM platform for driving school instructors built with contract-first architecture

DriveFlow is a modern, scalable CRM system designed specifically for driving schools. It features a robust monorepo architecture with type-safe contracts, real-time features, and mobile-first design.

## 🏗️ Architecture

- **Contract-First**: All types generated from Zod schemas → OpenAPI → TypeScript types
- **Monorepo**: Turborepo with pnpm workspaces
- **Backend**: NestJS with clean architecture (controllers → services → repositories)
- **Frontend**: Next.js web + Expo mobile apps
- **Database**: Prisma ORM with PostgreSQL
- **Real-time**: Socket.IO for live updates
- **Background Jobs**: BullMQ for async processing
- **Type Safety**: End-to-end type safety from DB to UI

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm 9+
- PostgreSQL (for development)

### Setup

```bash
# Clone and install
git clone <your-repo>
cd driveflow
pnpm install

# Generate types from contracts
pnpm gen

# Start development
pnpm dev
```

## 📁 Project Structure

```
driveflow/
├── apps/
│   ├── api/           # NestJS API server
│   ├── worker/        # Background job processor
│   ├── web/           # Next.js web app
│   └── mobile/        # Expo mobile app
├── packages/
│   ├── contracts/     # Zod schemas & OpenAPI generation
│   ├── clients/       # Typed HTTP client
│   ├── ui/            # Shared React components
│   └── testing/       # Test utilities
├── scripts/           # Build and generation scripts
├── prompts/           # AI assistant prompts
└── .cursor/           # Cursor/Claude working rules
```

## 🔧 Development Commands

```bash
# Development
pnpm dev              # Start all apps in development mode
pnpm dev --filter=api # Start only the API

# Type generation (run after contract changes)
pnpm gen              # Generate OpenAPI spec + client types

# Quality checks
pnpm check            # Run lint, typecheck, and tests
pnpm lint             # Lint all packages
pnpm typecheck        # TypeScript checks
pnpm test             # Run unit tests

# Database
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:migrate:dev # Apply database migrations

# Build
pnpm build            # Build all packages for production
```

## 🎯 Core Domains

### **Users & Authentication**
- Multi-role system: Owner, Admin, Instructor, Student
- RBAC with NestJS guards
- Session management

### **Lesson Management**
- Booking system with calendar integration
- Real-time lesson tracking with GPS
- Progress notes and assessments

### **Student Progress**
- Learning pathway tracking
- Test results (theory + practical)
- Digital logbook

### **Vehicle Management**
- Fleet tracking and maintenance
- Availability scheduling
- Insurance and compliance

### **Payments**
- Stripe integration for lesson payments
- Subscription management for instructors
- Automated invoicing

## 🔐 Security & Compliance

- **Data Residency**: Australian data centers
- **Privacy**: GDPR/Privacy Act compliant
- **Location Tracking**: Explicit consent with persistent indicators
- **Payment Security**: PCI DSS compliant via Stripe

## 🚀 Deployment

The application is designed for deployment on:
- **API/Worker**: Railway, Render, or AWS ECS
- **Web**: Vercel or Netlify
- **Mobile**: Expo EAS Build + App Store/Play Store
- **Database**: Railway PostgreSQL or AWS RDS

## 🤖 AI-First Development

This project uses Cursor + Claude for development with:
- **Architectural rules** enforced via `.cursor/rules`
- **Module scaffolding** via prompt templates
- **Type-safe contracts** preventing drift
- **Automated testing** requirements

## 📝 Contributing

1. Follow the architectural rules in `.cursor/rules`
2. Always update contracts first (`packages/contracts`)
3. Run `pnpm gen` after contract changes
4. Write tests for new features
5. Ensure `pnpm check` passes

## 🛠️ Technology Stack

### **Backend**
- NestJS (Framework)
- Prisma (ORM)
- PostgreSQL (Database)
- BullMQ (Job Queue)
- Socket.IO (Real-time)

### **Frontend**
- Next.js (Web)
- Expo (Mobile)
- TanStack Query (Data fetching)
- React Hook Form (Forms)
- Tailwind CSS (Styling)

### **DevOps**
- Turborepo (Monorepo)
- pnpm (Package manager)
- ESLint + Prettier (Code quality)
- Jest (Testing)
- Husky (Git hooks)

### **Integration**
- Stripe (Payments)
- Postmark (Email)
- Twilio (SMS)
- Google Maps (Location)

---

**Built with ❤️ for driving schools worldwide**
