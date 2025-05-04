import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { User } from '../users/schemas/user.schema';
import { aggregatePaginate } from '../utils/pagination.service';
import { AdminI } from './auth/admin.interface';
import { Admin } from './schemas/admin.schema';
import { Model, PipelineStage, Types } from 'mongoose';
import ApiResponse from '../utils/api-response.util';
import { UpdateAdminDTO, UpdateAdminPasswordDTO } from './dto/update.admin.dto';
import { catchException } from './global/helpers/handle.exceptionh.helper';
import { ACTION, PERMISSION_MODULE, permissionList } from '../enums/permission';
import { AdminSignupDto } from './auth/dto/admin.auth.dto';
import { CreateRoleDto } from './dto/create.role.dto';
import { CloudKFilterDTO, PaginateDTO } from './global/dto/paginate.dto';
import { Role } from './schemas/role.schema';
import { WEBHOOK_STATUS, WebhookStatus } from './schemas/webhook-error.schema';
import { IsIdDTO } from './global/dto/id.dto';
import { UpdateRoleDto } from './dto/update.role.dto';
import { Notification } from '../notification/schemas/notification.schema';
import { CreateNotificationByBidDto } from '../notification/dto/create.notification.by.bid.dto';
import { CreateNewsDto } from '../news/dto/create.news.dto';
import { News } from '../news/schemas/news.schema';
import { GatewayService } from '../gateway/gateway.service';
import { ConfigService } from '@nestjs/config';
import { MyBlockchainIdService } from '../my-blockchain-id/my-blockchain-id.service';
import { DatabaseDump } from './schemas/database-dump.schema';
import { DatabaseDumpDto } from './dto/create.database-dump.dto';
import { AppRequest } from '../utils/app-request';
import { Token, ValueType } from '../token/schemas/token.schema';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { SwapTransaction } from '../wallet/schemas/swap.transaction.schema';
import { CloudKReward } from '../cloud-k/schemas/cloudk-reward.schema';
import { SN_BONUS_TYPE } from '../supernode/enums/sn-bonus-type.enum';
import moment from 'moment';
import { SNBonusTransaction } from '../supernode/schemas/sn-bonus-transaction.schema';
import { DAY_OF_WEEK_SHORT_NAMES, MONTH_SHORT_NAMES } from '../utils/constants';
import { CHART_TIMELIME_TYPES } from '@/src/myfriends/enums/chart-timelines.enum';
import { CloudKGlobalAutoCompound } from '../cloud-k/schemas/global-autocompound.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { CloudKTransactions } from '../cloud-k/schemas/cloudk-transactions.schema';
import { setDecimalPlaces } from '../utils/helpers';
import { AmountType } from '../global/enums/amount.type.enum';
import { UserStatusDTO } from '../users/dto/update-user.dto';
import { DeviceService } from '../device/device.service';
import { UserBlockAdminLogs } from './schemas/user.block.admin.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
    @InjectModel(Role.name) private adminRole: Model<Role>,
    @InjectModel(DatabaseDump.name)
    private adminDatabaseDump: Model<DatabaseDump>,
    @InjectModel(Token.name) private tokenModel: Model<Token>,
    @InjectModel(CloudKMachine.name)
    private cloudKMachineModel: Model<CloudKMachine>,
    @InjectModel(WalletTransaction.name)
    private walletTransactionModel: Model<WalletTransaction>,
    @InjectModel(WithdrawTransaction.name)
    private withdrawTransactionModel: Model<WithdrawTransaction>,
    @InjectModel(CloudKMachine.name)
    private CloudKMachineModel: Model<CloudKMachine>,
    @InjectModel(DepositTransaction.name)
    private depositTransactionModel: Model<DepositTransaction>,
    @InjectModel(SwapTransaction.name)
    private swapTransactionModel: Model<SwapTransaction>,
    @InjectModel(CloudKReward.name)
    private cloudKRewardModel: Model<CloudKReward>,
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @InjectModel(UserBlockAdminLogs.name)
    private readonly UserBlockAdminLogsModel: Model<UserBlockAdminLogs>,
    @InjectModel(News.name)
    private newsModel: Model<News>,
    @InjectModel(WebhookStatus.name) private webhookModel: Model<WebhookStatus>,
    private jwtService: JwtService,
    private gatewayService: GatewayService,
    private deviceService: DeviceService,

    @Inject(ConfigService) private config: ConfigService,
    private myBlockchainIdService: MyBlockchainIdService,
    // private deviceService: DeviceService,
    @InjectModel(SNBonusTransaction.name)
    private sNBonusTransactionModel: Model<SNBonusTransaction>,

    @InjectModel(CloudKTransactions.name)
    private cloudkTransactionModel: Model<CloudKTransactions>,
  ) { }

  generateJwt(payload) {
    return this.jwtService.sign(payload, {
      expiresIn: '24h',
      secret: this.config.get<string>('JWT_SECRET'),
    });
  }

  async findById(id: string) {
    return await this.adminModel.findById(id).populate(['role']);
  }

  async getAdminById(id: any) {
    const admin = await this.findById(id);
    if (!admin) {
      throw new HttpException('Admin not found', HttpStatus.BAD_REQUEST);
    }
    return {
      message: 'Admin retuned successfully!',
      user: admin,
    };
  }

  async getAdmins(paginateDto: PaginateDTO) {
    const { page, limit, query, fromDate, toDate, role } = paginateDto;
    const matchConditions: any[] = [{ deletedAt: { $eq: null } }];

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999); // Set end of the day for toDate
      matchConditions.push({
        createdAt: {
          $gte: from,
          $lte: to,
        },
      });
    }

    if (query) {
      // Split the query into words (e.g., "user Testing" -> ["user", "Testing"])
      const queryParts = query.split(' ').filter(Boolean); // Filter removes empty strings if any

      // Build match conditions for each word
      const orConditions = queryParts.map((part) => ({
        $or: [
          { firstName: { $regex: part, $options: 'i' } },
          { lastName: { $regex: part, $options: 'i' } },
          { email: { $regex: part, $options: 'i' } },
        ],
      }));
      matchConditions.push(...orConditions);
    }

    if (role) {
      matchConditions.push({
        role: new Types.ObjectId(role),
      });
    }

    const pipeline = [
      { $match: { $and: matchConditions } }, // Match initial conditions
      {
        $sort: { createdAt: -1 },
      },
      {
        $project: {
          password: 0,
        },
      },
      {
        $lookup: {
          from: 'roles',
          localField: 'role',
          foreignField: '_id',
          as: 'role',
        },
      },
    ];

    return await aggregatePaginate(this.adminModel, pipeline, page, limit);
  }

  async createNotification(createNotificationDto: CreateNotificationByBidDto) {
    const userId = await this.userModel.findOne({
      blockchainId: createNotificationDto.userBid,
    });

    if (!userId) {
      throw new HttpException('User not found', HttpStatus.BAD_REQUEST);
    }
    return await this.notificationModel.create({
      user: userId._id,
      title: createNotificationDto.title,
      message: createNotificationDto.message,
      type: createNotificationDto.type,
    });
  }

  async findOneRecord(id: string) {
    try {
      const filter = { _id: id, deletedAt: { $eq: null } };
      const results = await this.adminModel.find(filter);

      if (!results) {
        throw new NotFoundException(`No record found at id: ${id}`);
      }

      const transformedData = results.map((result) => {
        return {
          _id: result._id,
          firstName: result.firstName,
          lastName: result.lastName,
          email: result.email,
          // type: result.type a,
          // permissions[]: result.permissions,
        };
      });

      return {
        message: `Record at id ${id}`,
        paginated: {
          items: transformedData,
        },
      };
    } catch (error) {
      catchException(error);
    }
  }

  async updateAdmin(
    id: string,
    updateAdminDTO: UpdateAdminDTO,
    req: AppRequest,
  ) {
    try {
      const adminToBeUpdated = await this.adminModel.findById(id);
      if (!adminToBeUpdated) {
        throw new HttpException('Admin not found', HttpStatus.BAD_REQUEST);
      }

      // We won't let the admin to update roles himself. because its case is loses permissions immediately.
      if (
        updateAdminDTO.role &&
        id == req.admin._id.toString() &&
        req.admin.role._id.toString() !== updateAdminDTO.role
      ) {
        throw new HttpException(
          'An admin cannot modify their own role.',
          HttpStatus.BAD_REQUEST,
        );
      }

      /*
      TODO: Discussion required, if allow then enable following condition to allow admin update user already deleted.
      if (adminToBeUpdated && adminToBeUpdated['deletedAt']) {
        throw new HttpException(
          'Admin not found or already deleted',
          HttpStatus.BAD_REQUEST,
        );
      }
      */
      if (updateAdminDTO.password) {
        const salt = await bcrypt.genSalt(10);
        const vPassword = updateAdminDTO.password;
        const hashedPassword = await bcrypt.hash(vPassword, salt);
        updateAdminDTO.password = hashedPassword;
      }
      console.log('--->', updateAdminDTO.role);

      const result = await this.adminModel.findByIdAndUpdate(
        id,
        updateAdminDTO,
        { new: true },
      );

      return {
        message: `Record updated successfully! at id ${id}`,
        result: result,
      };
    } catch (e) {
      catchException(e);
    }
  }

  async updateAdminPassword(
    id: string,
    updateAdminDTO: UpdateAdminPasswordDTO,
  ) {
    try {
      const adminToBeUpdated = await this.adminModel.findById(id);
      if (!adminToBeUpdated) {
        throw new HttpException('Admin not found', HttpStatus.BAD_REQUEST);
      }
      if (
        updateAdminDTO.currentPassword &&
        updateAdminDTO.currentPassword !== ''
      ) {
        const isCurrentPasswordValid = await bcrypt.compare(
          updateAdminDTO.currentPassword,
          adminToBeUpdated.password,
        );

        if (!isCurrentPasswordValid) {
          throw new HttpException(
            'Invalid current password',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      if (updateAdminDTO.password) {
        const salt = await bcrypt.genSalt(10);
        const vPassword = updateAdminDTO.password;
        const hashedPassword = await bcrypt.hash(vPassword, salt);
        updateAdminDTO.password = hashedPassword;
      }

      let data: any = updateAdminDTO;
      if (updateAdminDTO.logoutFromAllDevices) {
        data = { ...data, passwordChangedAt: new Date() };
      }

      const result = await this.adminModel.findByIdAndUpdate(id, data, {
        new: true,
      });

      return {
        message: `Password updated successfully!`,
        restul: result,
      };
    } catch (e) {
      catchException(e);
    }
  }
  async add2faSecret(id: string, code: string) {
    try {
      const adminToBeUpdated = await this.adminModel.findById(id);
      if (!adminToBeUpdated) {
        throw new HttpException('Admin not found', HttpStatus.BAD_REQUEST);
      }

      const updated = await this.adminModel
        .updateOne(
          { _id: id },
          {
            TFASecret: code.toString(),
          },
        )
        .exec();
      return true;
    } catch (e) {
      catchException(e);
    }
  }
  async set2faEnabled(id: string, is2faEnabled: boolean = false) {
    try {
      const adminToBeUpdated = await this.adminModel.findById(id);
      if (!adminToBeUpdated) {
        throw new HttpException('Admin not found', HttpStatus.BAD_REQUEST);
      }

      await this.adminModel.findByIdAndUpdate(id, {
        is2faEnabled: is2faEnabled,
      });

      return true;
    } catch (e) {
      catchException(e);
    }
  }

  async updatePassword(userId: string, newPassword: string) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.adminModel
      .findByIdAndUpdate(
        userId,
        { password: hashedPassword },
        { new: true }, // Return the updated document
      )
      .exec();
  }

  async softDelete(id: string) {
    // TODO: Deleted By adminUserId
    try {
      // First check the record
      const existingRecord = await this.adminModel.findOne({
        _id: id,
        deletedAt: { $eq: null },
      });

      if (!existingRecord) {
        throw new NotFoundException(
          `Record with ID "${id}" not found or is already deleted`,
        );
      }

      // { deletedAt: new Date(), deletedBy: userId },
      const result = await this.adminModel.findByIdAndUpdate(
        id,
        { deletedAt: new Date() },
        { new: true },
      );

      return { message: `Record at id :${id} deleted successfully` };
    } catch (error) {
      catchException(error);
    }
  }

  async getUsersList(page: string, limit: string) {
    const users = await aggregatePaginate(
      this.userModel,
      [],
      Number(page),
      Number(limit),
    );
    return users;
  }

  async getPermissions() {
    const list_of_permissions = Object.values(PERMISSION_MODULE).map(
      (module) => ({
        name: module,
        actions: Object.values(ACTION),
      }),
    );
    return new ApiResponse(list_of_permissions);
  }

  async createSuperAdmin() {
    const superAdmin = await this.adminModel.findOne({
      isSuperAdmin: true,
    });
    if (superAdmin) {
      throw new Error(`Super Admin already exists`);
    }

    const role = await this.adminRole.create({
      name: 'Super Admin',
      permissions: permissionList.map((permission) => {
        return {
          module: permission.module,
          action: permission.action,
        };
      }),
    });

    const newAdmin = await this.adminModel.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@homnifi.com',
      password: process.env.ADMIN_PASSWORD,
      isSuperAdmin: true,
      role: role,
    });

    return new ApiResponse(newAdmin);
  }

  async createAdmin(adminSignUpDto: AdminSignupDto) {
    const existingAdmin = await this.adminModel.findOne({
      email: adminSignUpDto.email,
    });

    if (existingAdmin) {
      throw new BadRequestException(
        `Admin with email ${existingAdmin.email} already exists`,
      );
    }

    if (adminSignUpDto.username) {
      const existingAdminUserName = await this.adminModel.findOne({
        username: adminSignUpDto.username,
        deletedAt: { $eq: null },
      });

      if (existingAdminUserName) {
        throw new BadRequestException(
          `Admin with Username ${existingAdminUserName.username} already exists`,
        );
      }
    }

    let isSubSuperAdmin = false;
    if (adminSignUpDto.role) {
      const role = await this.adminRole.findById(adminSignUpDto.role);
      if (role && role.name.toLowerCase() === 'subsuperadmin') {
        isSubSuperAdmin = true;

        if (role.permissions.length < permissionList.length) {
          role.permissions = permissionList.map((permission) => {
            return {
              module: permission.module,
              action: permission.action,
            };
          });
          await role.save();
        }
      }
    }

    if (isSubSuperAdmin) {
      adminSignUpDto = {
        ...adminSignUpDto,
        isSubSuperAdmin: true,
        isSuperAdmin: false,
      };
    }

    return await this.adminModel.create(adminSignUpDto);
  }

  async findByEmail(email: string) {
    const admin = await this.adminModel.findOne({ email: email });

    if (!admin) {
      throw new HttpException('Admin not found', HttpStatus.BAD_REQUEST);
    }

    // Populate only if the admin exists
    await admin.populate('role');

    return admin;
  }

  async comparePassword(
    admin: Admin,
    candidatePassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(candidatePassword, admin.password);
  }

  async createRole(createRoleDTO: CreateRoleDto) {
    const role = await this.adminRole.create(createRoleDTO);
    return role;
  }

  async updateRole(isIdDto: IsIdDTO, updateRoleDTO: UpdateRoleDto) {
    const role = await this.adminRole.findByIdAndUpdate(
      isIdDto.id,
      updateRoleDTO,
      { new: true },
    );
    return role;
  }

  async getRoles(adminName: string | null) {
    let filter: any = { deletedAt: { $eq: null } };
    if (adminName) {
      filter = {
        $and: [
          { deletedAt: { $eq: null } },
          { name: { $regex: adminName, $options: 'i' } },
        ],
      };
    }

    const roles = await this.adminRole.find(filter);

    return new ApiResponse(roles, 'Admin roles returned successfully!');
  }

  async createWebhook(data: { path: string; name: string; payload?: object }) {
    return await this.webhookModel.create({
      path: data.path,
      name: data.name,
      payload: JSON.stringify(data.payload),
    });
  }

  async setWebhookStatus(webhookId, errored: boolean, error?: string) {
    const wb = await this.webhookModel.findById(webhookId);

    if (errored) {
      wb.status = WEBHOOK_STATUS.FAILED;
      wb.error = error;
    } else {
      wb.status = WEBHOOK_STATUS.SUCCESS;
    }
    await wb.save();
  }

  async createNews(createNewsDto: CreateNewsDto) {
    const createdNews = new this.newsModel(createNewsDto);
    return await createdNews.save();
  }

  async getAllActiveNews(isAdmin = false) {
    const q = {
      deletedAt: { $eq: null },
      ...(isAdmin ? {} : { isActive: true }),
    };
    return await this.newsModel.find(q).sort({ createdAt: -1 }).exec();
  }

  async getNewsById(id: Types.ObjectId): Promise<News | null> {
    return await this.newsModel.findById(id).exec();
  }

  async updateNews(
    id: Types.ObjectId,
    updateNewsDto: CreateNewsDto,
  ): Promise<News | null> {
    let showsOn = {};
    const news = await this.newsModel.findById(id);
    if (news) {
      showsOn = news.showsOn;
    }

    updateNewsDto.showsOn = { ...showsOn, ...updateNewsDto.showsOn };

    return await this.newsModel
      .findByIdAndUpdate(id, updateNewsDto, {
        new: true,
        runValidators: true,
      })
      .exec();
  }

  async deleteNews(id: Types.ObjectId): Promise<void> {
    const news = await this.newsModel.findById(id).exec();
    if (!news) {
      throw new NotFoundException('News not found');
    }
    await this.newsModel
      .findByIdAndUpdate(id, { deletedAt: new Date() })
      .exec();
  }

  getNumberOfOnlineUsers(): number {
    return this.gatewayService.getOnlineUsersCount();
  }

  async createDatabaseDumpLogs(databaseDumpDto: DatabaseDumpDto) {
    return this.adminDatabaseDump.create(databaseDumpDto);
  }

  async updateDatabaseDumpLogs(name: string) {
    return this.adminDatabaseDump
      .findOneAndUpdate({ name }, { deletedAt: new Date() }, { new: true })
      .exec();
  }

  // async getAllDatabaseDumpLogs() {
  //   const roles = await this.adminDatabaseDump.find();
  //   return new ApiResponse(
  //     roles,
  //     'Admin Database Dumps returned successfully!',
  //   );
  // }

  async getAllDatabaseDumpLogs(paginateDto: PaginateDTO) {
    const { page, limit } = paginateDto;
    const pipeline = [
      {
        $sort: { createdAt: -1 },
      },
    ];

    return await aggregatePaginate(
      this.adminDatabaseDump,
      pipeline,
      page,
      limit,
    );
  }

  async countAllUsers() {
    const count = await this.userModel.countDocuments();
    return count;
  }

  async countAllTokens() {
    return await this.tokenModel.countDocuments();
  }

  async countAllWithDrawRequests() {
    return await this.withdrawTransactionModel.countDocuments();
  }

  async countAllCloudKMachines() {
    return await this.cloudKMachineModel.countDocuments();
  }

  async calculateTransactionFlowDifference(): Promise<{
    totalAmount: number;
    totalIn: number;
    totalOut: number;
  }> {
    const result = await this.walletTransactionModel.aggregate([
      {
        $match: {
          transactionFlow: { $in: ['in', 'out'] },
          amount: { $type: ['number', 'decimal'] },
        },
      },
      {
        $group: {
          _id: null,
          totalIn: {
            $sum: {
              $cond: {
                if: { $eq: ['$transactionFlow', 'in'] },
                then: { $ifNull: ['$amount', 0] },
                else: 0,
              },
            },
          },
          totalOut: {
            $sum: {
              $cond: {
                if: { $eq: ['$transactionFlow', 'out'] },
                then: { $ifNull: ['$amount', 0] },
                else: 0,
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalIn: { $ifNull: ['$totalIn', 0] },
          totalOut: { $ifNull: ['$totalOut', 0] },
          totalAmount: {
            $ifNull: [
              {
                $subtract: [
                  { $ifNull: ['$totalIn', 0] },
                  { $ifNull: ['$totalOut', 0] },
                ],
              },
              0,
            ],
          },
        },
      },
    ]);
    return result.length > 0
      ? result[0]
      : { totalAmount: 0, totalIn: 0, totalOut: 0 };
  }

  async getAllStats(): Promise<any> {
    const [
      userCount,
      tokenCount,
      withdrawRequests,
      machineCount,
      transactionStats,
    ] = await Promise.all([
      this.countAllUsers(),
      this.countAllTokens(),
      this.countAllWithDrawRequests(),
      this.countAllCloudKMachines(),
      this.calculateTransactionFlowDifference(),
    ]);

    return {
      userCount,
      tokenCount,
      withdrawRequests,
      machineCount,
      transactionStats,
    };
  }

  async calculateTotalTransactionSummary(): Promise<any> {
    const totalDepositsPromise = this.depositTransactionModel.aggregate([
      {
        $match: {
          transactionStatus: 'success',
        },
      },
      {
        $group: {
          _id: null,
          totalDeposits: { $sum: '$amount' },
        },
      },
    ]);

    const totalWithdrawalsPromise = this.withdrawTransactionModel.aggregate([
      {
        $match: {
          requestStatus: { $in: ['approved', 'completed'] },
        },
      },
      {
        $group: {
          _id: null,
          totalWithdrawals: { $sum: '$amount' },
        },
      },
    ]);

    const totalSwapsPromise = this.swapTransactionModel.aggregate([
      {
        $group: {
          _id: null,
          totalSwaps: { $sum: '$amount' },
        },
      },
    ]);

    const [totalDepositsResult, totalWithdrawalsResult, totalSwapsResult] =
      await Promise.all([
        totalDepositsPromise,
        totalWithdrawalsPromise,
        totalSwapsPromise,
      ]);

    const totalDeposits =
      totalDepositsResult.length > 0 ? totalDepositsResult[0].totalDeposits : 0;
    const totalWithdrawals =
      totalWithdrawalsResult.length > 0
        ? totalWithdrawalsResult[0].totalWithdrawals
        : 0;
    const totalSwaps =
      totalSwapsResult.length > 0 ? totalSwapsResult[0].totalSwaps : 0;

    return {
      totalDeposits,
      totalWithdrawals,
      totalSwaps,
    };
  }

  async getCloudKRewards(timeline: CHART_TIMELIME_TYPES): Promise<any> {
    const today = new Date();
    const startDate = new Date();
    let groupFormat: '%Y' | '%Y %b' | '%Y-%m-%d' = '%Y';

    switch (timeline) {
      case 'monthly':
        groupFormat = '%Y-%m-%d';
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'yearly':
        groupFormat = '%Y %b';
        startDate.setMonth(startDate.getMonth() - 12);
        break;
      case 'weekly':
        groupFormat = '%Y-%m-%d';
        startDate.setDate(startDate.getDate() - 6);
        break;
    }

    const transactions = await this.cloudKRewardModel.aggregate([
      {
        $match: {
          forDate: { $gte: startDate, $lte: today },
        },
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: groupFormat, date: '$forDate' } },
          },
          claimed: {
            $sum: { $cond: [{ $eq: ['$claimed', true] }, '$totalPrice', 0] },
          },
          unclaimed: {
            $sum: { $cond: [{ $eq: ['$claimed', false] }, '$totalPrice', 0] },
          },
          totalExpectedRewardTokens: { $sum: '$expectedRewardTokens' },
        },
      },
      {
        $project: {
          _id: 0,
          x: '$_id.day',
          claimed: '$claimed',
          unclaimed: '$unclaimed',
          total: { $add: ['$claimed', '$unclaimed'] },
        },
      },
      {
        $sort: { x: 1 },
      },
    ]);

    const formattedData = this.formatCloudKData(timeline, transactions);
    return formattedData;
  }

  formatCloudKData(timeline: CHART_TIMELIME_TYPES, data: any[]): any[] {
    const newData = [];
    const d = new Date();

    if (timeline === 'monthly') {
      d.setDate(d.getDate() - 29);

      for (let i = 0; i < 30; i++) {
        const formattedDate = d.toISOString().split('T')[0];

        const fd = data.find((v) => v.x === formattedDate);

        const padDate = d.getDate().toString().padStart(2, '0');

        if (fd) {
          newData.push({
            x: padDate,
            claimed: fd.claimed,
            unclaimed: fd.unclaimed,
            total: fd.total,
          });
        } else {
          newData.push({ x: padDate, claimed: 0, unclaimed: 0, total: 0 });
        }
        d.setDate(d.getDate() + 1);
      }
    }

    if (timeline === 'yearly') {
      const monthNames = MONTH_SHORT_NAMES;
      d.setMonth(d.getMonth() - 12);

      for (let i = 0; i < 12; i++) {
        d.setMonth(d.getMonth() + 1);
        const month = monthNames[d.getMonth()];

        const fd = data.find((v) => v.x.includes(month));

        if (fd) {
          newData.push({
            x: month,
            claimed: fd.claimed,
            unclaimed: fd.unclaimed,
            total: fd.total,
          });
        } else {
          newData.push({ x: month, claimed: 0, unclaimed: 0, total: 0 });
        }
      }
    }

    if (timeline === 'weekly') {
      const weekday = DAY_OF_WEEK_SHORT_NAMES;
      d.setDate(d.getDate() - 6);

      for (let i = 0; i < 7; i++) {
        const formattedDate = d.toISOString().split('T')[0];

        const dayName = weekday[d.getDay()];

        const fd = data.find((v) => v.x === formattedDate);

        if (fd) {
          newData.push({
            x: dayName,
            claimed: fd.claimed,
            unclaimed: fd.unclaimed,
            total: fd.total,
          });
        } else {
          newData.push({ x: dayName, claimed: 0, unclaimed: 0, total: 0 });
        }
        d.setDate(d.getDate() + 1);
      }
    }

    return newData;
  }

  async getSupernodeTokenAmountsForTimeline(
    timeline: CHART_TIMELIME_TYPES,
  ): Promise<any> {
    const today = new Date();
    const startDate = new Date();
    let groupFormat: '%Y' | '%Y %b' | '%Y-%m-%d' = '%Y';

    switch (timeline) {
      case 'monthly':
        groupFormat = '%Y-%m-%d';
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'yearly':
        groupFormat = '%Y %b';
        startDate.setMonth(startDate.getMonth() - 12);
        break;
      case 'weekly':
        groupFormat = '%Y-%m-%d';
        startDate.setDate(startDate.getDate() - 6);
        break;
    }

    const transactions = await this.sNBonusTransactionModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: today },
          type: {
            $in: [
              SN_BONUS_TYPE.BASE_REFERRAL,
              SN_BONUS_TYPE.BUILDER_GENERATIONAl,
              SN_BONUS_TYPE.BUILDER_REFERRAL,
            ],
          },
        },
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          },
          totalTokenAmount: { $sum: '$tokenAmount' },
        },
      },
      {
        $project: {
          _id: 0,
          x: '$_id.day',
          y: '$totalTokenAmount',
        },
      },
      {
        $sort: { x: 1 },
      },
    ]);
    const formattedData = this.formatSupernodeData(timeline, transactions);
    return formattedData;
  }

  formatSupernodeData(timeline: CHART_TIMELIME_TYPES, data: any[]): any[] {
    const newData = [];
    const d = new Date();

    if (timeline === 'weekly') {
      const weekday = DAY_OF_WEEK_SHORT_NAMES; // Example: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      d.setDate(d.getDate() - 6);

      let inheritedAmount = 0;

      for (let i = 0; i < 7; i++) {
        const formattedDate = d.toISOString().split('T')[0];
        const dayName = weekday[d.getDay()];

        const fd = data.find((v) => v.x === formattedDate);

        if (fd) {
          inheritedAmount += fd.y;
          newData.push({ x: dayName, y: inheritedAmount });
        } else {
          newData.push({ x: dayName, y: inheritedAmount });
        }

        d.setDate(d.getDate() + 1);
      }
    } else if (timeline === 'monthly') {
      d.setDate(d.getDate() - 29);

      let inheritedAmount = 0;

      for (let i = 0; i < 30; i++) {
        const formattedDate = d.toISOString().split('T')[0];
        const padDate = d.getDate().toString().padStart(2, '0');

        const fd = data.find((v) => v.x === formattedDate);

        if (fd) {
          inheritedAmount += fd.y;
          newData.push({ x: padDate, y: inheritedAmount });
        } else {
          newData.push({ x: padDate, y: inheritedAmount });
        }
        d.setDate(d.getDate() + 1);
      }
    } else if (timeline === 'yearly') {
      const monthNames = MONTH_SHORT_NAMES;
      d.setMonth(d.getMonth() - 12);

      let inheritedAmount = 0;

      for (let i = 0; i < 12; i++) {
        d.setMonth(d.getMonth() + 1);
        const month = monthNames[d.getMonth()];

        const fd = data.find((v) => v.x.includes(month));

        if (fd) {
          inheritedAmount += fd.y;
          newData.push({ x: month, y: inheritedAmount });
        } else {
          newData.push({ x: month, y: inheritedAmount });
        }
      }
    }

    return newData;
  }

  async calculateUsdkOldTotal(): Promise<{ totalAmount: number }> {
    const token = await this.tokenModel.findOne({
      symbol: 'usdk-old',
      deletedAt: null,
    });

    if (!token) {
      return { totalAmount: 0 };
    }

    const aggregationResult = await this.walletTransactionModel.aggregate([
      {
        $lookup: {
          from: 'wallets',
          localField: 'wallet',
          foreignField: '_id',
          as: 'wallet',
          pipeline: [
            {
              $match: {
                token: token._id,
                deletedAt: null,
              },
            },
          ],
        },
      },
      {
        $unwind: '$wallet',
      },
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const totalAmount = aggregationResult[0]?.totalAmount || 0;
    return { totalAmount: setDecimalPlaces(totalAmount, AmountType.TOKEN) };
  }

  async calculateUsdkTotal(): Promise<{ totalAmount: number }> {
    const token = await this.tokenModel.findOne({
      symbol: 'usdk',
      deletedAt: null,
    });

    if (!token) {
      return { totalAmount: 0 };
    }

    const aggregationResult = await this.walletTransactionModel.aggregate([
      {
        $lookup: {
          from: 'wallets',
          localField: 'wallet',
          foreignField: '_id',
          as: 'wallet',
          pipeline: [
            {
              $match: {
                token: token._id,
                deletedAt: null,
              },
            },
          ],
        },
      },
      {
        $unwind: '$wallet',
      },
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const totalAmount = aggregationResult[0]?.totalAmount || 0;
    return { totalAmount: setDecimalPlaces(totalAmount, AmountType.TOKEN) };
  }

  async calculateUsdkToMlykSwapTotal() {
    const aggregationResult = await this.swapTransactionModel.aggregate([
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'fromWallet',
          foreignField: '_id',
          as: 'fromWallet',
        },
      },
      { $unwind: '$fromWallet' },
      {
        $lookup: {
          from: 'wallets',
          localField: 'toWallet',
          foreignField: '_id',
          as: 'toWallet',
        },
      },
      { $unwind: '$toWallet' },
      {
        $lookup: {
          from: 'tokens',
          localField: 'fromWallet.token',
          foreignField: '_id',
          as: 'fromToken',
        },
      },
      { $unwind: '$fromToken' },
      {
        $lookup: {
          from: 'tokens',
          localField: 'toWallet.token',
          foreignField: '_id',
          as: 'toToken',
        },
      },
      { $unwind: '$toToken' },
      {
        $match: {
          'fromToken.symbol': 'usdk',
          'toToken.symbol': 'mlyk',
          'fromWallet.deletedAt': null,
          'toWallet.deletedAt': null,
          'fromToken.deletedAt': null,
          'toToken.deletedAt': null,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          uniqueUsers: { $addToSet: '$user' },
        },
      },

      {
        $project: {
          _id: 0,
          totalAmount: 1,
          totalUsers: { $size: '$uniqueUsers' },
        },
      },
    ]);

    const result = aggregationResult[0] || { totalAmount: 0, totalUsers: 0 };

    return {
      totalAmount: setDecimalPlaces(result.totalAmount, AmountType.TOKEN),
      totalUsers: result.totalUsers,
    };
  }

  async calculateUsdkOldToMlykSwapTotal() {
    const aggregationResult = await this.swapTransactionModel.aggregate([
      {
        $match: {
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'fromWallet',
          foreignField: '_id',
          as: 'fromWallet',
        },
      },
      { $unwind: '$fromWallet' },
      {
        $lookup: {
          from: 'wallets',
          localField: 'toWallet',
          foreignField: '_id',
          as: 'toWallet',
        },
      },
      { $unwind: '$toWallet' },
      {
        $lookup: {
          from: 'tokens',
          localField: 'fromWallet.token',
          foreignField: '_id',
          as: 'fromToken',
        },
      },
      { $unwind: '$fromToken' },
      {
        $lookup: {
          from: 'tokens',
          localField: 'toWallet.token',
          foreignField: '_id',
          as: 'toToken',
        },
      },
      { $unwind: '$toToken' },
      {
        $match: {
          'fromToken.symbol': 'usdk-old',
          'toToken.symbol': 'mlyk',
          'fromWallet.deletedAt': null,
          'toWallet.deletedAt': null,
          'fromToken.deletedAt': null,
          'toToken.deletedAt': null,
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          uniqueUsers: { $addToSet: '$user' },
        },
      },

      {
        $project: {
          _id: 0,
          totalAmount: 1,
          totalUsers: { $size: '$uniqueUsers' },
        },
      },
    ]);

    const result = aggregationResult[0] || { totalAmount: 0, totalUsers: 0 };

    return {
      totalAmount: setDecimalPlaces(result.totalAmount, AmountType.TOKEN),
      totalUsers: result.totalUsers,
    };
  }

  // retrieve add-stake, ac-debit and daily-reward
  async getCloudKTransactionsStats(paginateDTO: CloudKFilterDTO): Promise<any> {
    const { fromDate, toDate, type, email, bid } = paginateDTO;

    const transactionTypes = ['add-stake', 'ac-debit', 'daily-reward'];

    const matchConditions: any = {
      deletedAt: { $exists: false },
      type: { $in: type ? [type] : transactionTypes },
    };

    if (email) {
      const user = await this.userModel.findOne({ email }).exec();
      if (user) {
        matchConditions.user = new Types.ObjectId(user._id.toString());
      } else {
        throw new HttpException(
          'User with email ${email} not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    if (bid) {
      const user = await this.userModel.findOne({ blockchainId: bid }).exec();
      if (user) {
        matchConditions.user = new Types.ObjectId(user._id.toString());
      } else {
        throw new HttpException(
          'User with email ${bid} not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);

      matchConditions.createdAt = {
        $gte: from,
        $lte: to,
      };
    }

    const result = await this.cloudkTransactionModel.aggregate([
      {
        $match: matchConditions,
      },
      {
        $group: {
          _id: '$type',
          totalTokenAmount: { $sum: '$tokenAmount' },
        },
      },
    ]);
    let response: any = {};
    if (type) {
      const resultForType = result.find((r) => r._id === type);
      response = {
        [`total${type === 'ac-debit' ? 'AutoLink' : type.charAt(0).toUpperCase() + type.slice(1).replace(/-([a-z])/g, (match, letter) => letter.toUpperCase())}Amount`]:
        {
          type,
          amount: resultForType ? resultForType.totalTokenAmount : 0,
        },
      };
    } else {
      response = result.reduce(
        (acc, { _id, totalTokenAmount }) => {
          switch (_id) {
            case 'add-stake':
              acc.totalStakeAmount.amount = totalTokenAmount;
              break;
            case 'ac-debit':
              acc.totalAutoLinkAmount.amount = totalTokenAmount;
              break;
            case 'daily-reward':
              acc.totalRewardAmount.amount = totalTokenAmount;
              break;
          }
          return acc;
        },
        {
          totalStakeAmount: { type: 'add-stake', amount: 0 },
          totalAutoLinkAmount: { type: 'auto-link', amount: 0 },
          totalRewardAmount: { type: 'daily-reward', amount: 0 },
        },
      );
    }
    return {
      message: 'All transactions retrieved successfully',
      status: true,
      data: response,
    };
  }

  async getCloudKTransactionsStatsv2(
    paginateDTO: CloudKFilterDTO,
  ): Promise<any> {
    const { fromDate, toDate, type, query } = paginateDTO;
    const transactionTypes = ['ac-debit', 'daily-reward', 'add-stake'];

    const matchConditions: any = {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      type: { $in: type ? [type] : transactionTypes },
    };

    if (query) {
      const searchRegex = new RegExp(query, 'i');
      const userQuery = {
        $or: [
          { email: { $regex: searchRegex } },
          { blockchainId: { $regex: searchRegex } },
          { firstName: { $regex: searchRegex } },
          { lastName: { $regex: searchRegex } },
          { userName: { $regex: searchRegex } },
        ],
      };
      const user = await this.userModel.findOne(userQuery).exec();
      if (!user) {
        return {
          totalTransaction: {
            type:
              `Total ${type == 'ac-debit'
                ? 'Auto Link'
                : type == 'daily-reward'
                  ? 'Daily Reward'
                  : type == 'add-stake'
                    ? 'Stake'
                    : type
              } Amount ` || 'all',
            totalTokenAmount: 0,
          },
          totalTransactionByProduct: [],
        };
      }
      matchConditions.user = new Types.ObjectId(user._id.toString());
    }

    if (fromDate) {
      const from = new Date(fromDate);
      const to = toDate ? new Date(toDate) : new Date();
      to.setUTCHours(23, 59, 59, 999);
      matchConditions.createdAt = { $gte: from, $lte: to };
    }

    // Get total transactions by type
    const totalsByType = await this.cloudkTransactionModel.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$tokenAmount' },
        },
      },
    ]);

    // Get totals by machine from products
    const ProductWiseTotals = await this.cloudkTransactionModel.aggregate([
      { $match: matchConditions },
      {
        $lookup: {
          from: 'cloudkmachines',
          localField: 'machine',
          foreignField: '_id',
          as: 'machine',
        },
      },
      { $unwind: '$machine' },
      {
        $lookup: {
          from: 'cloudkproducts',
          localField: 'machine.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: {
            productId: '$product._id',
            productName: '$product.name',
            externalProductId: '$product.externalProductId',
            imageUrl: '$product.imageUrl',
          },
          totalTokenAmount: { $sum: '$tokenAmount' },
        },
      },
    ]);

    const transactionSummary =
      totalsByType?.length > 0
        ? {
          type: totalsByType[0]._id,
          totalTokenAmount: totalsByType[0].totalAmount,
          name: `Total ${totalsByType[0]._id == 'ac-debit'
            ? 'Auto Link'
            : totalsByType[0]._id == 'daily-reward'
              ? 'Daily Reward'
              : totalsByType[0]._id == 'add-stake'
                ? 'Stake'
                : totalsByType[0]._id
            } Amount `,
        }
        : {
          type:
            `Total ${type == 'ac-debit'
              ? 'Auto Link'
              : type == 'daily-reward'
                ? 'Daily Reward'
                : type == 'add-stake'
                  ? 'Stake'
                  : type
            } Amount ` || 'all',
          totalTokenAmount: 0,
        };

    return {
      totalTransaction: transactionSummary,
      totalTransactionByProduct: ProductWiseTotals.map((item) => ({
        _id: item?._id?.productId || '',
        name: item?._id?.productName || '',
        externalProductId: item?._id?.externalProductId || '',
        imageUrl: item?._id?.imageUrl || '',
        totalTokenAmount: item?.totalTokenAmount || '',
      })),
    };
  }

  async createSubSuperAdmin(createSubSuperAdminDto): Promise<Admin> {
    try {
      const existingAdmin = await this.adminModel.findOne({
        email: createSubSuperAdminDto.email,
        deletedAt: { $eq: null },
      });

      if (existingAdmin) {
        throw new ConflictException(
          `An admin with the email '${existingAdmin.email}' already exists.`,
        );
      }

      if (createSubSuperAdminDto.username) {
        const existingAdminWithUsername = await this.adminModel.findOne({
          username: createSubSuperAdminDto.username,
          deletedAt: { $eq: null },
        });

        if (existingAdminWithUsername) {
          throw new ConflictException(
            `An admin with the username '${createSubSuperAdminDto.username}' already exists.`,
          );
        }
      }

      let role;
      if (!createSubSuperAdminDto.role) {
        role = await this.adminRole.findOne({ name: 'SubSuperAdmin' });
        console.log('Role provided:', createSubSuperAdminDto.role);

        if (!role) {
          const permissions = permissionList
            .map((permission) => ({
              module: permission.module,
              action: permission.action.filter(
                (action) => action !== ACTION.WRITE && action !== ACTION.DELETE,
              ),
              page: permission.page,
            }))
            .filter((permission) => permission.action.length > 0);

          console.log(
            'Creating new SubSuperAdmin role with permissions:',
            permissions,
          );

          role = await this.adminRole.create({
            name: 'SubSuperAdmin',
            permissions,
          });
        }
      } else {
        role = await this.adminRole.findById(createSubSuperAdminDto.role);
        if (!role) {
          throw new NotFoundException(
            `Role with ID ${createSubSuperAdminDto.role} not found`,
          );
        }

        const updatedPermissions = permissionList
          .map((permission) => ({
            module: permission.module,
            action: permission.action.filter(
              (action) => action !== ACTION.WRITE && action !== ACTION.DELETE,
            ),
            page: permission.page,
          }))
          .filter((permission) => permission.action.length > 0);

        role.permissions = updatedPermissions;

        await role.save();
      }

      const adminData = {
        ...createSubSuperAdminDto,
        isSubSuperAdmin: true,
        isSuperAdmin: false,
        role: role._id,
      };
      const createdAdmin = await this.adminModel.create(adminData);
      return await createdAdmin.populate('role');
    } catch (error) {
      const errorMessage = error.message || '';

      if (
        errorMessage.includes('dup key') ||
        errorMessage.includes('duplicate key error')
      ) {
        const match = errorMessage.match(
          /index: (\w+)_\d+ dup key: { (\w+): "(.*?)" }/,
        );
        if (match) {
          const field = match[2];
          const value = match[3];
          throw new ConflictException(
            `The ${field} '${value}' is already in use. Please choose a different one.`,
          );
        }
        throw new ConflictException(
          `A duplicate key error occurred. Please check your input.`,
        );
      }

      throw new BadRequestException(errorMessage);
    }
  }

  async updateAdminRole(
    id: string,
    roleId: string,
    payload: { firstName: string; lastName: string; isSubSuperAdmin: boolean },
  ): Promise<Admin> {
    const { firstName, isSubSuperAdmin, lastName } = payload;
    const admin = await this.adminModel.findById(id);
    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    const roleExists = await this.adminRole.findById(roleId);

    if (!roleExists) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }
    admin.firstName = firstName;
    admin.lastName = lastName;

    admin.role = roleExists;
    admin.isSubSuperAdmin = isSubSuperAdmin || false;
    // admin.isSuperAdmin = true;
    await admin.save();
    return admin.populate('role');
  }

  async handleUserStatus(
    userStatusDto: UserStatusDTO,
    adminDetails,
  ): Promise<User> {
    const { blockchainId, isBlocked, blockedReason, unblockedReason } =
      userStatusDto;
    const { _id, email } = adminDetails;

    const user: any = await this.userModel.findOne({ blockchainId });
    if (!user) {
      throw new Error('User not found');
    }

    if (!isBlocked && unblockedReason === '') {
      throw new BadRequestException('unblockedReason should not be empty');
    }

    if (isBlocked && blockedReason === '') {
      throw new BadRequestException('blockedReason should not be empty');
    }

    if (isBlocked) {
      user.blockedReason = blockedReason;
      user.blockedBy = email;
    } else {
      user.unblockedReason = unblockedReason;
      user.unblockedBy = !isBlocked && email ? email : '';
    }

    user.isBlocked = isBlocked;
    await user.save();

    // Log user out if they are blocked
    if (isBlocked) {
      await this.deviceService.logoutAllDevicesV1(user._id.toString());
    }

    await this.UserBlockAdminLogsModel.create({
      userId: user._id,
      adminId: _id,
      isBlocked: isBlocked,
      blockedReason: blockedReason,
      unblockedReason: unblockedReason,
      type: isBlocked ? 'blocked' : 'unblocked',
    });

    return user;
  }

  async getSubSuperAdminRole(): Promise<Role> {
    const subSuperAdminRole = await this.adminRole.findOne({
      name: 'SubSuperAdmin',
      deletedAt: { $eq: null },
    });

    if (!subSuperAdminRole) {
      throw new NotFoundException('SubSuperAdmin role not found');
    }

    return subSuperAdminRole;
  }

  async isUserBlocked(userId: string): Promise<boolean> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.isBlocked;
  }
}
