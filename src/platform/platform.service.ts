import {
  HttpException,
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AdminCreatePlatformDto } from './dto/admin.create.platform.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Platform } from './schemas/platform.schema';
import mongoose, { Model, Types } from 'mongoose';
import ApiResponse from '../utils/api-response.util';
import { AdminDeletePlatformDto } from './dto/admin.delete.platform.dto';
import { AdminUpdatePlatformDto } from './dto/admin.update.platform.dto';
import { EnrolledPlatform } from './schemas/enrolled-platform.schema';
import { FavoritePlatform } from './schemas/favorite-platform.schema';
import { UserSetFavoritePlatformDto } from './dto/user.set.favorite.platform.dto';
import { UserEnrollPlatformDto } from './dto/user.enroll.platform.dto';
import { UserFilterPlatformDTO } from './dto/user.filter.paltform.dto';
import { PLATFORM_ADS_STATUS, PlatformAds } from './schemas/ads.schema';
import { CreateAdDto } from './dto/create-ad.dto';
import { PLATFORMS } from '../global/enums/wallet.enum';

@Injectable()
export class PlatformService {
  constructor(
    @InjectModel(Platform.name)
    private platformModel: Model<Platform>,
    @InjectModel(EnrolledPlatform.name)
    private enrolledPlatformModel: Model<EnrolledPlatform>,
    @InjectModel(FavoritePlatform.name)
    private favoritePlatformModel: Model<FavoritePlatform>,
    @InjectModel(PlatformAds.name)
    private platformAdsModel: Model<PlatformAds>,
  ) {}

  //platform CRUD operations
  async createPlatform(
    createPlatformDto: AdminCreatePlatformDto,
  ): Promise<ApiResponse> {
    const existingPlatform = await this.platformModel.findOne({
      symbol: createPlatformDto.symbol,
      deletedAt: null,
    });

    if (existingPlatform) {
      throw new UnprocessableEntityException(
        'Platform already exists with symbol',
      );
    }
    const platform = await this.platformModel.create(createPlatformDto);
    return new ApiResponse(platform, 'Platform created successfully');
  }
  async deletePlatform(id: string): Promise<ApiResponse> {
    const platform = await this.platformModel.findByIdAndUpdate(
      id,
      {
        deletedAt: new Date(),
      },
      { new: true },
    );
    return new ApiResponse(platform, 'Platform deleted successfully');
  }

