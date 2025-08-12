import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  constructor() {}

  async ensureExpressAccountAndLink(
    instructorId: string,
    orgId: number,
  ): Promise<{
    onboardingLink: string;
  }> {
    // Return mock data for testing
    return {
      onboardingLink: 'https://connect.stripe.com/express/onboarding/test-mock-link',
    };
  }

  async getStripeAccountStatus(
    instructorId: string,
    orgId: number,
  ): Promise<{
    status: 'Not Started' | 'Pending' | 'Restricted' | 'Complete';
    requirements: string[];
  }> {
    // Return mock data for testing
    return {
      status: 'Not Started',
      requirements: ['Please connect your Stripe account to receive payouts'],
    };
  }
}