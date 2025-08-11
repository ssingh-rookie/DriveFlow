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
import { StripeWebhookHandler } from './webhooks/stripe.webhook';
import { Public } from '../auth/guards/jwt-auth.guard';
import { Request, Response } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeWebhookHandler: StripeWebhookHandler,
  ) {}

  @Get('instructors/:id/stripe/connect-link')
  @UseGuards(RoleGuard, OrgScopeGuard)
  @Roles('admin')
  async getConnectLink(
    @Param('id') instructorId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.ensureExpressAccountAndLink(
      instructorId,
      parseInt(user.orgId, 10),
    );
  }

  @Get('instructors/:id/payout-readiness')
  @UseGuards(RoleGuard, OrgScopeGuard)
  @Roles('admin', 'instructor')
  async getPayoutReadiness(
    @Param('id') instructorId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.getStripeAccountStatus(
      instructorId,
      parseInt(user.orgId, 10),
    );
  }

  @Post('webhooks/stripe')
  @Public()
  async handleStripeWebhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response) {
    await this.stripeWebhookHandler.handleStripeWebhook(req);
    res.status(200).send();
  }
}
