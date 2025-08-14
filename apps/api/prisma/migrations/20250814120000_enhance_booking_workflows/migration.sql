-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "previousStatus" "BookingStatus",
ADD COLUMN     "rescheduleReason" TEXT,
ADD COLUMN     "rescheduledAt" TIMESTAMP(3),
ADD COLUMN     "rescheduledFrom" TIMESTAMP(3),
ADD COLUMN     "statusChangedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "statusChangedBy" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_idempotencyKey_key" ON "Booking"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Booking_status_statusChangedAt_idx" ON "Booking"("status", "statusChangedAt");

-- CreateIndex
CREATE INDEX "Booking_orgId_status_idx" ON "Booking"("orgId", "status");

-- CreateIndex
CREATE INDEX "Booking_cancelledBy_idx" ON "Booking"("cancelledBy");

-- CreateIndex
CREATE INDEX "Booking_statusChangedBy_idx" ON "Booking"("statusChangedBy");