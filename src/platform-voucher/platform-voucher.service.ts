import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlatformVoucher } from './schemas/platform-voucher.schema';
import { CreatePlatformVoucherDTO } from './dto/create.platform-voucher.dto';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import { aggregatePaginate } from '../utils/pagination.service';
import { pagination } from '../utils/helpers';

@Injectable()
export class PlatformVoucherService {
  constructor(
    @InjectModel(PlatformVoucher.name)
    private platformVoucherModel: Model<PlatformVoucher>,
  ) {}

  async createPlatformVoucher(
    createPlatformVoucherDTO: CreatePlatformVoucherDTO,
  ): Promise<PlatformVoucher> {
    const existingVoucher = await this.platformVoucherModel.findOne({
      code: createPlatformVoucherDTO.code,
    });

    if (existingVoucher) {
      throw new ConflictException('Voucher code already exists');
    }

    const createdVoucher = new this.platformVoucherModel(
      createPlatformVoucherDTO,
    );
    return createdVoucher.save();
  }

  async getPlatformVouchers(paginateDTO: PaginateDTO) {
    const { status, page, limit, query } = paginateDTO;
    // const match: Record<string, any> = {};

    // match.deletedAt = { $eq: null };

    // if (status) {
    //   match.status = status;
    // }

    // if (query) {
    //   match.$or = [
    //     { vouchers: { $regex: query, $options: 'i' } },
    //     { title: { $regex: query, $options: 'i' } },
    //     { userBID: { $regex: query, $options: 'i' } },
    //     { code: { $regex: query, $options: 'i' } },
    //   ];
    // }

    let whereConfig: any = { deletedAt: { $eq: null } };
    if (query) {
      const newQuery = query.split(/[ ,]+/);
      const voucherSearchQuery = newQuery.map((str) => ({
        vouchers: RegExp(str, 'i'),
      }));

      const titleSearchQuery = newQuery.map((str) => ({
        title: RegExp(str, 'i'),
      }));

      const blockchainIdSearchQuery = newQuery.map((str) => ({
        userBID: RegExp(str, 'i'),
      }));

      const codeSearchQuery = newQuery.map((str) => ({
        code: RegExp(str, 'i'),
      }));

      whereConfig = {
        ...whereConfig,
        $and: [
          {
            $or: [
              { $and: voucherSearchQuery },
              { $and: titleSearchQuery },
              { $and: blockchainIdSearchQuery },
              { $and: codeSearchQuery },
            ],
          },
        ],
      };
    }

    if (status) {
      whereConfig = {
        ...whereConfig,
        status: status,
      };
    }

    const paginate = await pagination({
      page,
      pageSize: limit,
      model: this.platformVoucherModel,
      condition: whereConfig,
      pagingRange: 5,
    });

    const list = await this.platformVoucherModel
      .find(whereConfig)
      .skip(paginate.offset)
      .limit(paginate.limit);

    return {
      list,
      totalCount: paginate.total,
      totalPages: paginate.metadata.page.totalPage,
      currentPage: paginate.metadata.page.currentPage,
    };

    // const pipeline = [
    //   {
    //     $match: match,
    //   },
    // ];

    // return await aggregatePaginate(
    //   this.platformVoucherModel,
    //   pipeline,
    //   page,
    //   limit,
    // );
  }

  async getPlatformVoucherById(id: string): Promise<PlatformVoucher> {
    const platformVoucher = await this.platformVoucherModel.findOne({
      _id: id,
      deletedAt: { $eq: null },
    });

    if (!platformVoucher) {
      throw new NotFoundException('Platform voucher not found');
    }

    return platformVoucher;
  }

  async updatePlatformVoucher(
    id: string,
    updatePlatformVoucherDTO: CreatePlatformVoucherDTO,
  ): Promise<PlatformVoucher> {
    try {
      const updatedVoucher = await this.platformVoucherModel.findByIdAndUpdate(
        id,
        updatePlatformVoucherDTO,
        { new: true, runValidators: true },
      );

      if (!updatedVoucher) {
        throw new NotFoundException('Platform voucher not found');
      }

      return updatedVoucher;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          'A platform voucher with this code already exists.',
        );
      }
      throw error;
    }
  }

  async deletePlatformVoucher(id: string): Promise<void> {
    const result = await this.platformVoucherModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true },
    );
    if (!result) {
      throw new NotFoundException('Platform voucher not found');
    }
  }

  async populatePlatformVoucher(data: any[]): Promise<void> {
    for (const item of data) {
      const {
        userBID,
        orderId,
        productId,
        validity,
        type,
        vouchers,
        createdAt,
        updatedAt,
      } = item;

      if (
        !userBID ||
        !orderId ||
        !productId ||
        !validity ||
        !type ||
        !vouchers ||
        !vouchers.length
      ) {
        continue;
      }

      for (const voucher of vouchers) {
        const platformVoucher = new this.platformVoucherModel({
          userBID,
          orderId,
          productId,
          validity,
          type,
          vouchers: voucher,
          createdAt,
          updatedAt,
        });

        try {
          await platformVoucher.save();
        } catch (error) {
          console.error(`Failed to save voucher ${voucher}:`, error);
        }
      }
    }
  }

  async getVouchersByUserBID(userBID: string): Promise<PlatformVoucher[]> {
    const vouchers = await this.platformVoucherModel
      .aggregate([
        {
          $match: { userBID, deletedAt: { $eq: null } },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .exec();

    if (!vouchers || vouchers.length === 0) {
      throw new NotFoundException(`No vouchers found for userBID: ${userBID}`);
    }

    return vouchers;
  }
}
