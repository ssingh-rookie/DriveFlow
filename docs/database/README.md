# DriveFlow Database Documentation

This directory contains comprehensive documentation for the DriveFlow database schema, designed for driving school CRM operations.

## 📚 Documentation Index

- **[Schema Overview](./schema-overview.md)** - High-level architecture and design principles
- **[Entity Relationships](./entity-relationships.md)** - Complete ERD and relationship mappings
- **[Domain Models](./domain-models.md)** - Detailed breakdown by business domain
- **[API Patterns](./api-patterns.md)** - Database access patterns and best practices
- **[Migration Guide](./migration-guide.md)** - Step-by-step database setup
- **[Performance Guide](./performance-guide.md)** - Indexing, optimization, and scaling

## 🏗️ Quick Architecture Overview

DriveFlow uses a **multi-tenant PostgreSQL database** with the following key characteristics:

### **Core Principles**
- **Multi-tenancy**: All data scoped by `orgId` for driving school isolation
- **Contract-first**: Database types generated via Prisma → TypeScript
- **Event-driven**: Outbox pattern for reliable event processing
- **Audit-ready**: Complete change tracking for compliance

### **Technology Stack**
- **Database**: PostgreSQL with PostGIS readiness
- **ORM**: Prisma for type-safe database access
- **Schema**: 20+ models covering complete driving school operations
- **Migrations**: Version-controlled schema evolution

### **Business Domains**
1. **Identity & Access** - Multi-org user management with RBAC
2. **People Management** - Students, instructors, guardians
3. **Catalog & Pricing** - Services and flexible rate cards
4. **Scheduling** - Availability patterns and booking management
5. **Lesson Execution** - Real-time tracking and GPS data
6. **Financial Operations** - Stripe payments and instructor payouts
7. **Communication** - Email/SMS logging and delivery tracking
8. **Compliance** - Audit trails and webhook processing

## 🚀 Getting Started

1. **Set up database**: Follow the [Migration Guide](./migration-guide.md)
2. **Understand the schema**: Review [Schema Overview](./schema-overview.md)
3. **Explore relationships**: Check [Entity Relationships](./entity-relationships.md)
4. **Implementation patterns**: See [API Patterns](./api-patterns.md)

## 🔗 Quick Links

- [Prisma Schema](../../apps/api/prisma/schema.prisma) - Source of truth
- [Seed Data](../../apps/api/prisma/seed.ts) - Development data setup
- [Schema Steps Guide](../../DRIVEFLOW_DB_SCHEMA_STEPS.md) - Implementation walkthrough
