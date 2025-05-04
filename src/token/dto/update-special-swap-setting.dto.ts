import { PartialType } from '@nestjs/mapped-types';
import { CreateSpecialSwapSettingDto } from '@/src/token/dto/create-special-swap-setting.dto';

export class UpdateSpecialSwapSettingDto extends PartialType(
  CreateSpecialSwapSettingDto,
) {}