  async updatePlatform(
    id: string,
    updateDto: AdminCreatePlatformDto,
  ): Promise<ApiResponse> {
    const existingPlatform = await this.platformModel.findOne({
      symbol: updateDto.symbol,
      deletedAt: null,
      _id: {
        $ne: new Types.ObjectId(id),
      },
    });
    if (existingPlatform) {
      throw new UnprocessableEntityException(
        'Platform already exists with symbol',
      );
    }
    const adminId = updateDto['createdBy'];
    const platform = await this.platformModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      updateDto,
      { new: true },
    );
    return new ApiResponse(platform, 'Platform updated successfully');
  }

  async getPlatforms(id: any): Promise<ApiResponse> {
    const userId = new mongoose.Types.ObjectId(id);
    const platforms = await this.platformModel.find({ deletedAt: null }).exec();
    const favoritePlatforms = await this.favoritePlatformModel
      .find({ user: userId, deletedAt: null })
      .exec();
    const favoritePlatformIds = favoritePlatforms.map((fp) =>
      fp.platform.toString(),
    );

    const returnedPlatforms = platforms.map((platform) => ({
      ...platform.toObject(),
      isFavorite: favoritePlatformIds.includes(platform._id.toString()),
    }));
    return new ApiResponse(
      returnedPlatforms,
      'All platforms fetched successfully',
    );
  }

  async getAllPlatforms() {
    const platforms = await this.platformModel.find({ deletedAt: null }).exec();

    return platforms;
  }

  //Favorite platforms APIs
  async setPlatformAsFavorite(
    setFavoritePlatformDto: UserSetFavoritePlatformDto,
  ): Promise<ApiResponse> {
    const userId = setFavoritePlatformDto['user'];
    if (!userId) {
      throw new HttpException('User id is null', HttpStatus.BAD_REQUEST);
    }
    const itmesSize = await this.favoritePlatformModel.countDocuments({
      user: userId,
      platform: setFavoritePlatformDto.platform,
    });
    if (itmesSize > 0) {
      const favoritePlatform = await this.favoritePlatformModel.deleteOne({
        platform: setFavoritePlatformDto.platform,
      });
      return new ApiResponse({}, 'Platform set as unfavorite successfully');
    }
    const favoritePlatform = await this.favoritePlatformModel.create(
      setFavoritePlatformDto,
    );
    return new ApiResponse(
      favoritePlatform,
      'Platform set as favorite successfully',
    );
  }

  async getFavoritePlatforms(
    id: string,
    filterPlatforms: UserFilterPlatformDTO,
  ): Promise<ApiResponse> {
    const favoritePlatforms = await this.favoritePlatformModel
      .find({ user: new Types.ObjectId(id), deletedAt: null })
      .populate({
        path: 'platform',
        // match: {
        //   category: filterPlatforms.category,
        //   deletedAt: null,
        //   title: new RegExp(filterPlatforms.query, 'i'),
        // },
      })
      .exec();

    const returnedPlatforms = favoritePlatforms
      .filter((fp) => fp.platform) // Filter out null platforms (non-matching categories)
      .map((fp) => fp.platform);

    return new ApiResponse(
      returnedPlatforms,
      'Favorite platforms fetched successfully',
    );
  }

  //Enrol platforms APIs
  async enrollPlatform(
    userEnrollPlatformDto: UserEnrollPlatformDto,
  ): Promise<ApiResponse> {
    const userId = userEnrollPlatformDto['user'];
    if (!userId) {
      throw new HttpException('User id is null', HttpStatus.BAD_REQUEST);
    }
    const enrolledPlatform = await this.enrolledPlatformModel.create(
      userEnrollPlatformDto,
    );
    return new ApiResponse(enrolledPlatform, 'Platform enrolled successfully');
  }

  async getEnrolledPlatforms(
    userId: string,
    filterPlatforms: UserFilterPlatformDTO,
  ): Promise<ApiResponse> {
    const enrolled = await this.enrolledPlatformModel
      .find({ user: userId })
      .populate('platform')
      .select('platform -_id')
      .exec();
    const enrolledPlatforms = enrolled.map((fp) => fp.platform);

    return new ApiResponse(
      enrolledPlatforms,
      'Enrolled platforms fetched successfully',
    );
  }

  async getFeaturedPlatforms(
    userId: string,
    filterPlatformDto: UserFilterPlatformDTO,
  ): Promise<ApiResponse> {
    const filter: any = {
      deletedAt: null,
      isFeatured: true,
    };

    if (filterPlatformDto.category) {
      filter.category = filterPlatformDto.category;
    }

    if (filterPlatformDto.query) {
      filter.title = { $regex: filterPlatformDto.query, $options: 'i' };
    }

    const platforms = await this.platformModel.find(filter).exec();
    const favoritePlatforms = await this.favoritePlatformModel
      .find({ user: new Types.ObjectId(userId), deletedAt: null })
      .exec();
    const favoritePlatformIds = favoritePlatforms.map((fp) =>
      fp.platform.toString(),
    );

    const platformsWithFavoriteFlag = platforms.map((platform) => ({
      ...platform.toObject(),
      isFavorite: favoritePlatformIds.includes(platform._id.toString()),
    }));

    return new ApiResponse(
      platformsWithFavoriteFlag,
      'Featured platforms fetched successfully',
    );
  }

  async filterPlatforms(
    UserFilterPlatformDTO: UserFilterPlatformDTO,
  ): Promise<ApiResponse> {
    const platforms = await this.platformModel.find({
      deletedAt: null,
      category: UserFilterPlatformDTO.category,
    });
    return new ApiResponse(platforms, 'Platforms filtered successfully');
  }

  async createPlatformAd(createAdDto: CreateAdDto) {
    return await this.platformAdsModel.create(createAdDto);
  }

  async editPlatformAd(adId: Types.ObjectId, editAdDto: CreateAdDto) {
    return await this.platformAdsModel.findByIdAndUpdate(adId, editAdDto, {
      new: true,
    });
  }

  async getPlatformAds(isAdmin = false) {
    if (isAdmin) {
      return await this.platformAdsModel.find({});
    }
    return await this.platformAdsModel.find({
      status: PLATFORM_ADS_STATUS.ACTIVE,
    });
  }

  async getPlatformBySymbol(
    symbol: string,
    returnDefaultIfNotFound: boolean = false,
    throwErrorIfNotFound: boolean = false,
  ) {
    let platform = await this.platformModel.findOne({
      symbol: { $regex: new RegExp(`^${symbol}$`, 'i') },
      status: 'active',
      deletedAt: null,
    });

    if (!platform && !returnDefaultIfNotFound && !throwErrorIfNotFound) {
      return null;
    }

    if (!platform && returnDefaultIfNotFound) {
      platform = await this.platformModel.findOne({
        symbol: PLATFORMS.HOMNIFI,
        deletedAt: null,
      });
    }

    if (!platform && throwErrorIfNotFound) {
      throw new UnprocessableEntityException('Platform not found');
    }
    return platform;
  }
}
