import { CreateFaqDto } from '@/src/faq/dto/create-faq.dto';
import { UpdateFaqDto } from '@/src/faq/dto/update-faq.dto';
import { FaqService } from '@/src/faq/faq.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Types } from 'mongoose';
// import { AdminJwtAuthGuard } from '../auth/admin.auth.guard';
import { FAQModulesEnum } from '@/src/faq/enums/faq.modules';
import ApiResponse from '@/src/utils/api-response.util';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AppRequest } from '@/src/utils/app-request';
import { Permissions } from '../auth/decorators/permissions';
import { ACTION, PERMISSION_MODULE } from '@/src/enums/permission';
import { TelegramNotificationInterceptor } from '@/src/interceptor/telegram.notification';

@Controller('admin/faq')
@UseGuards(AdminGuard)
@UseInterceptors(TelegramNotificationInterceptor)
export class AdminFaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post('modules/:module')
  @Permissions([{ action: [ACTION.WRITE], module: PERMISSION_MODULE.FAQ }])
  async createTransferFaq(
    @Req() req: AppRequest,
    @Param('module') module: FAQModulesEnum,
    @Body() createFaqDto: CreateFaqDto,
  ) {
    const userId = req.admin.id;
    const createdFAQ = await this.faqService.createFaq(
      userId,
      module,
      createFaqDto,
    );
    return new ApiResponse(createdFAQ, 'New faq created successfully');
  }

  @Get('modules/:module')
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.FAQ }])
  async getByModule(@Param('module') module: FAQModulesEnum) {
    const data = await this.faqService.findByModule(module);
    return new ApiResponse(data, 'FAQs retrieved successfully');
  }

  @Put(':id')
  @Permissions([{ action: [ACTION.UPDATE], module: PERMISSION_MODULE.FAQ }])
  async update(
    @Req() req: any,
    @Param('id') id: Types.ObjectId,
    @Body() updateFaqDto: UpdateFaqDto,
  ) {
    const userId = req.admin.id;
    const updatedFaq = await this.faqService.update(userId, id, updateFaqDto);
    return new ApiResponse(updatedFaq, 'FAQ updated successfully');
  }

  @Delete(':id')
  @Permissions([{ action: [ACTION.DELETE], module: PERMISSION_MODULE.FAQ }])
  async delete(@Req() req: any, @Param('id') id: Types.ObjectId) {
    const userId = req.admin.id;
    await this.faqService.softDelete(userId, id);
    return new ApiResponse(null, 'FAQ deleted successfully');
  }

  @Get()
  @Permissions([{ action: [ACTION.READ], module: PERMISSION_MODULE.FAQ }])
  async getAll() {
    const faqs = await this.faqService.findAll();
    return new ApiResponse(faqs, 'All FAQs retrieved successfully');
  }
}
