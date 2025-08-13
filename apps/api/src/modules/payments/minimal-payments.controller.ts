import type { PaymentsService } from "./payments.service";
import { Controller, Get } from "@nestjs/common";

@Controller("payments")
export class MinimalPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("health")
  health() {
    return {
      status: "ok",
      message: "Payments controller with service injection working",
    };
  }

  @Get("test-service")
  async testService() {
    const result = await this.paymentsService.ensureExpressAccountAndLink(
      "test-id",
      1,
    );
    return { message: "PaymentsService working", ...result };
  }
}
