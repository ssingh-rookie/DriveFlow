import type { OnModuleInit } from "@nestjs/common";
import type { LessonsService } from "./lessons.service";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

interface CreateLessonRequest {
  instructorId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  pickupAddress: string;
  dropoffAddress?: string;
  notes?: string;
}

interface UpdateLessonRequest {
  status: string;
}

interface LessonResponse {
  id: string;
  studentId: string;
  instructorId: string;
  instructorName?: string;
  serviceId: string;
  serviceName?: string;
  startAt: string;
  endAt: string;
  pickupAddress: string;
  dropoffAddress?: string;
  notes?: string;
  status: string;
  createdAt: string;
  totalCents?: number;
}

@Controller({ path: "lessons", version: "1" })
@ApiTags("lessons")
export class SimpleLessonController implements OnModuleInit {
  constructor(private readonly lessonsService: LessonsService) {}

  async onModuleInit() {
    // Seed demo lessons on startup if database is empty
    await this.lessonsService.seedDemoLessons();
  }

  @Get()
  @ApiOperation({ summary: "Get lessons" })
  @ApiResponse({ status: 200, description: "Lessons retrieved" })
  async getLessons(): Promise<LessonResponse[]> {
    return this.lessonsService.getLessons();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create lesson" })
  @ApiResponse({ status: 201, description: "Lesson created" })
  async createLesson(
    @Body() request: CreateLessonRequest,
  ): Promise<LessonResponse> {
    return this.lessonsService.createLesson(request);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update lesson status" })
  @ApiResponse({ status: 200, description: "Lesson updated" })
  async updateLesson(
    @Param("id") id: string,
    @Body() request: UpdateLessonRequest,
  ): Promise<LessonResponse> {
    return this.lessonsService.updateLesson(id, request);
  }
}
