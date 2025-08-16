import type { PrismaService } from "@/core/prisma/prisma.service";
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

interface ServiceResponse {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

@Controller({ path: "services", version: "1" })
@ApiTags("services")
export class SimpleServicesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Get services" })
  @ApiResponse({ status: 200, description: "Services retrieved" })
  async getServices(): Promise<ServiceResponse[]> {
    // Get services and their pricing from rate cards
    const services = await this.prisma.service.findMany({
      orderBy: { name: "asc" },
    });

    // Get the default rate card
    const defaultRateCard = await this.prisma.rateCard.findFirst({
      where: { isDefault: true },
      include: {
        items: {
          include: {
            service: true,
          },
        },
      },
    });

    // Convert to API format with pricing
    return services.map((service) => {
      // Find pricing for this service in the default rate card
      const rateCardItem = defaultRateCard?.items.find(
        (item) => item.serviceId === service.id,
      );

      return {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMin,
        priceCents: rateCardItem?.priceCents || 9500, // Default $95
      };
    });
  }
}
