import { CacheService } from '@/src/cache/cache.service';
import { HttpException, Inject, Injectable } from '@nestjs/common';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FAQ } from './schemas/faq.schemas';
import { FaqI } from './faq.interface';
import { FAQModulesEnum } from './enums/faq.modules';
import { CACHE_TYPE } from '../cache/Enums/cache.enum';

@Injectable()
export class FaqService {
  constructor(
    @InjectModel(FAQ.name)
    private readonly faqModel: Model<FaqI>,
    private cacheService: CacheService,
  ) {}

  async createFaq(
    userId: Types.ObjectId,
    module: string,
    createFaqDto: CreateFaqDto,
  ) {
    if (!Object.values(FAQModulesEnum).includes(module as FAQModulesEnum)) {
      throw new HttpException('Invalid module name provided', 400);
    }

    createFaqDto['addedBy'] = userId;
    createFaqDto['module'] = module;
    return await this.faqModel.create(createFaqDto);
  }

  async findByModule(faqModule: FAQModulesEnum) {
    const faqsCache = await this.cacheService.getCacheUser({
      type: CACHE_TYPE.FAQS,
      user: faqModule,
    });
    if (faqsCache) return faqsCache;
    // get data from db
    const faqs = await this.faqModel
      .find({ module: faqModule })
      .select('-module')
      .exec();
    // set into cache
    await this.cacheService.setCacheUser({
      type: CACHE_TYPE.FAQS,
      user: String(faqModule),
      data: faqs,
    });
    return faqs;
  }

  async update(
    userId: Types.ObjectId,
    id: Types.ObjectId,
    updateFaqDto: UpdateFaqDto,
  ) {
    const updatedFaq = await this.faqModel.findOneAndUpdate(
      new Types.ObjectId(id),
      {
        ...updateFaqDto,
        updatedBy: userId,
      },
      { new: true },
    );
    await this.cacheService.deleteUserCache({
      type: CACHE_TYPE.FAQS,
      user: String(updatedFaq.module),
    });
    return updatedFaq;
  }

  softDelete(userId: Types.ObjectId, id: Types.ObjectId) {
    const deletedFaq = this.faqModel.findOneAndUpdate(
      new Types.ObjectId(id),
      {
        deletedAt: new Date(),
        deletedBy: userId,
      },
      { new: true },
    );
    return deletedFaq;
  }

  async findAll() {
    return this.faqModel.find().exec();
  }
}
