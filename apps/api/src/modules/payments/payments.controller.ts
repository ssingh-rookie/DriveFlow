import {
  Controller,
  Get,
  Param,
  UseGuards,
  Post,
  Req,
  Res,
  RawBodyRequest,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { RoleGuard } from '../auth/guards/role.guard';
import { OrgScopeGuard } from '../auth/guards/org-scope.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/auth.types';
import { Roles } from '../auth/decorators/roles.decorator';
// import { StripeWebhookHandler } from './webhooks/stripe.webhook';
import { Public } from '../auth/guards/jwt-auth.guard';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
// import { StripeAccountStatusDto, StripeConnectLinkDto } from './dto/payments.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check for payments controller' })
  health() {
    return { status: 'ok', message: 'Payments controller is working' };
  }

  @Get('instructors/:id/stripe/connect-link')
  @Public()
  // @UseGuards(RoleGuard, OrgScopeGuard)
  // @Roles('admin')
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a Stripe Connect onboarding link for an instructor' })
  @ApiParam({ name: 'id', description: 'Instructor ID' })
  @ApiResponse({ status: 200, description: 'Onboarding link generated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Instructor not found' })
  async getConnectLink(
    @Param('id') instructorId: string,
    // @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.ensureExpressAccountAndLink(
      instructorId,
      1, // hardcoded orgId for testing
    );
  }

  @Get('instructors/:id/payout-readiness')
  @Public()
  // @UseGuards(RoleGuard, OrgScopeGuard)
  // @Roles('admin', 'instructor')
  // @ApiBearerAuth()
  @ApiOperation({ summary: "Get an instructor's Stripe payout readiness status" })
  @ApiParam({ name: 'id', description: 'Instructor ID' })
  @ApiResponse({ status: 200, description: 'Status retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getPayoutReadiness(
    @Param('id') instructorId: string,
    // @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.getStripeAccountStatus(
      instructorId,
      1, // hardcoded orgId for testing
    );
  }

  // @Post('webhooks/stripe')
  // @Public()
  // @ApiOperation({ summary: 'Handle incoming Stripe webhooks' })
  // @ApiResponse({ status: 200, description: 'Webhook received' })
  // @ApiResponse({ status: 400, description: 'Bad request (e.g., signature verification failed)' })
  // async handleStripeWebhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
  //   await this.stripeWebhookHandler.handleStripeWebhook(req);
  //   res.status(200).send();
  // }
}
