import { OpenAPIRegistry, OpenApiGeneratorV3, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

/** ===== Example schemas (replace with real ones) ===== */
export const BookingCreate = z.object({
  studentId: z.string().uuid(),
  instructorId: z.string().uuid(),
  startAt: z.string().datetime(),
  durationMin: z.number().int().positive()
}).openapi('BookingCreate');

export const Booking = BookingCreate.extend({
  id: z.string().uuid(),
  status: z.enum(['requested','confirmed','in_progress','completed','cancelled'])
}).openapi('Booking');

export const ProblemDetails = z.object({
  type: z.string().optional(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
  instance: z.string().optional()
}).passthrough().openapi('ProblemDetails');

/** ===== Registry: register schemas + endpoints ===== */
const registry = new OpenAPIRegistry();

registry.register('Booking', Booking);
registry.register('ProblemDetails', ProblemDetails);

registry.registerPath({
  method: 'post',
  path: '/v1/bookings',
  request: {
    body: {
      content: { 'application/json': { schema: BookingCreate, example: {
        studentId: '11111111-1111-1111-1111-111111111111',
        instructorId: '22222222-2222-2222-2222-222222222222',
        startAt: new Date().toISOString(),
        durationMin: 90
      } } }
    }
  },
  responses: {
    201: {
      description: 'Created',
      content: { 'application/json': { schema: Booking } }
    },
    400: {
      description: 'Bad Request',
      content: { 'application/json': { schema: ProblemDetails } }
    }
  },
  tags: ['Bookings']
});

/** ===== Generate final OpenAPI document ===== */
const generator = new OpenApiGeneratorV3(registry.definitions);
export const openApiDoc = generator.generateDocument({
  openapi: '3.0.3',
  info: { title: 'DriveFlow API', version: '1.0.0' },
  paths: {},
  components: {}
});
