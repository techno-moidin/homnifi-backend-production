import { CreateTokenDto } from './create-token.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateTokenDto extends PartialType(CreateTokenDto) {}
