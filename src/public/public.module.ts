import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [HttpModule],
  controllers: [PublicController],
  providers: [PublicService, CacheService],
})
export class PublicModule {}
