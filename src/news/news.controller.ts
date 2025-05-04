import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create.news.dto';
import ApiResponse from '../utils/api-response.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { toObjectId } from '../utils/helpers';
import { Types } from 'mongoose';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getAllUserNews(
    @Req() req: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ): Promise<ApiResponse> {
    const userId = req.user.userId;
    const userNews = await this.newsService.getAllUserNews(
      userId,
      limit || '10',
      page || '1',
    );
    return new ApiResponse(userNews);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/:id')
  async createUserNews(@Param('id') id: string) {
    const userId = new Types.ObjectId(id);
    const createdUserNews = await this.newsService.createUserNews(userId);
    return new ApiResponse(createdUserNews, 'User news created successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Post('read/:id')
  async markAsRead(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<ApiResponse> {
    const userId = req.user.userId;
    const newsId = new Types.ObjectId(id);
    const updatedNews = await this.newsService.markAsRead(userId, newsId);
    return new ApiResponse(updatedNews, 'News marked as read successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Post('all-read')
  async markAllAsRead(@Req() req: any): Promise<ApiResponse> {
    const userId = req.user.userId;
    const result = await this.newsService.markAllAsRead(userId);
    return new ApiResponse(result, 'All news marked as read successfully');
  }
}
