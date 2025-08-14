import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'

interface CreateLessonRequest {
  studentId: string
  instructorId: string
  serviceId: string
  startAt: string
  endAt: string
}

interface LessonResponse {
  id: string
  studentId: string
  instructorId: string
  serviceId: string
  startAt: string
  endAt: string
  status: string
  createdAt: string
}

@Controller({ path: 'lessons', version: '1' })
@ApiTags('lessons')
export class SimpleLessonController {

  @Get()
  @ApiOperation({ summary: 'Get lessons' })
  @ApiResponse({ status: 200, description: 'Lessons retrieved' })
  async getLessons(): Promise<LessonResponse[]> {
    return []
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create lesson' })
  @ApiResponse({ status: 201, description: 'Lesson created' })
  async createLesson(@Body() request: CreateLessonRequest): Promise<LessonResponse> {
    return {
      id: 'lesson_' + Date.now(),
      studentId: request.studentId,
      instructorId: request.instructorId,
      serviceId: request.serviceId,
      startAt: request.startAt,
      endAt: request.endAt,
      status: 'draft',
      createdAt: new Date().toISOString(),
    }
  }
}