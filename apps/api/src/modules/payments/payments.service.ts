import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentsRepository } from './payments.repo';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Instructor, User } from '@prisma/client';

type InstructorWithUser = Instructor & { user: User };
@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepo: PaymentsRepository,
    private readonly configService: ConfigService,
    private readonly stripe: Stripe,
  ) {}

  async ensureExpressAccountAndLink(
    instructorId: string,
    orgId: number,
  ): Promise<{
    onboardingLink: string;
  }> {
    const instructor = await this.paymentsRepo.getInstructor(
      instructorId,
      orgId,
    );

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }
    if (!instructor.user) {
      throw new NotFoundException('Instructor has no associated user');
    }

    let stripeAccountId = instructor.stripeAccountId;

    if (!stripeAccountId) {
      const account = await this.createStripeAccount(
        instructor as InstructorWithUser,
      );
      stripeAccountId = account.id;
    }

    const onboardingLink = await this.createStripeOnboardingLink(
      stripeAccountId,
      instructorId,
      orgId,
    );
    return { onboardingLink };
  }

  private async createStripeAccount(
    instructor: InstructorWithUser,
  ): Promise<Stripe.Account> {
    const nameParts = instructor.user.fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    const account = await this.stripe.accounts.create({
      type: 'express',
      email: instructor.user.email,
      business_type: 'individual',
      individual: {
        first_name: firstName,
        last_name: lastName,
        email: instructor.user.email,
      },
    });
    await this.paymentsRepo.updateInstructorStripeAccountId(
      instructor.id,
      account.id,
    );
    return account;
  }

  private async createStripeOnboardingLink(
    stripeAccountId: string,
    instructorId: string,
    orgId: number,
  ): Promise<string> {
    const accountLink = await this.stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${this.configService.get(
        'WEB_URL',
      )}/dashboard/instructors/${instructorId}/payouts?orgId=${orgId}&reauth=true`,
      return_url: `${this.configService.get(
        'WEB_URL',
      )}/dashboard/instructors/${instructorId}/payouts?orgId=${orgId}`,
      type: 'account_onboarding',
    });
    return accountLink.url;
  }

  async getStripeAccountStatus(
    instructorId: string,
    orgId: number,
  ): Promise<StripeAccountStatus> {
    const instructor = await this.paymentsRepo.getInstructor(
      instructorId,
      orgId,
    );
    if (!instructor || !instructor.stripeAccountId) {
      return { status: 'Not Started', requirements: [] };
    }

    const account = await this.stripe.accounts.retrieve(
      instructor.stripeAccountId,
    );

    const { status, requirements } = this.determinePayoutReadiness(account);

    return {
      status,
      requirements,
    };
  }

  private determinePayoutReadiness(account: Stripe.Account): {
    status: PayoutReadinessStatus;
    requirements: string[];
  } {
    if (!account) {
      return { status: 'Not Started', requirements: [] };
    }

    if (account.requirements?.currently_due?.length > 0) {
      return {
        status: 'Pending',
        requirements: account.requirements.currently_due,
      };
    }

    if (account.requirements?.past_due?.length > 0) {
      return {
        status: 'Restricted',
        requirements: account.requirements.past_due,
      };
    }

    if (account.charges_enabled && account.details_submitted) {
      return { status: 'Complete', requirements: [] };
    }

    return { status: 'Pending', requirements: [] };
  }
}

export type PayoutReadinessStatus =
  | 'Not Started'
  | 'Pending'
  | 'Restricted'
  | 'Complete';

export interface StripeAccountStatus {
  status: PayoutReadinessStatus;
  requirements: string[];
}
