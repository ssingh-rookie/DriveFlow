import { Module } from "@nestjs/common";
import { PrismaModule } from "../../core/prisma/prisma.module";
import { PaymentsModule } from "../payments/payments.module";

import { LessonCronService } from "./cron.service";
import { LessonEventService } from "./event.service";
// Services
import { LessonsService } from "./lessons.service";

// Integration services (working implementations)
import { LessonNotificationService } from "./notification.service";

import { SimpleInstructorsController } from "./simple-instructors.controller";
// Simple controllers (MVP)
import { SimpleLessonController } from "./simple-lesson.controller";
import { SimpleServicesController } from "./simple-services.controller";

/**
 * Lessons Module
 * Complete lesson management system with CRUD operations, state management,
 * availability checking, notifications, and automated state transitions
 */
@Module({
  imports: [
    PrismaModule,
    PaymentsModule, // For payment integration
  ],
  controllers: [
    SimpleLessonController,
    SimpleInstructorsController,
    SimpleServicesController,
  ],
  providers: [
    // Core service
    LessonsService,

    // Integration services (complete implementation) - order matters for dependency injection
    LessonNotificationService, // First - no dependencies on other lesson services
    LessonEventService, // Second - depends on LessonNotificationService
    LessonCronService, // Third - depends on LessonEventService
  ],
  exports: [
    // Export working services for use in other modules
    LessonNotificationService,
    LessonEventService,
    LessonCronService,
  ],
})
export class LessonsModule {}
