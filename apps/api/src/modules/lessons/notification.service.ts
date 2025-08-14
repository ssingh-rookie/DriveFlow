import type { MessageChannel, MessageStatus } from '@prisma/client'
import { PrismaService } from '../../core/prisma/prisma.service'
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy'
import { Injectable } from '@nestjs/common'

export interface NotificationRecipient {
  email?: string
  phone?: string
  name: string
  role: 'student' | 'parent' | 'instructor' | 'admin'
}

export interface LessonNotificationData {
  lessonId: string
  orgId: string
  studentName: string
  instructorName: string
  serviceName: string
  startAt: string // ISO string
  endAt: string
  pickupAddress?: string
  dropoffAddress?: string
  cancellationReason?: string
  rescheduleReason?: string
  refundAmount?: number
  paymentAmount?: number
}

export interface NotificationTemplate {
  key: string
  channel: MessageChannel
  subject: string
  bodyTemplate: string
}

export interface SendNotificationRequest {
  templateKey: string
  recipients: NotificationRecipient[]
  data: LessonNotificationData
  channel?: MessageChannel // Default to email
  priority?: 'low' | 'normal' | 'high'
}

export interface NotificationResult {
  messageId: string
  recipient: string
  channel: MessageChannel
  status: MessageStatus
  error?: string
}

/**
 * Basic Notification Service for Lesson Events
 * MVP: Direct database inserts to Message table
 * Email templates with simple variable substitution
 * Post-MVP: SMS integration, real-time notifications
 */
