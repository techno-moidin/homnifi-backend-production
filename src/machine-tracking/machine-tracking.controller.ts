import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MachineTrackingService } from './machine-tracking.service';
import { CreateMachineTrackingDto } from './dto/create-machine-tracking.dto';
import { UpdateMachineTrackingDto } from './dto/update-machine-tracking.dto';

@Controller('machine-tracking')
export class MachineTrackingController {
  constructor(
    private readonly machineTrackingService: MachineTrackingService,
  ) {}
}
