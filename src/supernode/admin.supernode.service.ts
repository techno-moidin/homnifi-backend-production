import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  getDay,
  startOfWeek,
} from 'date-fns';
import {
  ClientSession,
  Connection,
  Model,
  PipelineStage,
  Types,
} from 'mongoose';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';

import { BaseReferralLevelSetting } from './schemas/base-referral-level-settings.schema';
import { BaseReferralSetting } from './schemas/base-referral-setting.schema';
import { BuilderGenerationLevelSetting } from './schemas/builder-generation-level-settings.schema';
import { BuilderGenerationSetting } from './schemas/builder-generation-settings';
import { BuilderReferralSetting } from './schemas/builder-referral-settings.schema';
import { SnSetting } from './schemas/sn-settings.schema';
import { SngpDistribution } from './schemas/sngp-distribution.schema';
import { SngpRewards } from './schemas/sngp-rewards.schema';
import { Sngp } from './schemas/sngp.schema';
import { UserGask } from './schemas/user-gask.schema';
import { UserSngp } from './schemas/user-sngp.schema';

import {
  CreateBasRefSettingDto,
  CreateBuilderGenerationSettingDto,
  CreateMatchingBonusSettingDto,
} from './dto/create-base-ref-setting.dto';
import { CreateBuilderReferralSettingsDto } from './dto/builder-referral-settings.schema.dto';
import { SupernodeAdminLog } from '../admin/schemas/admin.supernode.logs.schema';

@Injectable()
export class AdminSupernodeService {
  constructor(
    @InjectModel(UserGask.name)
    private readonly userGaskModel: Model<UserGask>,
    @InjectModel(BaseReferralSetting.name)
    private readonly baseReferralSettingModel: Model<BaseReferralSetting>,
    @InjectModel(BaseReferralLevelSetting.name)
    private readonly baseReferralLevelSettingsModel: Model<BaseReferralLevelSetting>,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(CloudKMachine.name)
    public machineModel: Model<CloudKMachine>,
    @InjectModel(SnSetting.name)
    public supernodeSettingModel: Model<SnSetting>,
    @InjectModel(BuilderGenerationSetting.name)
    public builderGenerationSettingModel: Model<BuilderGenerationSetting>,
    @InjectModel(BuilderGenerationLevelSetting.name)
    public builderGenerationLevelSettingModel: Model<BuilderGenerationLevelSetting>,
    @InjectModel(BuilderReferralSetting.name)
    public builderReferralSettingModel: Model<BuilderReferralSetting>,
    // SNGP models
    @InjectModel(Sngp.name)
    public sngpModel: Model<Sngp>,
    @InjectModel(UserSngp.name)
    public userSngpModel: Model<UserSngp>,
    @InjectModel(SngpRewards.name)
    public sngpRewardsModel: Model<SngpRewards>,
    @InjectModel(SngpDistribution.name)
    public sngpDistributionModel: Model<SngpDistribution>,
    // End SNGP models
  ) {}

  async logChange(type: string, previousData: any) {
    const log = new SupernodeAdminLog({
      type,
      previousData,
    });

    await log.save();
  }

  async getBaseReferralSettings() {
    const currentSetting = await this.baseReferralSettingModel.findOne({
      isActive: true,
      deletedAt: null,
    });

    const levelSetting = await this.baseReferralLevelSettingsModel
      .find({
        setting: currentSetting._id,
      })
      .sort({
        level: 1,
      });

    return {
      setting: currentSetting,
      levels: levelSetting,
    };
  }

  async createBaseReferralSetting(settingsDto: CreateBasRefSettingDto) {
    const levelSettings = settingsDto.levels;
    const allLevels = [];
    for (const levelSetting of levelSettings) {
      if (allLevels.includes(levelSetting.level)) {
        throw new HttpException('Duplicate level found', 400);
      }
      allLevels.push(levelSetting.level);
    }

    const session = await this.connection.startSession();
    await session.startTransaction();

    try {
      await this.baseReferralSettingModel
        .updateMany({
          isActive: false,
        })
        .session(session);

      const newSetting = await this.baseReferralSettingModel.create(
        [
          {
            note: settingsDto.note,
            totalLevels: allLevels.length,
            isActive: true,
          },
        ],
        { session },
      );

      const newLevelSettings = levelSettings.map((levelSetting) => ({
        setting: newSetting[0]._id,
        ...levelSetting,
      }));

      await this.baseReferralLevelSettingsModel.create(newLevelSettings, {
        session,
      });
      await session.commitTransaction();
      return;
    } catch (error) {
      await session.abortTransaction();
      throw new HttpException(error.message, 500);
    } finally {
      session.endSession();
    }
  }

