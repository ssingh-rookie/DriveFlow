import type { RawBodyRequest } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import type Stripe from 'stripe'
import type { PaymentsRepository } from '../payments.repo'
import { Injectable } from '@nestjs/common'

@Injectable()
export class StripeWebhookHandler {
  constructor(
    private readonly configService: ConfigService,
    private readonly paymentsRepo: PaymentsRepository,
    private readonly stripe: Stripe,
  ) {}

  async handleStripeWebhook(req: RawBodyRequest<Request>) {
    const sig = req.headers['stripe-signature']
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET')

    let event: Stripe.Event

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        webhookSecret,
      )
    }
    catch (err) {
      console.error(`Error verifying webhook signature: ${err.message}`)
      return
    }

    switch (event.type) {
      case 'account.updated':
        this.handleAccountUpdated(event.data.object as Stripe.Account)
        break
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`)
    }
  }

  private async handleAccountUpdated(account: Stripe.Account) {
    await this.paymentsRepo.updateInstructorFromStripeEvent(
      account.id,
      account,
    )
  }
}
