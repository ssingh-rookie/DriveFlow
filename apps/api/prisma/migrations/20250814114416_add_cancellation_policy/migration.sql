-- CreateEnum
CREATE TYPE "CancellationActor" AS ENUM ('student', 'parent', 'instructor', 'admin');

-- CreateTable
CREATE TABLE "CancellationPolicy" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actor" "CancellationActor" NOT NULL,
    "hoursBeforeStart" INTEGER NOT NULL,
    "refundPercentage" INTEGER NOT NULL DEFAULT 100,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancellationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CancellationPolicy_orgId_actor_isActive_idx" ON "CancellationPolicy"("orgId", "actor", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CancellationPolicy_orgId_actor_hoursBeforeStart_key" ON "CancellationPolicy"("orgId", "actor", "hoursBeforeStart");

-- AddForeignKey
ALTER TABLE "CancellationPolicy" ADD CONSTRAINT "CancellationPolicy_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