  async updateBaseReferralSetting(updateDto: CreateBasRefSettingDto) {
    // Find the active base referral setting
    const existingSetting = await this.baseReferralSettingModel.findOne({
      isActive: true,
      deletedAt: null,
    });

    if (!existingSetting) {
      throw new NotFoundException('Active base referral setting not found');
    }

    // Update the base referral setting
    await this.baseReferralSettingModel.updateOne(
      { _id: existingSetting._id, isActive: true, deletedAt: null },
      {
        $set: {
          note: updateDto.note,
          totalLevels: updateDto.levels.length,
          updatedAt: new Date(),
        },
      },
    );

    // Update the level settings
    for (const levelSetting of updateDto.levels) {
      await this.baseReferralLevelSettingsModel.updateOne(
        {
          setting: existingSetting._id,
          level: levelSetting.level,
          deletedAt: null,
        },
        {
          $set: {
            firstLevelNodes: levelSetting.firstLevelNodes,
            percentage: levelSetting.percentage,
            updatedAt: new Date(),
          },
        },
      );
    }
    return existingSetting;
  }

  async createBuilderGenerationSettings(
    settingsDto: CreateBuilderGenerationSettingDto,
    userId,
  ) {
    const productSettings = settingsDto.products;
    const allProduct = [];
    for (const productSetting of productSettings) {
      if (allProduct.includes(productSetting.product)) {
        throw new HttpException('Duplicate level found', 400);
      }
      allProduct.push(productSetting.product);
    }

    const session = await this.connection.startSession();
    await session.startTransaction();
    try {
      await this.builderGenerationSettingModel
        .updateMany({
          isActive: false,
        })
        .session(session);

      const newSetting = await this.builderGenerationSettingModel.create(
        [
          {
            note: settingsDto.note,
            matchingBonus: settingsDto.matchingBonus,
            isActive: true,
          },
        ],
        { session },
      );

      const newProductSettings = productSettings.map((productSetting) => ({
        ...productSetting,
        setting: newSetting[0]._id,
        isActive: true,
        admin: userId,
      }));

      await this.builderGenerationLevelSettingModel
        .updateMany({
          isActive: false,
        })
        .session(session);

      await this.builderGenerationLevelSettingModel.insertMany(
        newProductSettings,
        {
          session,
        },
      );
      await session.commitTransaction();
      return;
    } catch (error) {
      await session.abortTransaction();
      throw new HttpException(error.message, 500);
    } finally {
      session.endSession();
    }
  }

  // update base referral setting

  async getBuilderGenerationSettings() {
    const currentSetting = await this.builderGenerationSettingModel.findOne({
      isActive: true,
      deletedAt: null,
    });

    const levelSetting = await this.builderGenerationLevelSettingModel
      .find({
        setting: currentSetting._id,
        deletedAt: null,
      })
      .sort({
        level: 1,
      })
      .populate({
        path: 'product',
        select: 'name imageUrl',
      });
    console.log(levelSetting);

    return {
      setting: currentSetting,
      levels: levelSetting,
    };
  }

  //   put api for builder generation settings
  async updateBuilderGenerationSettings(productId: string, percentage: number) {
    const existingProductSetting =
      await this.builderGenerationLevelSettingModel.findOne({
        product: productId,
        isActive: true,
        deletedAt: null,
      });

    if (!existingProductSetting) {
      throw new NotFoundException('Product setting not found');
    }

    const existingSetting = await this.builderGenerationSettingModel.findOne({
      _id: existingProductSetting.setting,
      isActive: true,
      deletedAt: null,
    });

    if (!existingSetting) {
      throw new NotFoundException('Builder generation setting not found');
    }

    // Update the product setting
    await this.builderGenerationLevelSettingModel.updateOne(
      {
        product: productId,
        setting: existingSetting._id,
        isActive: true,
        deletedAt: null,
      },
      {
        $set: {
          percentage: percentage,
          updatedAt: new Date(),
        },
      },
    );

    return existingSetting;
  }

