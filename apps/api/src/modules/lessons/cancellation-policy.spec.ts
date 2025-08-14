import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

describe('CancellationPolicy Model', () => {
  let db: PrismaClient;
  let orgId: string;

  beforeAll(async () => {
    db = new PrismaClient();
    
    // Create a test org
    const org = await db.org.create({
      data: {
        name: 'Test Org',
        timeZone: 'Australia/Sydney'
      }
    });
    orgId = org.id;
  });

  afterEach(async () => {
    // Clean up policies after each test to avoid unique constraint conflicts
    await db.cancellationPolicy.deleteMany({ where: { orgId } });
  });

  afterAll(async () => {
    // Clean up test data
    await db.cancellationPolicy.deleteMany({ where: { orgId } });
    await db.org.delete({ where: { id: orgId } });
    await db.$disconnect();
  });

  describe('CRUD Operations', () => {
    it('should create a cancellation policy', async () => {
      const policy = await db.cancellationPolicy.create({
        data: {
          orgId,
          actor: 'student',
          hoursBeforeStart: 24,
          refundPercentage: 100,
          feeCents: 0,
          description: 'Test policy: 24+ hours = full refund'
        }
      });

      expect(policy).toMatchObject({
        orgId,
        actor: 'student',
        hoursBeforeStart: 24,
        refundPercentage: 100,
        feeCents: 0,
        isActive: true,
        description: 'Test policy: 24+ hours = full refund'
      });
      expect(policy.id).toBeDefined();
      expect(policy.createdAt).toBeDefined();
      expect(policy.updatedAt).toBeDefined();
    });

    it('should find policies by org and actor', async () => {
      // Create a test policy
      await db.cancellationPolicy.create({
        data: {
          orgId,
          actor: 'parent',
          hoursBeforeStart: 12,
          refundPercentage: 75,
          feeCents: 500,
          description: 'Test parent policy'
        }
      });

      const policies = await db.cancellationPolicy.findMany({
        where: {
          orgId,
          actor: 'parent',
          isActive: true
        },
        orderBy: { hoursBeforeStart: 'desc' }
      });

      expect(policies).toHaveLength(1);
      expect(policies[0].actor).toBe('parent');
      expect(policies[0].hoursBeforeStart).toBe(12);
      expect(policies[0].refundPercentage).toBe(75);
    });

    it('should enforce unique constraint on orgId, actor, hoursBeforeStart', async () => {
      // Create first policy
      await db.cancellationPolicy.create({
        data: {
          orgId,
          actor: 'instructor',
          hoursBeforeStart: 6,
          refundPercentage: 100,
          feeCents: 0
        }
      });

      // Try to create duplicate policy - should fail
      await expect(
        db.cancellationPolicy.create({
          data: {
            orgId,
            actor: 'instructor',
            hoursBeforeStart: 6, // Same combination
            refundPercentage: 50,
            feeCents: 1000
          }
        })
      ).rejects.toThrow(/Unique constraint failed/);
    });

    it('should allow same actor with different hours', async () => {
      const policy1 = await db.cancellationPolicy.create({
        data: {
          orgId,
          actor: 'admin',
          hoursBeforeStart: 48,
          refundPercentage: 100,
          feeCents: 0
        }
      });

      const policy2 = await db.cancellationPolicy.create({
        data: {
          orgId,
          actor: 'admin',
          hoursBeforeStart: 2, // Different hours
          refundPercentage: 50,
          feeCents: 2500
        }
      });

      expect(policy1.id).not.toBe(policy2.id);
      expect(policy1.hoursBeforeStart).toBe(48);
      expect(policy2.hoursBeforeStart).toBe(2);
    });

    it('should cascade delete when org is deleted', async () => {
      // Create a separate org for this test
      const testOrg = await db.org.create({
        data: {
          name: 'Cascade Test Org',
          timeZone: 'Australia/Sydney'
        }
      });

      // Create a policy for this org
      const policy = await db.cancellationPolicy.create({
        data: {
          orgId: testOrg.id,
          actor: 'student',
          hoursBeforeStart: 24,
          refundPercentage: 100,
          feeCents: 0
        }
      });

      // Delete the org
      await db.org.delete({ where: { id: testOrg.id } });

      // Policy should be deleted automatically
      const deletedPolicy = await db.cancellationPolicy.findUnique({
        where: { id: policy.id }
      });
      
      expect(deletedPolicy).toBeNull();
    });
  });

  describe('Business Logic Validation', () => {
    it('should handle policy lookup for cancellation calculation', async () => {
      // Create policies for different scenarios
      const policies = [
        {
          actor: 'student' as const,
          hoursBeforeStart: 24,
          refundPercentage: 100,
          feeCents: 0,
          description: '24+ hours = full refund'
        },
        {
          actor: 'student' as const,
          hoursBeforeStart: 2,
          refundPercentage: 50,
          feeCents: 0,
          description: '2-24 hours = 50% refund'
        },
        {
          actor: 'student' as const,
          hoursBeforeStart: 0,
          refundPercentage: 0,
          feeCents: 0,
          description: '<2 hours = no refund'
        }
      ];

      for (const policy of policies) {
        await db.cancellationPolicy.create({
          data: { orgId, ...policy }
        });
      }

      // Test policy lookup based on hours before start
      const applicablePolicies = await db.cancellationPolicy.findMany({
        where: {
          orgId,
          actor: 'student',
          hoursBeforeStart: { lte: 25 }, // 25 hours before
          isActive: true
        },
        orderBy: { hoursBeforeStart: 'desc' }
      });

      // Should find the 24-hour policy as the most generous applicable policy
      expect(applicablePolicies).toHaveLength(3);
      expect(applicablePolicies[0].hoursBeforeStart).toBe(24);
      expect(applicablePolicies[0].refundPercentage).toBe(100);
    });
  });
});