import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

@Controller('webhooks')
export class RealtimeController {
  constructor(private realtime: RealtimeService) {}

  @Post('events')
  @HttpCode(200)
  async receiveEvent(@Body() payload: any) {
    // payload expected: { id: string, ts: number, x: number, y: number, z?: number, mass?: number }
    await this.realtime.handleIncoming(payload);
    return { ok: true };
  }
}
