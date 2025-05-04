import { PartialType } from '@nestjs/mapped-types';
import { CreateSwapSettingDto } from './create-swap-setting.dto';

export class UpdateSwapSettingDto extends PartialType(CreateSwapSettingDto) {}