@Injectable()
export class LessonNotificationService {
  // MVP: Simple email templates with variable substitution
  private readonly templates: Record<string, NotificationTemplate> = {
    // Lesson Creation
    lesson_created_student: {
      key: 'lesson_created_student',
      channel: 'email',
      subject: 'Lesson Booked - {{serviceName}} on {{date}}',
      bodyTemplate: `Hi {{studentName}},

Your lesson has been successfully booked!

Lesson Details:
- Service: {{serviceName}}
- Instructor: {{instructorName}}
- Date & Time: {{startAt}} - {{endAt}}
- Pickup: {{pickupAddress}}
- Drop-off: {{dropoffAddress}}

Please arrive 5 minutes early for your lesson.

If you need to make any changes, please contact us at least 24 hours in advance.

Best regards,
DriveFlow Team`
    },

    lesson_created_instructor: {
      key: 'lesson_created_instructor',
      channel: 'email',
      subject: 'New Lesson Assignment - {{studentName}} on {{date}}',
      bodyTemplate: `Hi {{instructorName}},

You have been assigned a new lesson!

Lesson Details:
- Student: {{studentName}}
- Service: {{serviceName}}
- Date & Time: {{startAt}} - {{endAt}}
- Pickup: {{pickupAddress}}
- Drop-off: {{dropoffAddress}}

Please review the lesson details and prepare accordingly.

Best regards,
DriveFlow Team`
    },

    // Lesson Confirmation
    lesson_confirmed_student: {
      key: 'lesson_confirmed_student',
      channel: 'email',
      subject: 'Lesson Confirmed - {{serviceName}} on {{date}}',
      bodyTemplate: `Hi {{studentName}},

Great news! Your lesson payment has been processed and your lesson is now confirmed.

Confirmed Lesson:
- Service: {{serviceName}}
- Instructor: {{instructorName}}
- Date & Time: {{startAt}} - {{endAt}}
- Pickup: {{pickupAddress}}
- Drop-off: {{dropoffAddress}}
- Amount Paid: $\{{paymentAmount}}

Your instructor will contact you if needed. Please arrive on time!

Best regards,
DriveFlow Team`
    },

    lesson_confirmed_instructor: {
      key: 'lesson_confirmed_instructor',
      channel: 'email',
      subject: 'Lesson Confirmed - {{studentName}} on {{date}}',
      bodyTemplate: `Hi {{instructorName}},

The lesson with {{studentName}} has been confirmed (payment received).

Confirmed Lesson:
- Student: {{studentName}}
- Service: {{serviceName}}
- Date & Time: {{startAt}} - {{endAt}}
- Pickup: {{pickupAddress}}
- Drop-off: {{dropoffAddress}}

Please ensure you're prepared and arrive on time.

Best regards,
DriveFlow Team`
    },

    // Lesson Cancellation
    lesson_cancelled_student: {
      key: 'lesson_cancelled_student',
      channel: 'email',
      subject: 'Lesson Cancelled - {{serviceName}} on {{date}}',
      bodyTemplate: `Hi {{studentName}},

Your lesson has been cancelled.

Cancelled Lesson:
- Service: {{serviceName}}
- Instructor: {{instructorName}}
- Date & Time: {{startAt}} - {{endAt}}
- Reason: {{cancellationReason}}

{{#refundAmount}}
Refund Information:
A refund of $\{{refundAmount}} will be processed and should appear in your account within 5-7 business days.
{{/refundAmount}}

To book a new lesson, please visit your dashboard.

Best regards,
DriveFlow Team`
    },

    lesson_cancelled_instructor: {
      key: 'lesson_cancelled_instructor',
      channel: 'email',
      subject: 'Lesson Cancelled - {{studentName}} on {{date}}',
      bodyTemplate: `Hi {{instructorName}},

A lesson has been cancelled.

Cancelled Lesson:
- Student: {{studentName}}
- Service: {{serviceName}}
- Date & Time: {{startAt}} - {{endAt}}
- Reason: {{cancellationReason}}

This time slot is now available in your schedule.

Best regards,
DriveFlow Team`
    },

    // Lesson Rescheduling
    lesson_rescheduled_student: {
      key: 'lesson_rescheduled_student',
      channel: 'email',
      subject: 'Lesson Rescheduled - {{serviceName}}',
      bodyTemplate: `Hi {{studentName}},

Your lesson has been rescheduled.

Updated Lesson Details:
- Service: {{serviceName}}
- Instructor: {{instructorName}}
- New Date & Time: {{startAt}} - {{endAt}}
- Pickup: {{pickupAddress}}
- Drop-off: {{dropoffAddress}}
- Reason: {{rescheduleReason}}

Please note the new time and arrive accordingly.

Best regards,
DriveFlow Team`
    },

    lesson_rescheduled_instructor: {
      key: 'lesson_rescheduled_instructor',
      channel: 'email',
      subject: 'Lesson Rescheduled - {{studentName}}',
      bodyTemplate: `Hi {{instructorName}},

A lesson has been rescheduled.

Updated Lesson Details:
- Student: {{studentName}}
- Service: {{serviceName}}
- New Date & Time: {{startAt}} - {{endAt}}
- Pickup: {{pickupAddress}}
- Drop-off: {{dropoffAddress}}
- Reason: {{rescheduleReason}}

Please update your schedule accordingly.

Best regards,
DriveFlow Team`
    },

    // Lesson Reminders
    lesson_reminder_student: {
      key: 'lesson_reminder_student',
      channel: 'email',
      subject: 'Reminder: Lesson Tomorrow - {{serviceName}}',
      bodyTemplate: `Hi {{studentName}},

This is a friendly reminder about your upcoming lesson tomorrow!

Lesson Details:
- Service: {{serviceName}}
- Instructor: {{instructorName}}
- Date & Time: {{startAt}} - {{endAt}}
- Pickup: {{pickupAddress}}
- Drop-off: {{dropoffAddress}}

Please arrive 5 minutes early and bring your learner's permit.

Best regards,
DriveFlow Team`
    },

    lesson_reminder_instructor: {
      key: 'lesson_reminder_instructor',
      channel: 'email',
      subject: 'Reminder: Lesson Tomorrow - {{studentName}}',
      bodyTemplate: `Hi {{instructorName}},

Reminder about your lesson tomorrow:

- Student: {{studentName}}
- Service: {{serviceName}}
- Date & Time: {{startAt}} - {{endAt}}
- Pickup: {{pickupAddress}}
- Drop-off: {{dropoffAddress}}

Please review the lesson plan and arrive on time.

Best regards,
DriveFlow Team`
    }
  }

  constructor(private readonly prisma: PrismaService) {}

  // ===== Core Notification Methods =====

