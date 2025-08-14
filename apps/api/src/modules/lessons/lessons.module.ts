import { Module } from '@nestjs/common'
import { PrismaModule } from '../../core/prisma/prisma.module'
import { PaymentsModule } from '../payments/payments.module'

// Simple lesson controller (MVP)
import { SimpleLessonController } from './simple-lesson.controller'

// Integration services (working implementations)
import { LessonNotificationService } from './notification.service'
import { LessonEventService } from './event.service'
import { LessonCronService } from './cron.service'

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
  ],
  providers: [
    // Integration services (complete implementation) - order matters for dependency injection
    LessonNotificationService, // First - no dependencies on other lesson services
    LessonEventService,        // Second - depends on LessonNotificationService
    LessonCronService,         // Third - depends on LessonEventService
  ],
  exports: [
    // Export working services for use in other modules
    LessonNotificationService,
    LessonEventService,
    LessonCronService,
  ],
})
export class LessonsModule {}