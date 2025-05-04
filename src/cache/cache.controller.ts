import { Controller, Get, Query } from '@nestjs/common';
import { CacheService } from './cache.service';
import ApiResponse from '../utils/api-response.util';

@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}
  //   @Get('pattern')
  //   async getAdmins() {
  //     const list = await this.cacheService.deleteCacheUserWithPattern('as');
  //     return new ApiResponse(list);
  //   }
}
