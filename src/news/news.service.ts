import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, PipelineStage, Types } from 'mongoose';
// import { CreateNotificationDto } from './dto/create.notification.dto';
import { News } from './schemas/news.schema';
import { UserNews } from './schemas/user-news.schema';
import { aggregatePaginate } from '../utils/pagination.service';
import { GatewayService } from '../gateway/gateway.service';
import { SOCKET_EVENT_NAMES } from '../gateway/Constants/socket.event.messages';
import { User } from '../users/schemas/user.schema';
import { pagination } from '../utils/helpers';

@Injectable()
export class NewsService {
  constructor(
    @InjectModel(News.name)
    private newsModel: Model<News>,
    @InjectModel(UserNews.name)
    private userNewsModel: Model<UserNews>,
  ) {}

  async getAllUserNews(userId: string, limit: string, page: string) {
    const currentTime = new Date();

    const pipeline = [
      {
        $match: {
          isActive: true,
          deletedAt: { $eq: null },
          $or: [
            {
              $and: [
                { startTime: { $lte: currentTime } },
                { endTime: { $gte: currentTime } },
              ],
            },
            {
              $and: [
                { startTime: { $lte: currentTime } },
                { endTime: { $exists: false } },
              ],
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'usernews',
          let: { newsId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$newsId', '$$newsId'] },
                    { $eq: ['$user', new Types.ObjectId(userId)] },
                  ],
                },
              },
            },
          ],
          as: 'userNewsDetails',
        },
      },
      {
        $unwind: {
          path: '$userNewsDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          read: {
            $cond: [{ $ifNull: ['$userNewsDetails.read', false] }, true, false],
          },
        },
      },
      {
        $project: {
          _id: 1,
          read: 1,
          createdAt: 1,
          popupOnLogin: 1,
          showsOn: 1,
          newsDetails: {
            _id: '$_id',
            title: '$title',
            body: '$body',
            startTime: '$startTime',
            endTime: '$endTime',
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ];

    const data = await aggregatePaginate(
      this.newsModel,
      pipeline,
      Number(page),
      Number(limit),
    );

    return data;
  }

  // async getAllUserNews(userId: string, limit: string, page: string) {
  //   const currentTime = new Date();

  //   // Main query condition for active news
  //   const whereConfig = {
  //     isActive: true,
  //     $or: [
  //       {
  //         $and: [
  //           { startTime: { $lte: currentTime } }, // startTime <= currentTime
  //           { endTime: { $gte: currentTime } }, // endTime >= currentTime
  //         ],
  //       },
  //       {
  //         $and: [
  //           { startTime: { $lte: currentTime } }, // startTime <= currentTime
  //           { endTime: { $exists: false } }, // endTime is not set
  //         ],
  //       },
  //     ],
  //   };

  //   const paginate = await pagination({
  //     page,
  //     pageSize: parseInt(limit),
  //     model: this.newsModel,
  //     condition: whereConfig,
  //     pagingRange: 5,
  //   });

  //   // Fetching the main news list
  //   const newsList = await this.newsModel
  //     .find(whereConfig)
  //     .select({
  //       createdAt: 1,
  //       popupOnLogin: 1,
  //       showsOn: 1,
  //       title: 1,
  //       body: 1,
  //       startTime: 1,
  //       endTime: 1,
  //     }) // Explicitly include fields
  //     .sort({ createdAt: -1 })
  //     .skip(paginate.offset)
  //     .limit(paginate.limit)
  //     .lean();

  //   // Fetching user-specific news details
  //   const newsIds = newsList.map((news) => news._id);
  //   const userNewsDetails = await this.userNewsModel
  //     .find({ newsId: { $in: newsIds }, user: userId })
  //     .lean();

  //   // Mapping user-specific details to news for quick lookup
  //   const userNewsMap = new Map(
  //     userNewsDetails.map((detail) => [detail.newsId.toString(), detail]),
  //   );

  //   // Building result using a for loop
  //   const result = [];
  //   for (const news of newsList) {
  //     const userNews = userNewsMap.get(news._id.toString());
  //     result.push({
  //       _id: news._id,
  //       read: userNews?.read || false,
  //       createdAt: news['createdAt'] || null,
  //       popupOnLogin: news.popupOnLogin,
  //       showsOn: news.showsOn,
  //       newsDetails: {
  //         _id: news._id,
  //         title: news.title,
  //         body: news.body,
  //         startTime: news.startTime,
  //         endTime: news.endTime,
  //       },
  //     });
  //   }

  //   // Returning the response with pagination metadata
  //   return {
  //     list: result,
  //     totalCount: paginate.total,
  //     totalPages: paginate.metadata.page.totalPage,
  //     currentPage: paginate.metadata.page.currentPage,
  //     paginate,
  //   };
  // }

  async createUserNewsByNewsId(userId: Types.ObjectId, newsId: Types.ObjectId) {
    const existingUserNews = await this.userNewsModel.findOne({
      user: userId,
      newsId: newsId,
    });

    if (!existingUserNews) {
      const newUserNews = new this.userNewsModel({
        user: userId,
        newsId: newsId,
        read: true,
      });
      await newUserNews.save();
    }
  }

  async createUserNews(userId: Types.ObjectId) {
    const currentTime = new Date();
    // Find all active news items within the valid time range
    const activeNews = await this.newsModel
      .find({
        isActive: true,
        startTime: { $lte: currentTime },
        $or: [
          { endTime: { $gte: currentTime } },
          { endTime: { $exists: false } },
          { endTime: null },
        ],
      })
      .exec();

    if (activeNews.length === 0) {
      return [];
    }

    const userNewsEntries = [];

    for (const newsItem of activeNews) {
      const existingUserNews = await this.userNewsModel.findOne({
        user: userId,
        newsId: newsItem._id,
      });

      if (!existingUserNews) {
        userNewsEntries.push({
          user: userId,
          newsId: newsItem._id,
          read: false,
        });
      }
    }

    if (userNewsEntries.length > 0) {
      return await this.userNewsModel.insertMany(userNewsEntries);
    } else {
      return {
        message:
          'All active news items are already in the UserNews table for this user.',
      };
    }
  }

  async markAsRead(userId: Types.ObjectId, newsId: Types.ObjectId) {
    const updatedNews = await this.userNewsModel
      .findOneAndUpdate(
        {
          user: new Types.ObjectId(userId),
          newsId: new Types.ObjectId(newsId),
        },
        { read: true },
        { new: true },
      )
      .exec();

    if (!updatedNews) {
      const newUserNews = new this.userNewsModel({
        user: new Types.ObjectId(userId),
        newsId: new Types.ObjectId(newsId),
        read: true,
      });
      await newUserNews.save();
      return newUserNews;
    }

    return updatedNews;
  }

  async markAllAsRead(userId: string): Promise<any> {
    await this.userNewsModel
      .updateMany(
        { user: new Types.ObjectId(userId), read: false },
        { $set: { read: true } },
      )
      .exec();

    const existingUserNews = await this.userNewsModel
      .find({ user: new Types.ObjectId(userId) })
      .select('newsId')
      .exec();
    const existingNewsIds = existingUserNews.map((un) => un.newsId);

    const missingNewsItems = await this.newsModel
      .find({
        _id: { $nin: existingNewsIds },
        isActive: true,
      })
      .exec();

    const newUserNewsEntries = missingNewsItems.map((newsItem) => ({
      user: new Types.ObjectId(userId),
      newsId: newsItem._id,
      read: true,
    }));

    if (newUserNewsEntries.length > 0) {
      await this.userNewsModel.insertMany(newUserNewsEntries);
    }

    return {
      updatedCount: existingUserNews.length,
      addedCount: newUserNewsEntries.length,
    };
  }
}
