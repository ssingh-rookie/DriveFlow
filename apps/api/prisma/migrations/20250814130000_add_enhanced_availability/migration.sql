-- CreateTable - InstructorWorkingHours
CREATE TABLE "InstructorWorkingHours" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakStartTime" TEXT,
    "breakEndTime" TEXT,
    "maxLessonsPerDay" INTEGER,
    "travelBufferMin" INTEGER NOT NULL DEFAULT 15,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorWorkingHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable - TravelTimeCache
CREATE TABLE "TravelTimeCache" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fromLocationHash" TEXT NOT NULL,
    "toLocationHash" TEXT NOT NULL,
    "fromLat" DECIMAL(9,6) NOT NULL,
    "fromLng" DECIMAL(9,6) NOT NULL,
    "toLat" DECIMAL(9,6) NOT NULL,
    "toLng" DECIMAL(9,6) NOT NULL,
    "drivingTimeMin" INTEGER NOT NULL,
    "trafficMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "distanceMeters" INTEGER NOT NULL,
    "peakHourMultiplier" DECIMAL(3,2) NOT NULL DEFAULT 1.2,
    "timeOfDayFactors" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cacheValidUntil" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'google_maps',
    "reliability" TEXT NOT NULL DEFAULT 'high',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelTimeCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable - LicenseCompatibilityMatrix
CREATE TABLE "LicenseCompatibilityMatrix" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "studentLicenseType" TEXT NOT NULL,
    "lessonType" TEXT NOT NULL,
    "instructorLicenseReq" TEXT NOT NULL,
    "isCompatible" BOOLEAN NOT NULL,
    "minStudentAge" INTEGER,
    "maxStudentAge" INTEGER,
    "prerequisites" JSONB,
    "restrictions" JSONB,
    "minLessonDuration" INTEGER,
    "maxLessonDuration" INTEGER,
    "requiresParentalConsent" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseCompatibilityMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex - InstructorWorkingHours
CREATE UNIQUE INDEX "InstructorWorkingHours_orgId_instructorId_dayOfWeek_effectiveFrom_key" ON "InstructorWorkingHours"("orgId", "instructorId", "dayOfWeek", "effectiveFrom");

CREATE INDEX "InstructorWorkingHours_instructorId_dayOfWeek_isActive_idx" ON "InstructorWorkingHours"("instructorId", "dayOfWeek", "isActive");

CREATE INDEX "InstructorWorkingHours_orgId_isActive_idx" ON "InstructorWorkingHours"("orgId", "isActive");

-- CreateIndex - TravelTimeCache
CREATE UNIQUE INDEX "TravelTimeCache_orgId_fromLocationHash_toLocationHash_key" ON "TravelTimeCache"("orgId", "fromLocationHash", "toLocationHash");

CREATE INDEX "TravelTimeCache_orgId_cacheValidUntil_idx" ON "TravelTimeCache"("orgId", "cacheValidUntil");

CREATE INDEX "TravelTimeCache_fromLocationHash_toLocationHash_idx" ON "TravelTimeCache"("fromLocationHash", "toLocationHash");

-- CreateIndex - LicenseCompatibilityMatrix
CREATE UNIQUE INDEX "LicenseCompatibilityMatrix_orgId_studentLicenseType_lessonType_key" ON "LicenseCompatibilityMatrix"("orgId", "studentLicenseType", "lessonType");

CREATE INDEX "LicenseCompatibilityMatrix_orgId_isActive_idx" ON "LicenseCompatibilityMatrix"("orgId", "isActive");

CREATE INDEX "LicenseCompatibilityMatrix_studentLicenseType_lessonType_idx" ON "LicenseCompatibilityMatrix"("studentLicenseType", "lessonType");

-- AddForeignKey - InstructorWorkingHours
ALTER TABLE "InstructorWorkingHours" ADD CONSTRAINT "InstructorWorkingHours_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InstructorWorkingHours" ADD CONSTRAINT "InstructorWorkingHours_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey - TravelTimeCache
ALTER TABLE "TravelTimeCache" ADD CONSTRAINT "TravelTimeCache_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey - LicenseCompatibilityMatrix
ALTER TABLE "LicenseCompatibilityMatrix" ADD CONSTRAINT "LicenseCompatibilityMatrix_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;