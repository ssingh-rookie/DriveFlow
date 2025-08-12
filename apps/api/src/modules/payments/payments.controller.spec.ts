import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { RoleGuard } from '../auth/guards/role.guard';
import { OrgScopeGuard } from '../auth/guards/org-scope.guard';
import { JwtPayload } from '../auth/types/auth.types';
// import { StripeWebhookHandler } from './webhooks/stripe.webhook';
// import { RawBodyRequest } from '@nestjs/common';
// import { Request, Response } from 'express';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;
  // let webhookHandler: StripeWebhookHandler;

  const mockPaymentsService = {
    ensureExpressAccountAndLink: jest.fn(),
    getStripeAccountStatus: jest.fn(),
  };

  // const mockWebhookHandler = {
  //   handleStripeWebhook: jest.fn(),
  // };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
        // {
        //   provide: StripeWebhookHandler,
        //   useValue: mockWebhookHandler,
        // },
      ],
    })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrgScopeGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
    // webhookHandler = module.get<StripeWebhookHandler>(StripeWebhookHandler);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getConnectLink', () => {
    it('should call the service and return an onboarding link', async () => {
      const instructorId = 'test-instructor-id';
      const user: JwtPayload = {
        sub: '1',
        email: 'test@test.com',
        orgId: '1',
        role: 'admin',
        iat: 0,
        exp: 0,
        jti: 'a',
      };
      const expectedLink = 'https://stripe.com/onboard/123';
      mockPaymentsService.ensureExpressAccountAndLink.mockResolvedValue({
        onboardingLink: expectedLink,
      });

      const result = await controller.getConnectLink(instructorId);

      expect(service.ensureExpressAccountAndLink).toHaveBeenCalledWith(
        instructorId,
        1, // hardcoded orgId for testing
      );
      expect(result).toEqual({ onboardingLink: expectedLink });
    });
  });

  describe('getPayoutReadiness', () => {
    it('should call the service and return the payout readiness status', async () => {
      const instructorId = 'test-instructor-id';
      const user: JwtPayload = {
        sub: '1',
        email: 'test@test.com',
        orgId: '1',
        role: 'admin',
        iat: 0,
        exp: 0,
        jti: 'a',
      };
      const expectedStatus = { status: 'Complete', requirements: [] };
      mockPaymentsService.getStripeAccountStatus.mockResolvedValue(
        expectedStatus,
      );

      const result = await controller.getPayoutReadiness(instructorId);

      expect(service.getStripeAccountStatus).toHaveBeenCalledWith(
        instructorId,
        1, // hardcoded orgId for testing
      );
      expect(result).toEqual(expectedStatus);
    });
  });

  // TODO: Add webhook test when webhook endpoint is implemented
  // describe('handleStripeWebhook', () => {
  //   it('should call the webhook handler and send a 200 response', async () => {
  //     const mockReq = {} as RawBodyRequest<Request>;
  //     const mockRes = {
  //       status: jest.fn().mockReturnThis(),
  //       send: jest.fn(),
  //     } as unknown as Response;

  //     await controller.handleStripeWebhook(mockReq, mockRes);

  //     expect(webhookHandler.handleStripeWebhook).toHaveBeenCalledWith(mockReq);
  //     expect(mockRes.status).toHaveBeenCalledWith(200);
  //     expect(mockRes.send).toHaveBeenCalled();
  //   });
  // });
});
