import { Module } from '@nestjs/common';
import { FaqService } from './faq.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FAQ, FAQSchema } from './schemas/faq.schemas';
import { FaqController } from './faq.controller';
import { CacheService } from '../cache/cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: FAQ.name,
        schema: FAQSchema,
      },
    ]),
  ],
  controllers: [FaqController],
  providers: [FaqService, CacheService],
  exports: [FaqService],
})
export class FaqModule {}
