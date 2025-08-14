import type { Payment, PaymentStatus, Payout, Booking } from '@prisma/client'
import { PrismaService } from '../../core/prisma/prisma.service'
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'

export interface CreatePaymentIntentRequest {
  orgId: string
  bookingId: string
  amountCents: number
  platformFeeCents: number
  instructorShareCents: number
  currency?: string
  metadata?: Record<string, any>
}

export interface CreatePaymentIntentResponse {
  paymentIntentId: string
  clientSecret: string
  status: PaymentStatus
  amountCents: number
  currency: string
}

export interface ProcessRefundRequest {
  paymentId: string
  refundAmountCents: number
  reason: string
  metadata?: Record<string, any>
}

export interface ProcessRefundResponse {
  refundId: string
  refundAmountCents: number
  processingFeeCents: number
  netRefundCents: number
  estimatedArrivalDays: number
  status: 'pending' | 'succeeded' | 'failed'
}

export interface ReschedulePaymentRequest {
  originalBookingId: string
  feeCents: number
  reason: string
  metadata?: Record<string, any>
}

export interface ReschedulePaymentResponse {
  paymentIntentId: string
  clientSecret?: string
  feeCents: number
  status: 'requires_payment' | 'waived' | 'succeeded'
}

export interface InstructorPayoutRequest {
  orgId: string
  instructorId: string
  bookingId: string
  amountCents: number
  currency?: string
}

export interface InstructorPayoutResponse {
  payoutId: string
  transferId?: string
  amountCents: number
  status: 'pending' | 'in_transit' | 'paid' | 'failed'
  estimatedArrivalDate?: string
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Existing Stripe Connect Methods =====

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

  // ===== Lesson Payment Operations =====

  /**
   * Create payment intent for lesson booking
   */
  async createLessonPaymentIntent(request: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    const { orgId, bookingId, amountCents, platformFeeCents, instructorShareCents, currency = 'AUD' } = request

    // Verify booking exists and is in correct state
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, orgId: true },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    if (booking.orgId !== orgId) {
      throw new BadRequestException('Booking does not belong to organization')
    }

    if (booking.status !== 'draft' && booking.status !== 'pending_payment') {
      throw new BadRequestException('Booking is not in payable state')
    }

    // Check if payment already exists
    const existingPayment = await this.prisma.payment.findUnique({
      where: { bookingId },
    })

    if (existingPayment) {
      if (existingPayment.status === 'succeeded') {
        throw new BadRequestException('Payment already completed for this booking')
      }
      
      // Return existing payment intent if not succeeded
      return this.formatPaymentResponse(existingPayment)
    }

