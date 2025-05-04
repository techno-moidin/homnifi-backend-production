import { PartialType } from '@nestjs/mapped-types';
import { CreateImpersonateDto } from './create-impersonate.dto';

export class UpdateImpersonateDto extends PartialType(CreateImpersonateDto) {}
