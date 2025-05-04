import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ImpersonateService } from './impersonate.service';
import { CreateImpersonateDto } from './dto/create-impersonate.dto';
import { UpdateImpersonateDto } from './dto/update-impersonate.dto';
import { AuthGuard } from '@nestjs/passport';
import { ImpersonateGuard } from './impersonate.guard';
import { AppRequest } from '@/src/utils/app-request';

@Controller('impersonate')
export class ImpersonateController {
  constructor(private readonly impersonateService: ImpersonateService) {}

  @UseGuards(ImpersonateGuard)
  @Get('')
  verifyImpersonate(@Req() req: any) {
    return this.impersonateService.verifiImpersonate(req.impersonate);
  }
}
