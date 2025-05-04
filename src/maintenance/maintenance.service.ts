import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { InjectModel } from '@nestjs/mongoose';
import {
  MainTenance,
  MAINTENANCE_DELETED_METHOD,
} from './schema/maintenance.schema';
import mongoose, { Model, PipelineStage } from 'mongoose';
import ApiResponse from '../utils/api-response.util';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import { aggregatePaginate } from '../utils/pagination.service';
import { catchException } from '../admin/global/helpers/handle.exceptionh.helper';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectModel(MainTenance.name) private maintenanceModel: Model<MainTenance>,
  ) {}

  async create(createMaintenanceDto: CreateMaintenanceDto) {
    await this.maintenanceModel.updateMany(
      {
        solvedAt: { $eq: null },
      },
      {
        $set: {
          deletedAt: new Date(),
          deletedMethod: MAINTENANCE_DELETED_METHOD.SYSTEM,
        },
      },
    );

    return await this.maintenanceModel.create(createMaintenanceDto);
  }

  async getMaintenance() {
    const currentTime = new Date();
    // console.log(new Date());`
    // 
    try {
      const maintenances = await this.maintenanceModel
        .findOne({
          startDateTime: { $lte: currentTime },
          endDateTime: { $gte: currentTime },
          solvedAt: null,
        })
        .sort({ _id: -1 });
      // 
      // console.log(new Date());

      return maintenances;
    } catch (error) {
      
      throw new Error('Error getting maintenance:');
    }
  }
  async createMaintenance(createMaintenanceDto: CreateMaintenanceDto) {
    try {
      const { startDateTime, endDateTime, ...rest } = createMaintenanceDto;
      // Ensure dates are valid
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);

      // Set start time to 12:00 AM UTC
      start.setUTCHours(0, 0, 0, 0);

      // Set end time to 11:59 PM UTC
      end.setUTCHours(23, 59, 59, 999);

      const adjustedMaintanenceDto = {
        ...rest,
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString(),
      };

      // Create the maintenance entry
      const maintenance = await this.maintenanceModel.create(
        adjustedMaintanenceDto,
      );

      return maintenance;
    } catch (error) {
      // Log error details
      console.error('Error creating maintenance entry:', error);

      // Rethrow or handle error appropriately
      throw new BadRequestException('Failed to create maintenance entry');
    }
  }
  async getAllMaintenance(paginateDTO: PaginateDTO) {
    const { page, limit } = paginateDTO;
    try {
      const pipeline: PipelineStage[] = [{ $sort: { createdAt: -1 } }];

      const result = await aggregatePaginate(
        this.maintenanceModel,
        pipeline,
        Number(page),
        Number(limit),
      );

      return result;
    } catch (e) {
      catchException(e);
    }
  }

  async stopMintenance(id: string) {
    const maintenanceId = new mongoose.Types.ObjectId(id);
    await this.maintenanceModel.findByIdAndUpdate(
      maintenanceId,
      {
        $set: {
          solvedAt: new Date(),
          solvedMethod: MAINTENANCE_DELETED_METHOD.ADMIN,
        },
      },
      { new: true },
    );
    return new ApiResponse({}, 'Maintenance stopped successfully');
  }
}
