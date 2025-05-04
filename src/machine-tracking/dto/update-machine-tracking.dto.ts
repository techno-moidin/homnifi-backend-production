import { PartialType } from '@nestjs/mapped-types';
import { CreateMachineTrackingDto } from './create-machine-tracking.dto';

export class UpdateMachineTrackingDto extends PartialType(CreateMachineTrackingDto) {}