  async deleteBuilderGenerationSettings(id: string) {
    const existingSetting = await this.builderGenerationSettingModel.findOne({
      _id: new Types.ObjectId(id),
      deletedAt: null,
    });

    if (!existingSetting) {
      throw new NotFoundException('Builder generation setting not found');
    }

    // Set isActive to false and set deletedAt for the builder generation setting
    existingSetting.deletedAt = new Date();
    existingSetting.isActive = false;
    await existingSetting.save();

    await this.builderGenerationLevelSettingModel.updateOne(
      { setting: existingSetting._id, isActive: true, deletedAt: null },
      { $set: { isActive: false, deletedAt: new Date() } },
    );

    return existingSetting;
  }

  async createBuilderReferralSettings(dto: CreateBuilderReferralSettingsDto) {
    // Deactivate existing settings if needed
    await this.builderReferralSettingModel.updateMany(
      { isActive: true },
      { isActive: false },
    );

    // Create new settings
    const newSetting = new this.builderReferralSettingModel({
      ...dto,
      isActive: true,
    });

    return await newSetting.save();
  }

  async getBuilderReferralSettings() {
    const builderReferralSetting =
      await this.builderReferralSettingModel.findOne(
        {
          isActive: true,
          deletedAt: null,
        },
        {
          deletedAt: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      );
    if (!builderReferralSetting)
      throw new HttpException(
        'Builder referral settings have not been configured by the admin yet.',
        400,
      );

    return {
      setting: builderReferralSetting,
    };
  }

  // [put /builder-generation-settings]
  async updateBuilderReferralSettings(dto: CreateBuilderReferralSettingsDto) {
    try {
      const existingSetting = await this.builderReferralSettingModel.findOne(
        {
          isActive: true,
          deletedAt: null,
        },
        {
          deletedAt: 0,
          createdAt: 0,
          updatedAt: 0,
        },
      );

      if (!existingSetting) {
        throw new NotFoundException('Builder referral setting not found');
      }
      existingSetting.bonusThresholdPercentage = dto.bonusThresholdPercentage;
      existingSetting.bonusMultiplier = dto.bonusMultiplier;
      existingSetting.fiftyPercentRuleMultiplier =
        dto.fiftyPercentRuleMultiplier;

      await existingSetting.save();

      return existingSetting;
    } catch (error) {
      throw new HttpException(error.message, 500);
    }
  }

  // [Delete /builder-generation-settings]
  async deleteBuilderReferralSettings() {
    const setting = await this.builderReferralSettingModel.findOne({
      isActive: true,
      deletedAt: null,
    });

    if (!setting) {
      throw new NotFoundException('Builder referral setting not found');
    }

    setting.deletedAt = new Date();
    setting.isActive = false;

    await setting.save();

    return setting;
  }

  //Post matcing bonus
  async createMatchingBonusSettings(
    createMatchingBonusSettingDto: CreateMatchingBonusSettingDto,
  ) {
    const activeSetting = await this.builderGenerationSettingModel.findOne(
      {
        isActive: true,
        deletedAt: null,
      },
      {
        deletedAt: 0,
        note: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    );

    if (!activeSetting) {
      throw new NotFoundException(
        'Active builder generation setting not found',
      );
    }
    activeSetting.matchingBonus = createMatchingBonusSettingDto.matchingBonus;
    await activeSetting.save();
    return activeSetting;
  }

  // Get matching bonus

  async getMatchingBonusSettings() {
    const activeSetting = await this.builderGenerationSettingModel.findOne(
      {
        isActive: true,
        deletedAt: null,
      },
      {
        deletedAt: 0,
        _id: 0,
        note: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    );

    if (!activeSetting) {
      throw new NotFoundException(
        'Active builder generation setting not found',
      );
    }

    return activeSetting;
  }
}
