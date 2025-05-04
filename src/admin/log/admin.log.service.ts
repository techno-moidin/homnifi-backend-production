import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminLog } from './schema/admin.log.schema';
import { InjectModel } from '@nestjs/mongoose';
import { catchException } from '../global/helpers/handle.exceptionh.helper';
import { Model, PipelineStage, Types } from 'mongoose';
import { PaginateDTO } from '../global/dto/paginate.dto';
import { aggregatePaginate } from '@/src/utils/pagination.service';

@Injectable()
export class AdminLogService {
  constructor(
    @InjectModel(AdminLog.name)
    private readonly adminLogModel: Model<AdminLog>,
  ) {}

  async create(data) {
    try {
      const createdAdminLog = await this.adminLogModel.create(data);
      return {
        message: 'Admin Log created successfully',
        admin_log: createdAdminLog,
      };
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      } else {
        catchException(error);
      }
    }
  }

  async getAdminLogs(paginateDTO: PaginateDTO) {
    const { page, limit, query, method, fromDate, toDate, module, role } =
      paginateDTO;

    try {
      const matchConditions: any[] = [
        { deletedAt: { $eq: null } },
        { module: { $ne: 'ADMIN_AUTH' } },
      ];
      let searchCondition,
        roleFilter = {};

      if (fromDate) {
        const from = new Date(fromDate);
        const to = toDate ? new Date(toDate) : new Date();
        to.setUTCHours(23, 59, 59, 999);
        matchConditions.push({
          createdAt: {
            $gte: from,
            $lte: to,
          },
        });
      }

      if (role) {
        roleFilter = { 'adminDetails.role': new Types.ObjectId(role) };
      }

      if (method) {
        matchConditions.push({ method });
      }

      if (module) {
        matchConditions.push({ module });
      }

      if (query) {
        searchCondition = {
          $or: [
            { endPoint: { $regex: query, $options: 'i' } },
            { 'adminDetails.email': { $regex: query, $options: 'i' } },
            { 'adminDetails.name': { $regex: query, $options: 'i' } },
            { 'adminDetails.firstName': { $regex: query, $options: 'i' } },
            { 'adminDetails.lastName': { $regex: query, $options: 'i' } },
            { 'adminDetails.fullName': { $regex: query, $options: 'i' } },
          ],
        };
      }

      const pipeline: PipelineStage[] = [
        { $match: { $and: matchConditions } },
        {
          $lookup: {
            from: 'admins',
            localField: 'admin',
            foreignField: '_id',
            as: 'adminDetails',
          },
        },
        {
          $unwind: {
            path: '$adminDetails',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            'adminDetails.fullName': {
              $concat: [
                '$adminDetails.firstName',
                ' ',
                '$adminDetails.lastName',
              ],
            },
          },
        },
        { $match: roleFilter },
        { $match: { ...searchCondition } },
        {
          $project: {
            module: 1,
            note: 1,
            ipAddress: 1,
            macAddress: 1,
            method: 1,
            endPoint: 1,
            admin: '$adminDetails',
            deviceData: 1,
            location: 1,
            payload: 1,
            createdAt: 1,
          },
        },
        { $sort: { createdAt: -1 } },
      ];

      const result = await aggregatePaginate(
        this.adminLogModel,
        pipeline,
        Number(page),
        Number(limit),
      );

      return result;
    } catch (e) {
      catchException(e);
    }
  }

  async findOne(id: string) {
    try {
      const filter = { _id: id, deletedAt: { $eq: null } };
      const results = await this.adminLogModel.find(filter);

      if (!results) {
        throw new NotFoundException(`No record found at id: ${id}`);
      }

      return {
        message: `Record at id ${id}`,
        logs: results,
      };
    } catch (error) {
      catchException(error);
    }
  }
}
