import { Controller, Get, Param } from '@nestjs/common'
import { Public } from '../auth/guards/jwt-auth.guard'

@Controller('payments')
export class SimplePaymentsController {
  @Get('health')
  @Public()
  health() {
    return { status: 'ok', message: 'Simple payments controller is working' }
  }

  @Get('instructors/:id/payout-readiness')
  @Public()
  getPayoutReadiness(@Param('id') instructorId: string) {
    // Return mock data for testing
    return {
      status: 'Not Started',
      requirements: ['Please connect your Stripe account'],
    }
  }

  @Get('instructors/:id/stripe/connect-link')
  @Public()
  getConnectLink(@Param('id') instructorId: string) {
    // Return mock data for testing
    return {
      onboardingLink: 'https://connect.stripe.com/express/setup',
    }
  }
}
