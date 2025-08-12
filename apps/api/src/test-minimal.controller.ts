import { Controller, Get } from '@nestjs/common'

@Controller()
export class TestMinimalController {
  @Get()
  getHello() {
    return { message: 'Hello World!' }
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }
}
