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
