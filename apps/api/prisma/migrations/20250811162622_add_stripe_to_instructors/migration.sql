/*
  Warnings:

  - You are about to drop the column `kycStatus` on the `Instructor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Instructor" DROP COLUMN "kycStatus",
ADD COLUMN     "stripeCapabilities" JSONB,
ADD COLUMN     "stripeConnectedAt" TIMESTAMP(3),
ADD COLUMN     "stripeDisconnectedAt" TIMESTAMP(3),
ADD COLUMN     "stripeOnboardingStatus" TEXT NOT NULL DEFAULT 'not_started',
ADD COLUMN     "stripeRequirementsDue" JSONB;
