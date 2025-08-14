-- AlterEnum - Add new states to BookingStatus
ALTER TYPE "BookingStatus" ADD VALUE 'draft';
ALTER TYPE "BookingStatus" ADD VALUE 'pending_payment';
ALTER TYPE "BookingStatus" ADD VALUE 'scheduled';

-- CreateTable - LessonStateHistory
CREATE TABLE "LessonStateHistory" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "actorUserId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonStateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable - ScheduledStateTransition
CREATE TABLE "ScheduledStateTransition" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "toStatus" "BookingStatus" NOT NULL,
    "executeAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledStateTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable - StateTransitionRule
CREATE TABLE "StateTransitionRule" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fromStatus" "BookingStatus",
    "toStatus" "BookingStatus" NOT NULL,
    "requiredRole" "OrgRole",
    "conditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StateTransitionRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonStateHistory_orgId_bookingId_idx" ON "LessonStateHistory"("orgId", "bookingId");

-- CreateIndex
CREATE INDEX "LessonStateHistory_bookingId_createdAt_idx" ON "LessonStateHistory"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "LessonStateHistory_toStatus_createdAt_idx" ON "LessonStateHistory"("toStatus", "createdAt");

-- CreateIndex
CREATE INDEX "ScheduledStateTransition_executeAt_processedAt_idx" ON "ScheduledStateTransition"("executeAt", "processedAt");

-- CreateIndex
CREATE INDEX "ScheduledStateTransition_orgId_processedAt_idx" ON "ScheduledStateTransition"("orgId", "processedAt");

-- CreateIndex
CREATE INDEX "ScheduledStateTransition_bookingId_idx" ON "ScheduledStateTransition"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "StateTransitionRule_orgId_fromStatus_toStatus_requiredRole_key" ON "StateTransitionRule"("orgId", "fromStatus", "toStatus", "requiredRole");

-- CreateIndex
CREATE INDEX "StateTransitionRule_orgId_isActive_idx" ON "StateTransitionRule"("orgId", "isActive");

-- AddForeignKey - LessonStateHistory
ALTER TABLE "LessonStateHistory" ADD CONSTRAINT "LessonStateHistory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LessonStateHistory" ADD CONSTRAINT "LessonStateHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LessonStateHistory" ADD CONSTRAINT "LessonStateHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey - ScheduledStateTransition
ALTER TABLE "ScheduledStateTransition" ADD CONSTRAINT "ScheduledStateTransition_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduledStateTransition" ADD CONSTRAINT "ScheduledStateTransition_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey - StateTransitionRule
ALTER TABLE "StateTransitionRule" ADD CONSTRAINT "StateTransitionRule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;