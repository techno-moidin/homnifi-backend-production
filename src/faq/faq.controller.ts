import { Controller, Get, Param } from '@nestjs/common';
import { FaqService } from './faq.service';
import { FAQModulesEnum } from './enums/faq.modules';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get('modules/:module')
  async getByModule(@Param('module') module: FAQModulesEnum) {
    return this.faqService.findByModule(module);
  }
}
