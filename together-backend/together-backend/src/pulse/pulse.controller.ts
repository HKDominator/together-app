// Wave 5 Step 6 (red stub): no @UseGuards, no delegation — tests will fail.
import { Body, Controller, Get, Put, Req } from '@nestjs/common'
import type { Request } from 'express'
import { PulseService } from './pulse.service'
import { UpsertCheckInDto } from './dto/upsert-check-in.dto'

@Controller('pulse')
export class PulseController {
  constructor(private readonly pulse: PulseService) {}

  @Get('today')
  getToday(@Req() _req: Request & { user: { id: string } }) {
    // stub
  }

  @Put('today/check-in')
  checkIn(
    @Body() _dto: UpsertCheckInDto,
    @Req() _req: Request & { user: { id: string } },
  ) {
    // stub
  }
}
