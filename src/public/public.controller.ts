import { Controller, Get, Query } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('devices')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get()
  async getDevices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    return this.publicService.getPaginatedDevices(pageNum, limitNum);
  }
}
