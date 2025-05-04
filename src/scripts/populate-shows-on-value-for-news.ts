import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { News } from '../news/schemas/news.schema';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const NewsModel = appContext.get<Model<News>>(News.name + 'Model');

  const allNews = await NewsModel.find();
  try {
    allNews.map(async (news) => {
      const oneNews = await new NewsModel(news);
      oneNews.showsOn = {
        login: true,
        supernode: false,
      };
      await oneNews.save();
    });
  } catch (e) {
    console.error('Error populating database:', e);
    process.exit(1);
  }
  console.info('Good Job, All done!');
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
