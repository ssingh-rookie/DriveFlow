import { Injectable } from '@nestjs/common'

@Injectable()
export class PaymentsService {
  constructor() {}

  async ensureExpressAccountAndLink(
    _instructorId: string,
    _orgId: number,
  ): Promise<{
      onboardingLink: string
    }> {
    // Return mock data for testing
    return {
      onboardingLink: 'https://connect.stripe.com/express/onboarding/test-mock-link',
    }
  }

  async getStripeAccountStatus(
    _instructorId: string,
    _orgId: number,
  ): Promise<{
      status: 'Not Started' | 'Pending' | 'Restricted' | 'Complete'
      requirements: string[]
    }> {
    // Return mock data for testing
    return {
      status: 'Not Started',
      requirements: ['Please connect your Stripe account to receive payouts'],
    }
  }
}
