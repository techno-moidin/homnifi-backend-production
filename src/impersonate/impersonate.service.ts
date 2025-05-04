import { Injectable } from '@nestjs/common';
import mongoose, { Model, ObjectId, Types } from 'mongoose';
import { AuthService } from '../auth/auth.service';
import { ImpersonateHistroty } from '../admin/schemas/impersonate-histroty.schema';
import { aggregatePaginate } from '../utils/pagination.service';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import { InjectModel } from '@nestjs/mongoose';
import { ImpersonateLog } from './schemas/impersonate-log.schema';

@Injectable()
export class ImpersonateService {
  constructor(
    private readonly authService: AuthService,
    @InjectModel(ImpersonateLog.name)
    private impersonateLog: Model<ImpersonateLog>,
  ) {}

  verifiImpersonate(impersonate: ImpersonateHistroty) {
    return this.authService.getImpersonateTokens(impersonate);
  }

  async getImpersonateLogHistory(paginateDTO: PaginateDTO, id?: string) {
    const { page, limit, query, fromDate, toDate, method, module } =
      paginateDTO;
    const matchConditions: any[] = [];

    if (query) {
      matchConditions.push({
        $or: [
          { path: { $regex: query, $options: 'i' } },
          { 'user.blockchainId': { $regex: query, $options: 'i' } },
          { 'user.email': { $regex: query, $options: 'i' } },
          { 'user.firstName': { $regex: query, $options: 'i' } },
          { 'user.lastName': { $regex: query, $options: 'i' } },
          { 'user.username': { $regex: query, $options: 'i' } },
          { 'admin.email': { $regex: query, $options: 'i' } },
          { 'admin.firstName': { $regex: query, $options: 'i' } },
          { 'admin.lastName': { $regex: query, $options: 'i' } },
          { 'admin.username': { $regex: query, $options: 'i' } },
        ],
      });
    }

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

    if (method) {
      matchConditions.push({ method });
    }

    if (module) {
      matchConditions.push({ module: { $regex: module, $options: 'i' } });
    }

    if (id) {
      matchConditions.push({ 'user._id': new Types.ObjectId(id) });
    }

    const pipeline = [];

    pipeline.push(
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'admins',
          localField: 'admin',
          foreignField: '_id',
          as: 'admin',
        },
      },
      {
        $unwind: { path: '$admin', preserveNullAndEmptyArrays: true },
      },
    );

    if (matchConditions.length > 0) {
      pipeline.push({ $match: { $and: matchConditions } });
    }

    pipeline.push({
      $project: {
        path: 1,
        module: 1,
        method: 1,
        payload: 1,
        reason: 1,
        'user.blockchainId': 1,
        'user.email': 1,
        'user.firstName': 1,
        'user.lastName': 1,
        'user.username': 1,
        'admin.email': 1,
        'admin.firstName': 1,
        'admin.lastName': 1,
        'admin.username': 1,
        'admin.isSuperAdmin': 1,
        createdAt: 1,
      },
    });

    return await aggregatePaginate(this.impersonateLog, pipeline, page, limit);
  }
}
