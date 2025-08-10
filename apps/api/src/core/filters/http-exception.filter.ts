import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    this.logger.error(
      `HTTP Status: ${status} Error Message: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : ''
    );

    response.status(status).json({
      type: `https://example.com/probs/${this.getProblemType(status)}`,
      title: this.getProblemTitle(status),
      status,
      detail: message,
      instance: request.path,
      timestamp: new Date().toISOString(),
    });
  }

  private getProblemType(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST: return 'bad-request';
      case HttpStatus.UNAUTHORIZED: return 'unauthorized';
      case HttpStatus.FORBIDDEN: return 'forbidden';
      case HttpStatus.NOT_FOUND: return 'not-found';
      default: return 'internal-server-error';
    }
  }

  private getProblemTitle(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST: return 'Bad Request';
      case HttpStatus.UNAUTHORIZED: return 'Unauthorized';
      case HttpStatus.FORBIDDEN: return 'Forbidden';
      case HttpStatus.NOT_FOUND: return 'Not Found';
      default: return 'Internal Server Error';
    }
  }
}
