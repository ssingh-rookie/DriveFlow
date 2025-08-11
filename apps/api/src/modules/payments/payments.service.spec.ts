import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repo';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { NotFoundException } from '@nestjs/common';
import { Instructor, User } from '@prisma/client';

type InstructorWithUser = Instructor & { user: User };

describe('PaymentsService', () => {
  let service: PaymentsService;
  let repo: PaymentsRepository;
  let stripe: Stripe;

  const mockRepo = {
    getInstructor: jest.fn(),
    updateInstructorStripeAccountId: jest.fn(),
  };

  const mockStripe = {
    accounts: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    accountLinks: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: mockRepo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: Stripe, useValue: mockStripe },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    repo = module.get<PaymentsRepository>(PaymentsRepository);
    stripe = module.get<Stripe>(Stripe);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ensureExpressAccountAndLink', () => {
    const instructorId = 'inst_123';
    const orgId = 1;
    const mockUser = { id: 'user_123', fullName: 'John Doe', email: 'john@doe.com' } as User;
    const mockInstructor = { id: instructorId, orgId: orgId.toString(), user: mockUser } as InstructorWithUser;

    it('should throw NotFoundException if instructor is not found', async () => {
      mockRepo.getInstructor.mockResolvedValue(null);
      await expect(service.ensureExpressAccountAndLink(instructorId, orgId)).rejects.toThrow(NotFoundException);
    });

    it('should create a new Stripe account if one does not exist', async () => {
      const newStripeAccount = { id: 'acct_new' };
      const newOnboardingLink = { url: 'https://stripe.com/onboard/new' };
      
      mockRepo.getInstructor.mockResolvedValue({ ...mockInstructor, stripeAccountId: null });
      mockStripe.accounts.create.mockResolvedValue(newStripeAccount);
      mockStripe.accountLinks.create.mockResolvedValue(newOnboardingLink);

      const result = await service.ensureExpressAccountAndLink(instructorId, orgId);

      expect(mockStripe.accounts.create).toHaveBeenCalled();
      expect(mockRepo.updateInstructorStripeAccountId).toHaveBeenCalledWith(instructorId, newStripeAccount.id);
      expect(result.onboardingLink).toBe(newOnboardingLink.url);
    });

    it('should not create a new Stripe account if one already exists', async () => {
        const existingStripeAccountId = 'acct_existing';
        const newOnboardingLink = { url: 'https://stripe.com/onboard/existing' };

        mockRepo.getInstructor.mockResolvedValue({ ...mockInstructor, stripeAccountId: existingStripeAccountId });
        mockStripe.accountLinks.create.mockResolvedValue(newOnboardingLink);

        const result = await service.ensureExpressAccountAndLink(instructorId, orgId);

        expect(mockStripe.accounts.create).not.toHaveBeenCalled();
        expect(result.onboardingLink).toBe(newOnboardingLink.url);
    });
  });

  describe('getStripeAccountStatus', () => {
    const instructorId = 'inst_123';
    const orgId = 1;

    it("should return 'Not Started' if instructor has no Stripe account", async () => {
        mockRepo.getInstructor.mockResolvedValue({ stripeAccountId: null });
        const result = await service.getStripeAccountStatus(instructorId, orgId);
        expect(result.status).toBe('Not Started');
    });

    it("should return 'Pending' when requirements are currently due", async () => {
        mockRepo.getInstructor.mockResolvedValue({ stripeAccountId: 'acct_123' });
        mockStripe.accounts.retrieve.mockResolvedValue({ requirements: { currently_due: ['individual.first_name'] } });
        const result = await service.getStripeAccountStatus(instructorId, orgId);
        expect(result.status).toBe('Pending');
    });

    it("should return 'Restricted' when requirements are past due", async () => {
        mockRepo.getInstructor.mockResolvedValue({ stripeAccountId: 'acct_123' });
        mockStripe.accounts.retrieve.mockResolvedValue({ requirements: { past_due: ['individual.dob.year'] } });
        const result = await service.getStripeAccountStatus(instructorId, orgId);
        expect(result.status).toBe('Restricted');
    });

    it("should return 'Complete' when charges are enabled and details submitted", async () => {
        mockRepo.getInstructor.mockResolvedValue({ stripeAccountId: 'acct_123' });
        mockStripe.accounts.retrieve.mockResolvedValue({ charges_enabled: true, details_submitted: true, requirements: {} });
        const result = await service.getStripeAccountStatus(instructorId, orgId);
        expect(result.status).toBe('Complete');
    });
  });
});
