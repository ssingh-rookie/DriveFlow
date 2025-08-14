import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo driving school
  const org = await db.org.create({ 
    data: { 
      name: 'Demo Driving School',
      abn: 'ABN12345678901',
      timeZone: 'Australia/Sydney'
    }
  });

  // Create demo owner user
  const owner = await db.user.create({
    data: { 
      email: 'owner@demo.com', 
      fullName: 'Demo Owner',
      phone: '+61412345678'
    }
  });

  // Link owner to org
  await db.userOrg.create({
    data: { 
      userId: owner.id, 
      orgId: org.id, 
      role: 'owner' 
    }
  });

  // Create demo instructor
  const instructor = await db.instructor.create({
    data: { 
      orgId: org.id, 
      displayName: 'Casey Instructor',
      phone: '+61423456789',
      licenseId: 'DL123456789',
      active: true 
    }
  });

  // Create demo student
  const student = await db.student.create({
    data: { 
      orgId: org.id, 
      fullName: 'Alex Student',
      phone: '+61434567890',
      email: 'alex@example.com',
      dob: new Date('2000-01-01')
    }
  });

  // Create guardian for student
  const guardian = await db.guardian.create({
    data: {
      fullName: 'Parent Guardian',
      phone: '+61445678901',
      email: 'parent@example.com'
    }
  });

  await db.studentGuardian.create({
    data: {
      studentId: student.id,
      guardianId: guardian.id,
      relation: 'Parent'
    }
  });

  // Create demo service
  const service = await db.service.create({
    data: { 
      orgId: org.id, 
      name: '60-min Lesson', 
      description: 'Standard 60-minute driving lesson',
      durationMin: 60 
    }
  });

  // Create default rate card
  const rate = await db.rateCard.create({
    data: { 
      orgId: org.id, 
      name: 'Default 2025', 
      isDefault: true, 
      currency: 'AUD',
      validFrom: new Date('2025-01-01')
    }
  });

  // Add pricing for the service
  await db.rateCardItem.create({
    data: { 
      rateCardId: rate.id, 
      serviceId: service.id, 
      priceCents: 9500  // $95.00
    }
  });

  // Add instructor availability (Monday to Friday, 9 AM to 5 PM)
  for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
    await db.instructorAvailability.create({
      data: {
        orgId: org.id,
        instructorId: instructor.id,
        dayOfWeek,
        startMinute: 9 * 60, // 9 AM
        endMinute: 17 * 60,  // 5 PM
        effectiveFrom: new Date('2025-01-01')
      }
    });
  }

  // Add default cancellation policies
  const cancellationPolicies = [
    {
      actor: 'student' as const,
      hoursBeforeStart: 24,
      refundPercentage: 100,
      feeCents: 0,
      description: 'Students: 24+ hours before = full refund'
    },
    {
      actor: 'student' as const,
      hoursBeforeStart: 2,
      refundPercentage: 50,
      feeCents: 0,
      description: 'Students: 2-24 hours before = 50% refund'
    },
    {
      actor: 'student' as const,
      hoursBeforeStart: 0,
      refundPercentage: 0,
      feeCents: 0,
      description: 'Students: <2 hours before = no refund'
    },
    {
      actor: 'parent' as const,
      hoursBeforeStart: 24,
      refundPercentage: 100,
      feeCents: 0,
      description: 'Parents: 24+ hours before = full refund'
    },
    {
      actor: 'parent' as const,
      hoursBeforeStart: 2,
      refundPercentage: 50,
      feeCents: 0,
      description: 'Parents: 2-24 hours before = 50% refund'
    },
    {
      actor: 'instructor' as const,
      hoursBeforeStart: 0,
      refundPercentage: 100,
      feeCents: 0,
      description: 'Instructors: full refund anytime + priority rebooking'
    },
    {
      actor: 'admin' as const,
      hoursBeforeStart: 0,
      refundPercentage: 100,
      feeCents: 0,
      description: 'Admin: override any policy with reason'
    }
  ];

  for (const policy of cancellationPolicies) {
    await db.cancellationPolicy.create({
      data: {
        orgId: org.id,
        ...policy
      }
    });
  }

  // Add default state transition rules
  const stateTransitionRules = [
    // Student transitions
    {
      fromStatus: 'draft' as const,
      toStatus: 'pending_payment' as const,
      requiredRole: 'student' as const,
      description: 'Students can submit payment for draft bookings'
    },
    {
      fromStatus: 'confirmed' as const,
      toStatus: 'cancelled' as const,
      requiredRole: 'student' as const,
      description: 'Students can cancel confirmed bookings (with policy restrictions)',
      conditions: { applyCancellationPolicy: true }
    },
    // Instructor transitions
    {
      fromStatus: 'confirmed' as const,
      toStatus: 'in_progress' as const,
      requiredRole: 'instructor' as const,
      description: 'Instructors can start confirmed lessons'
    },
    {
      fromStatus: 'in_progress' as const,
      toStatus: 'completed' as const,
      requiredRole: 'instructor' as const,
      description: 'Instructors can complete in-progress lessons'
    },
    {
      fromStatus: 'confirmed' as const,
      toStatus: 'cancelled' as const,
      requiredRole: 'instructor' as const,
      description: 'Instructors can cancel with full refund'
    },
    // Admin/Owner transitions (can do anything)
    {
      fromStatus: null,
      toStatus: 'cancelled' as const,
      requiredRole: 'admin' as const,
      description: 'Admins can cancel any booking'
    },
    {
      fromStatus: null,
      toStatus: 'confirmed' as const,
      requiredRole: 'owner' as const,
      description: 'Owners can directly confirm any booking'
    },
    // System transitions
    {
      fromStatus: 'pending_payment' as const,
      toStatus: 'cancelled' as const,
      requiredRole: null,
      description: 'System auto-cancel after payment timeout',
      conditions: { systemTransition: true, timeoutMinutes: 30 }
    },
    {
      fromStatus: 'confirmed' as const,
      toStatus: 'no_show' as const,
      requiredRole: null,
      description: 'System auto-detect NoShow after grace period',
      conditions: { systemTransition: true, graceMinutes: 15 }
    }
  ];

  for (const rule of stateTransitionRules) {
    await db.stateTransitionRule.create({
      data: {
        orgId: org.id,
        ...rule
      }
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log({ 
    org: org.name, 
    owner: owner.email, 
    instructor: instructor.displayName, 
    student: student.fullName,
    service: service.name,
    rateCard: rate.name 
  });
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