  /**
   * Send notifications for lesson creation
   */
  async notifyLessonCreated(
    data: LessonNotificationData,
    recipients: { student: NotificationRecipient; instructor: NotificationRecipient }
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = []

    // Send to student
    const studentResult = await this.sendNotification({
      templateKey: 'lesson_created_student',
      recipients: [recipients.student],
      data,
    })
    results.push(...studentResult)

    // Send to instructor
    const instructorResult = await this.sendNotification({
      templateKey: 'lesson_created_instructor',
      recipients: [recipients.instructor],
      data,
    })
    results.push(...instructorResult)

    return results
  }

  /**
   * Send notifications for lesson confirmation (payment success)
   */
  async notifyLessonConfirmed(
    data: LessonNotificationData,
    recipients: { student: NotificationRecipient; instructor: NotificationRecipient }
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = []

    // Send to student
    const studentResult = await this.sendNotification({
      templateKey: 'lesson_confirmed_student',
      recipients: [recipients.student],
      data,
    })
    results.push(...studentResult)

    // Send to instructor
    const instructorResult = await this.sendNotification({
      templateKey: 'lesson_confirmed_instructor',
      recipients: [recipients.instructor],
      data,
    })
    results.push(...instructorResult)

    return results
  }

  /**
   * Send notifications for lesson cancellation
   */
  async notifyLessonCancelled(
    data: LessonNotificationData,
    recipients: { student: NotificationRecipient; instructor: NotificationRecipient }
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = []

    // Send to student
    const studentResult = await this.sendNotification({
      templateKey: 'lesson_cancelled_student',
      recipients: [recipients.student],
      data,
    })
    results.push(...studentResult)

    // Send to instructor
    const instructorResult = await this.sendNotification({
      templateKey: 'lesson_cancelled_instructor',
      recipients: [recipients.instructor],
      data,
    })
    results.push(...instructorResult)

    return results
  }

  /**
   * Send notifications for lesson rescheduling
   */
  async notifyLessonRescheduled(
    data: LessonNotificationData,
    recipients: { student: NotificationRecipient; instructor: NotificationRecipient }
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = []

    // Send to student
    const studentResult = await this.sendNotification({
      templateKey: 'lesson_rescheduled_student',
      recipients: [recipients.student],
      data,
    })
    results.push(...studentResult)

    // Send to instructor
    const instructorResult = await this.sendNotification({
      templateKey: 'lesson_rescheduled_instructor',
      recipients: [recipients.instructor],
      data,
    })
    results.push(...instructorResult)

    return results
  }

  /**
   * Send lesson reminders (typically 24 hours before)
   */
  async sendLessonReminders(
    data: LessonNotificationData,
    recipients: { student: NotificationRecipient; instructor: NotificationRecipient }
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = []

    // Send to student
    const studentResult = await this.sendNotification({
      templateKey: 'lesson_reminder_student',
      recipients: [recipients.student],
      data,
    })
    results.push(...studentResult)

    // Send to instructor
    const instructorResult = await this.sendNotification({
      templateKey: 'lesson_reminder_instructor',
      recipients: [recipients.instructor],
      data,
    })
    results.push(...instructorResult)

    return results
  }

