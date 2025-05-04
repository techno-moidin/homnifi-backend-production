import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { News, NewsSchema } from './schemas/news.schema';
import { GatewayService } from '../gateway/gateway.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserNews, UserNewsSchema } from './schemas/user-news.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: News.name, schema: NewsSchema }]),
    MongooseModule.forFeature([
      { name: UserNews.name, schema: UserNewsSchema },
    ]),
  ],
  exports: [NewsService],
  providers: [NewsService, GatewayService],
  controllers: [NewsController],
})
export class NewsModule {}
