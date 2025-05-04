import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Support, SUPPORT_STATUS } from './schemas/support.schema';
import { CreateSupportDto } from './dto/create-support.dto';
import { UpdateSupportDto } from './dto/update-support.dto';

@Injectable()
export class SupportService {
  constructor(
    @InjectModel(Support.name)
    private readonly supportModel: Model<Support>,
  ) {}

  async create(createSupportDto: CreateSupportDto): Promise<Support> {
    const createdSupport = new this.supportModel(createSupportDto);
    return createdSupport.save();
  }

  async findAll(): Promise<Support[]> {
    return this.supportModel
      .find()
      .sort({ ordinator: 1 })
      .select('name link icon logo background ordinator status')
      .exec();
  }

  async findAllActive(): Promise<Support[]> {
    return this.supportModel
      .find({ status: SUPPORT_STATUS.ACTIVE })
      .sort({ ordinator: 1 })
      .select('name link icon logo background ordinator')
      .exec();
  }

  async findOne(id: string): Promise<Support> {
    return this.supportModel.findById(id).exec();
  }

  async update(
    id: string,
    updateSupportDto: UpdateSupportDto,
  ): Promise<Support> {
    return this.supportModel
      .findByIdAndUpdate(id, updateSupportDto, { new: true })
      .exec();
  }

  async toggleStatus(id: string): Promise<Support> {
    const support = await this.supportModel.findById(id);
    if (!support) {
      throw new NotFoundException('Support not found');
    }
    const isActive = support.status === SUPPORT_STATUS.ACTIVE;
    support.status = isActive ? SUPPORT_STATUS.INACTIVE : SUPPORT_STATUS.ACTIVE;
    return support.save();
  }
}