  /**
   * Generic notification sending method
   */
  async sendNotification(request: SendNotificationRequest): Promise<NotificationResult[]> {
    const { templateKey, recipients, data, channel = 'email' } = request
    const template = this.templates[templateKey]

    if (!template) {
      throw new Error(`Template not found: ${templateKey}`)
    }

    const results: NotificationResult[] = []

    for (const recipient of recipients) {
      try {
        // Determine recipient address
        const toAddress = channel === 'email' ? recipient.email : recipient.phone
        if (!toAddress) {
          results.push({
            messageId: '',
            recipient: recipient.name,
            channel,
            status: 'failed',
            error: `No ${channel} address provided for ${recipient.name}`,
          })
          continue
        }

        // Process template variables
        const subject = this.processTemplate(template.subject, data, recipient)
        const body = this.processTemplate(template.bodyTemplate, data, recipient)

        // Insert message into database (MVP implementation)
        const message = await this.prisma.message.create({
          data: {
            orgId: data.orgId,
            toAddress,
            channel,
            templateKey,
            subject,
            body,
            status: 'queued', // MVP: immediately mark as queued
            relatedType: 'lesson',
            relatedId: data.lessonId,
          },
        })

        results.push({
          messageId: message.id,
          recipient: toAddress,
          channel,
          status: 'queued',
        })

        // MVP: Log notification (in production, would trigger email/SMS sending)
        console.log(`[NOTIFICATION] ${channel.toUpperCase()} queued for ${recipient.name} (${toAddress})`)
        console.log(`Subject: ${subject}`)

      } catch (error) {
        results.push({
          messageId: '',
          recipient: recipient.name,
          channel,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return results
  }

  /**
   * Get notification history for a lesson
   */
  async getLessonNotificationHistory(lessonId: string): Promise<Array<{
    id: string
    templateKey: string
    channel: MessageChannel
    toAddress: string
    subject: string
    status: MessageStatus
    error?: string
    createdAt: string
  }>> {
    const messages = await this.prisma.message.findMany({
      where: {
        relatedType: 'lesson',
        relatedId: lessonId,
      },
      orderBy: { createdAt: 'desc' },
    })

    return messages.map(message => ({
      id: message.id,
      templateKey: message.templateKey,
      channel: message.channel,
      toAddress: message.toAddress,
      subject: message.subject || '',
      status: message.status,
      error: message.error || undefined,
      createdAt: message.createdAt.toISOString(),
    }))
  }

  /**
   * Mark message as sent (for webhook/callback integration)
   */
  async markMessageSent(messageId: string, providerId?: string): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        status: 'sent',
        providerId,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Mark message as failed
   */
  async markMessageFailed(messageId: string, error: string): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        status: 'failed',
        error,
        updatedAt: new Date(),
      },
    })
  }

  // ===== Private Helper Methods =====

  /**
   * Simple template processing with variable substitution
   */
  private processTemplate(
    template: string, 
    data: LessonNotificationData, 
    recipient: NotificationRecipient
  ): string {
    let processed = template

    // Format date/time for display
    const startDate = new Date(data.startAt)
    const endDate = new Date(data.endAt)
    const formattedDate = startDate.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const formattedStartTime = startDate.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const formattedEndTime = endDate.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
    })

    // Replace variables
    const replacements: Record<string, string> = {
      '{{lessonId}}': data.lessonId,
      '{{studentName}}': data.studentName,
      '{{instructorName}}': data.instructorName,
      '{{serviceName}}': data.serviceName,
      '{{startAt}}': `${formattedDate} at ${formattedStartTime}`,
      '{{endAt}}': `${formattedDate} at ${formattedEndTime}`,
      '{{date}}': formattedDate,
      '{{startTime}}': formattedStartTime,
      '{{endTime}}': formattedEndTime,
      '{{pickupAddress}}': data.pickupAddress || 'Not specified',
      '{{dropoffAddress}}': data.dropoffAddress || 'Not specified',
      '{{cancellationReason}}': data.cancellationReason || 'No reason provided',
      '{{rescheduleReason}}': data.rescheduleReason || 'No reason provided',
      '{{recipientName}}': recipient.name,
    }

    // Handle optional fields with conditional blocks
    if (data.refundAmount !== undefined) {
      const refundFormatted = (data.refundAmount / 100).toFixed(2)
      replacements['{{refundAmount}}'] = refundFormatted
      // Remove conditional block markers
      processed = processed.replace(/\{\{#refundAmount\}\}([\s\S]*?)\{\{\/refundAmount\}\}/g, '$1')
    } else {
      // Remove conditional blocks
      processed = processed.replace(/\{\{#refundAmount\}\}[\s\S]*?\{\{\/refundAmount\}\}/g, '')
    }

    if (data.paymentAmount !== undefined) {
      const paymentFormatted = (data.paymentAmount / 100).toFixed(2)
      replacements['{{paymentAmount}}'] = paymentFormatted
    }

    // Apply all replacements
    for (const [key, value] of Object.entries(replacements)) {
      processed = processed.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value)
    }

    return processed
  }
}