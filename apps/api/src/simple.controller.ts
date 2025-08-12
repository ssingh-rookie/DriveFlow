import { Controller, Get, Param } from '@nestjs/common';

@Controller('api')
export class SimpleController {
  @Get('health')
  health() {
    return { message: 'Simple API is working!' };
  }

  @Get('payments/instructors/:id/payout-readiness')
  getPayoutReadiness(@Param('id') instructorId: string) {
    return {
      status: 'Not Started',
      requirements: ['Please connect your Stripe account']
    };
  }

  @Get('payments/instructors/:id/stripe/connect-link')
  getConnectLink(@Param('id') instructorId: string) {
    return {
      onboardingLink: 'https://connect.stripe.com/express/onboarding/test-demo-link'
    };
  }
}