    // Create mock payment intent (MVP implementation)
    const paymentIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const clientSecret = `${paymentIntentId}_secret_mock`

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        orgId,
        bookingId,
        status: 'intent_created',
        currency,
        amountCents,
        platformFeeCents,
        instructorShareCents,
        stripePaymentIntentId: paymentIntentId,
      },
    })

    return this.formatPaymentResponse(payment, clientSecret)
  }

  /**
   * Confirm payment success (webhook simulation for MVP)
   */
  async confirmLessonPayment(paymentIntentId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    })

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    if (payment.status === 'succeeded') {
      return payment // Already confirmed
    }

    // Update payment status and booking status
    const [updatedPayment] = await Promise.all([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'succeeded',
          stripeChargeId: `ch_mock_${Date.now()}`,
          updatedAt: new Date(),
        },
      }),
      this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: 'confirmed',
          statusChangedAt: new Date(),
        },
      }),
    ])

    return updatedPayment
  }

  /**
   * Process refund for cancelled lesson
   */
  async processLessonRefund(request: ProcessRefundRequest): Promise<ProcessRefundResponse> {
    const { paymentId, refundAmountCents, reason } = request

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    })

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    if (payment.status !== 'succeeded') {
      throw new BadRequestException('Cannot refund payment that is not succeeded')
    }

    if (refundAmountCents > payment.amountCents) {
      throw new BadRequestException('Refund amount cannot exceed original payment amount')
    }

    // Create mock refund (MVP implementation)
    const refundId = `re_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const processingFeeCents = Math.min(Math.ceil(refundAmountCents * 0.029) + 30, refundAmountCents) // 2.9% + $0.30
    const netRefundCents = refundAmountCents - processingFeeCents

    // Update payment with refund information
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'refunded',
        stripeRefundId: refundId,
        updatedAt: new Date(),
      },
    })

    return {
      refundId,
      refundAmountCents,
      processingFeeCents,
      netRefundCents,
      estimatedArrivalDays: 5, // Standard bank processing time
      status: 'succeeded',
    }
  }

  /**
   * Handle reschedule fee payment
   */
  async processReschedulePayment(request: ReschedulePaymentRequest): Promise<ReschedulePaymentResponse> {
    const { originalBookingId, feeCents, reason } = request

    if (feeCents === 0) {
      return {
        paymentIntentId: 'waived',
        feeCents: 0,
        status: 'waived',
      }
    }

    // Get original booking for context
    const booking = await this.prisma.booking.findUnique({
      where: { id: originalBookingId },
      select: { orgId: true, studentId: true },
    })

    if (!booking) {
      throw new NotFoundException('Original booking not found')
    }

    // Create mock payment intent for reschedule fee
    const paymentIntentId = `pi_reschedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const clientSecret = `${paymentIntentId}_secret_mock`

    return {
      paymentIntentId,
      clientSecret,
      feeCents,
      status: 'requires_payment',
    }
  }

  /**
   * Process instructor payout for completed lesson
   */
  async processInstructorPayout(request: InstructorPayoutRequest): Promise<InstructorPayoutResponse> {
    const { orgId, instructorId, bookingId, amountCents, currency = 'AUD' } = request

    // Verify booking exists and is completed
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        instructor: true,
      },
    })

    if (!booking) {
      throw new NotFoundException('Booking not found')
    }

    if (booking.status !== 'completed') {
      throw new BadRequestException('Cannot payout for non-completed lesson')
    }

    if (!booking.payment || booking.payment.status !== 'succeeded') {
      throw new BadRequestException('No successful payment found for this booking')
    }

    if (amountCents > booking.instructorShareCents) {
      throw new BadRequestException('Payout amount exceeds instructor share')
    }

    // Check if payout already exists
    const existingPayout = await this.prisma.payout.findFirst({
      where: { bookingId },
    })

    if (existingPayout) {
      return this.formatPayoutResponse(existingPayout)
    }

    // Create mock payout (MVP implementation)
    const transferId = `tr_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const payout = await this.prisma.payout.create({
      data: {
        orgId,
        instructorId,
        bookingId,
        currency,
        amountCents,
        status: 'pending',
        stripeTransferId: transferId,
      },
    })

    return this.formatPayoutResponse(payout)
  }

  /**
   * Get payment status for a booking
   */
  async getPaymentStatus(bookingId: string): Promise<{
    hasPayment: boolean
    status?: PaymentStatus
    amountCents?: number
    currency?: string
    paymentIntentId?: string
  }> {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
    })

    if (!payment) {
      return { hasPayment: false }
    }

    return {
      hasPayment: true,
      status: payment.status,
      amountCents: payment.amountCents,
      currency: payment.currency,
      paymentIntentId: payment.stripePaymentIntentId,
    }
  }

  /**
   * Get instructor payouts for a lesson
   */
  async getInstructorPayouts(instructorId: string, bookingId?: string): Promise<Payout[]> {
    const where: any = { instructorId }
    if (bookingId) {
      where.bookingId = bookingId
    }

    return this.prisma.payout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  // ===== Private Helper Methods =====

  private formatPaymentResponse(payment: Payment, clientSecret?: string): CreatePaymentIntentResponse {
    return {
      paymentIntentId: payment.stripePaymentIntentId,
      clientSecret: clientSecret || `${payment.stripePaymentIntentId}_secret_mock`,
      status: payment.status,
      amountCents: payment.amountCents,
      currency: payment.currency,
    }
  }

  private formatPayoutResponse(payout: Payout): InstructorPayoutResponse {
    const estimatedArrival = new Date()
    estimatedArrival.setDate(estimatedArrival.getDate() + 2) // 2 business days

    return {
      payoutId: payout.id,
      transferId: payout.stripeTransferId || undefined,
      amountCents: payout.amountCents,
      status: payout.status as any,
      estimatedArrivalDate: estimatedArrival.toISOString(),
    }
  }
}
