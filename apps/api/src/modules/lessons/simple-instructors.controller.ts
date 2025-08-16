import type { PrismaService } from "@/core/prisma/prisma.service";
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

interface InstructorResponse {
  id: string;
  displayName: string;
  available: boolean;
}

@Controller({ path: "instructors", version: "1" })
@ApiTags("instructors")
export class SimpleInstructorsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Get instructors" })
  @ApiResponse({ status: 200, description: "Instructors retrieved" })
  async getInstructors(): Promise<InstructorResponse[]> {
    // Get real instructors from database only
    const instructors = await this.prisma.instructor.findMany({
      where: { active: true },
      orderBy: { displayName: "asc" },
    });

    // Convert to API format
    return instructors.map((instructor) => ({
      id: instructor.id,
      displayName: instructor.displayName,
      available: instructor.active,
    }));
  }
}
