import { Controller, Get, Param } from '@nestjs/common';
import { Public } from './modules/auth/guards/jwt-auth.guard';

@Controller('test')
export class TestController {
  @Get()
  @Public()
  test() {
    return { message: 'Test controller works!' };
  }

  @Get('payments/health')
  @Public()
  paymentsHealth() {
    return { status: 'ok', message: 'Test payments endpoint works' };
  }

  @Get('payments/instructors/:id/payout-readiness')
  @Public()
  getPayoutReadiness(@Param('id') instructorId: string) {
    return {
      status: 'Not Started',
      requirements: ['Please connect your Stripe account']
    };
  }

  @Get('payments/instructors/:id/stripe/connect-link')
  @Public()
  getConnectLink(@Param('id') instructorId: string) {
    return {
      onboardingLink: 'https://connect.stripe.com/express/onboarding/test-demo-link'
    };
  }
}
