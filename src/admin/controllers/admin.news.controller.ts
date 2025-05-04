import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UnprocessableEntityException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import ApiResponse from '@/src/utils/api-response.util';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateNewsDto } from '@/src/news/dto/create.news.dto';
import { AdminService } from '../admin.service';
import { Permissions } from '../auth/decorators/permissions';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { Types } from 'mongoose';
import { TFAGuard } from '../auth/guards/TFA.guard';
import { AppRequest } from '@/src/utils/app-request';
import { TelegramNotificationInterceptor } from '../../interceptor/telegram.notification';

@Controller('admin/news')
@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
export class AdminNewsController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.NEWS }])
  async createNews(@Body() createNewsDto: CreateNewsDto) {
    //* If startTime is not provided, set it to the current date and time
    if (!createNewsDto.startTime) {
      createNewsDto.startTime = new Date();
    }
    const createdNews = await this.adminService.createNews(createNewsDto);
    return new ApiResponse(createdNews, 'News created successfully');
  }

  @Get()
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.NEWS }])
  async getAllActiveNews() {
    return new ApiResponse(await this.adminService.getAllActiveNews(true));
  }

  @Get(':id')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.NEWS }])
  async getNewsById(@Param('id') id: Types.ObjectId) {
    const news = await this.adminService.getNewsById(id);
    return new ApiResponse(news);
  }

  @Put(':id')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.NEWS }])
  async updateNews(
    @Param('id') id: Types.ObjectId,
    @Body() updateNewsDto: CreateNewsDto,
  ) {
    const updatedNews = await this.adminService.updateNews(id, updateNewsDto);
    return new ApiResponse(updatedNews, 'News updated successfully');
  }
  @UseGuards(TFAGuard)
  @Delete(':id')
  @Permissions([{ action: [ACTION.DELETE], module: PERMISSION_MODULE.NEWS }])
  async deleteNews(@Param('id') id: Types.ObjectId, @Req() req: AppRequest) {
    if (!req.admin.isSuperAdmin) {
      throw new UnprocessableEntityException(
        'You do not have the necessary permissions to delete this news item.',
      );
    }
    await this.adminService.deleteNews(id);
    return new ApiResponse(null, 'News deleted successfully');
  }
}
