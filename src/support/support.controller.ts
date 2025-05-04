import { Controller, Get, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import ApiResponse from '../utils/api-response.util';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  async findAllActive() {
    const data = await this.supportService.findAllActive();
    return new ApiResponse(data);
  }
}
