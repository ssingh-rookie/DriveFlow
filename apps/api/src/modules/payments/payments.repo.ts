import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getInstructor(id: string, orgId: number) {
    return this.prisma.instructor.findFirst({
      where: {
        id,
        orgId: orgId.toString(),
      },
      include: {
        user: true,
      },
    });
  }

  async updateInstructorStripeAccountId(id: string, stripeAccountId: string) {
    return this.prisma.instructor.update({
      where: {
        id,
      },
      data: {
        stripeAccountId: stripeAccountId,
      },
    });
  }

  async updateInstructorFromStripeEvent(
    stripeAccountId: string,
    account: Stripe.Account,
  ) {
    // TODO: move to a contract
    const capabilities = Object.keys(account.capabilities) as (
      | 'card_payments'
      | 'transfers'
    )[];

    return this.prisma.instructor.update({
      where: {
        stripeAccountId: stripeAccountId,
      },
      data: {
        stripeOnboardingStatus: account.details_submitted
          ? 'complete'
          : 'pending',
        stripeCapabilities: capabilities,
        stripeRequirementsDue: account.requirements.currently_due,
        stripeConnectedAt: new Date(), // TODO: be more precise
      },
    });
  }
}
