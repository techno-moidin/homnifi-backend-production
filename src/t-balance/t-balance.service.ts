import {
  HttpException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { TBalanceProduct } from './schema/t-balanceProduct.schema';
import {
  ClientSession,
  Connection,
  Model,
  PipelineStage,
  Types,
} from 'mongoose';
import {
  AddTProductDto,
  PurchaseTProductDto,
  PurchaseTProductUpdateDto,
  UpdateTProductsDto,
} from './dtos/tProducts.dto';
import { User } from '../users/schemas/user.schema';
import { TBalanceUserProduct } from './schema/t-balanceUserProduct.schema';
import { ProductPurchaseUserDetailHistory } from './schema/t-balanceProductPurchaseUserDetailHistory.schema';
import { TBalanceUserProductStatus } from './enums/t-product.enums';
import { WalletService } from '../wallet/wallet.service';
import {
  CloudKTransactions,
  CloudKTransactionTypes,
} from '../cloud-k/schemas/cloudk-transactions.schema';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { TrxType } from '../global/enums/trx.type.enum';
import { WithdrawSetting } from '../token/schemas/withdraw.settings.schema';
import { WITHDRAW_TYPES } from '../token/enums/withdraw-types.enum';
import { ChargesType } from '../global/enums/charges.type.enum';
import { RequestStatus } from '../wallet/enums/request.status.enum';
import { WithdrawTransaction } from '../wallet/schemas/withdraw.transaction.schema';
import { aggregatePaginate } from '../utils/pagination.service';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import path from 'path';
import fs from 'fs';
import { format } from 'fast-csv';
import { once } from 'events';
import { EmailService } from '../email/email.service';
import { SwapSetting } from '../token/schemas/swap.settings.schema';
import { Token } from '../token/schemas/token.schema';
import {
  EmailSendStatus,
  TBalanceUploadFilesLogHistory,
} from './schema/t-balanceProcessHistory.schema';
import { ConfigService } from '@nestjs/config';
import {
  tBalanceLogPaginateDTO,
  tBalanceReportLogPaginateDTO,
} from './dtos/tbalancelog.dto';
import { SwapTransaction } from '../wallet/schemas/swap.transaction.schema';
import { getCurrentDay } from '../utils/common/common.functions';
import moment from 'moment';
import { UpdateDepositAndStakeSettingsDto } from '../token/dto/update-deposit-and-stack-settings.dto';

@Injectable()
export class TBalanceService {
  constructor(
    @InjectModel(TBalanceProduct.name)
    private readonly tBalanceProduct: Model<TBalanceProduct>,
    @InjectModel(User.name)
    private readonly user: Model<User>,
    @InjectModel(TBalanceUserProduct.name)
    private readonly tBalanceUserProduct: Model<TBalanceUserProduct>,
    @InjectModel(SwapTransaction.name)
    private readonly swapTransactionModel: Model<SwapTransaction>,
    @InjectModel(ProductPurchaseUserDetailHistory.name)
    private readonly productPurchaseUserDetailHistory: Model<ProductPurchaseUserDetailHistory>,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(CloudKTransactions.name)
    private readonly cloudkTransactionModel: Model<CloudKTransactions>,
    @InjectModel(WithdrawSetting.name)
    private readonly withdrawSettingModel: Model<WithdrawSetting>,
    @InjectModel(WithdrawTransaction.name)
    private readonly withdrawTransactionModel: Model<WithdrawTransaction>,
    @InjectModel(TBalanceUploadFilesLogHistory.name)
    private readonly TBalanceUploadFilesLogHistoryModel: Model<TBalanceUploadFilesLogHistory>,
    private readonly emailService: EmailService,
    @InjectModel(SwapSetting.name)
    private readonly swapSettingModel: Model<SwapSetting>,
    @InjectModel(Token.name)
    private readonly tokenModel: Model<Token>,

    private walletService: WalletService,
    // private userService: UsersService,
    // private cacheService: CacheService,
    // private builderReferralService: BuilderReferralService,
    // private adminSupernodeService: AdminSupernodeService,
  ) {}
  // Get all product list
  async getAllTProducts(paginateDTO) {
    const { page, limit } = paginateDTO;
    const product = await aggregatePaginate(
      this.tBalanceProduct,
      [
        {
          $match: {
            deletedAt: null,
            isVisible: true,
          },
        },
        {
          $sort: {
            price: 1,
          },
        },
      ],
      page,
      limit,
    );
    return product;
  }

  async getAdminAllTProducts(paginateDTO) {
    const { page, limit, query } = paginateDTO;
    let userQuery = {};
    if (query) {
      const searchRegex = new RegExp(query, 'i');
      userQuery = {
        $or: [
          { name: { $regex: searchRegex } },
          { price: Number(query) },
          { returnAmount: Number(query) },
        ],
      };
    }
    const product = await aggregatePaginate(
      this.tBalanceProduct,
      [
        {
          $match: {
            deletedAt: null,
            ...userQuery,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ],
      page,
      limit,
    );
    return product;
  }

  async createTProduct(addProduct: AddTProductDto) {
    const product = await this.tBalanceProduct.create(addProduct);
    return product;
  }

  async updateTProduct(dto: UpdateTProductsDto, productId: string) {
    try {
      const product = await this.tBalanceProduct.findOneAndUpdate(
        { _id: productId },
        { ...dto, lastEditDate: new Date() },
        { new: true },
      );
      if (!product) {
        throw 'Product Update failed';
      }
      return product;
    } catch (error) {
      throw error;
    }
  }

  async deleteTProduct(productId: string) {
    try {
      const product = await this.tBalanceProduct.findOneAndUpdate(
        { _id: productId },
        {
          deletedAt: new Date(),
        },
        { new: true },
      );
      if (!product) {
        throw 'Product Delete failed';
      }
      return product;
    } catch (error) {
      throw error;
    }
  }
  //Purchase the Tproduct
  async purchaseTbalanceProduct(
    user: Types.ObjectId,
    data: PurchaseTProductDto,
  ) {
    const userData = await this.user.findOne({ _id: user, deletedAt: null });
    if (!userData) {
      throw new HttpException('User not found.', 400);
    }

    // check the product is exist
    const product = await this.tBalanceProduct.findOne({
      _id: data.product,
      deletedAt: null,
      isVisible: true,
    });

    if (!product) {
      throw new HttpException('T-Balance Product is not found.', 400);
    }
    const session = await this.connection.startSession();
    await session.startTransaction();
    try {
      // check the token is exist
      const wallet: any = await this.walletService.findUserWalletByTokenSymbol(
        't-balance',
        userData._id as Types.ObjectId,
        session,
      );

      const { walletBalance } = await this.walletService.getBalanceByWallet(
        userData._id as Types.ObjectId,
        wallet._id,
      );

      if (walletBalance < product.price) {
        throw new HttpException(
          `Insufficient T-balance to order this product. Please Topup.`,
          400,
        );
      }

      const createdWalletTrx =
        await this.walletService.createRawWalletTransaction(
          {
            amount: product.price,
            wallet: wallet._id,
            transactionFlow: TransactionFlow.OUT,
            trxType: TrxType.T_BALANCE_WITHDRAW,
            user: userData._id as Types.ObjectId,
            note: 'T-balance withdraw.',
            remark: 'T-balance withdraw.',
          },
          session,
        );

      const { requestId, serialNumber } =
        await this.walletService.generateUniqueRequestId(
          TrxType.T_BALANCE_WITHDRAW,
        );

      const withdrawSetting = await this.withdrawSettingModel.findOne({
        type: WITHDRAW_TYPES.INTERNAL,
        fromToken: wallet.token,
        isEnable: true,
      });

      if (!withdrawSetting) {
        throw new UnprocessableEntityException(
          `Withdrawal is not permitted for the t-balance. Please contact with admin.`,
        );
      }

      await this.withdrawTransactionModel.create(
        [
          {
            user: userData?._id || null,
            fromWallet: wallet._id,
            fromWalletTrx: createdWalletTrx[0]._id,
            network: null,
            receiverAddress: 'T-balance',
            amount: product.price,
            total: product.price,
            fee: 0,
            commission: 0,
            feeType: ChargesType.FIXED,
            commissionType: ChargesType.FIXED,
            userRemarks: 'TBx' + requestId.slice(1),
            requestStatus: RequestStatus.COMPLETED,
            withdrawType: WITHDRAW_TYPES.EXTERNAL,
            token: wallet.token || null,
            serialNumber,
            requestId: 'TBx' + requestId.slice(1),
            receiveToken: '',
            tokenPrice: '',
            settingsUsed: withdrawSetting._id,
            previousBalance: walletBalance,
            newBalance: walletBalance - product.price,
            hash: null,
            blockchainId: userData?.blockchainId || null,
          },
        ],
        { session },
      );

      const userTproduct = new this.tBalanceUserProduct({
        user: userData._id,
        bId: userData.blockchainId,
        tProduct: product._id,
        productPrice: product.price,
        productUniqueId: 'TBx' + requestId.slice(1),
        productReturnAmount: product.returnAmount,
        status: TBalanceUserProductStatus.IN_PROCESS,
        previousBalance: walletBalance,
        newBalance: walletBalance - product.price,
        purchasedDate: new Date(),
        processedDate: new Date(),
      });

      // t-product save
      await userTproduct.save({ session });

      const userTproductHistory = new this.productPurchaseUserDetailHistory({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        status: true,
        tProduct: product._id,
        user: userData._id,
      });

      await userTproductHistory.save({ session });

      // userTproduct.lastEditDate = new Date();
      userTproduct.lastEditId = userTproductHistory._id as Types.ObjectId;
      await userTproduct.save({ session });
      await session.commitTransaction();
      return `Your Product ${product.name} (${userTproduct.productUniqueId}) Option Recorded`;
    } catch (error) {
      console.log('ERROR Message:', { error: error });

      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  //Update t balance product detail update
  async purchaseTbalanceProductUpdate(
    user: Types.ObjectId,
    productId: Types.ObjectId,
    data: PurchaseTProductUpdateDto,
  ) {
    const userData = await this.user.findOne({ _id: user, deletedAt: null });
    if (!userData) {
      throw new HttpException('User not found.', 400);
    }

    // check the product is exist
    const product = await this.tBalanceUserProduct.findOne({
      _id: productId,
      deletedAt: null,
    });

    if (!product) {
      throw new HttpException('T-Balance Product is not found.', 400);
    }

    if (product.status !== TBalanceUserProductStatus.IN_PROCESS) {
      throw new HttpException(
        'T-Balance Product is already processed. You cannot update the data.',
        400,
      );
    }
    const session = await this.connection.startSession();
    await session.startTransaction();
    try {
      await this.productPurchaseUserDetailHistory.updateOne(
        {
          _id: product.lastEditId,
          deletedAt: null,
        },
        {
          status: false,
        },
        {
          session,
        },
      );

      const userTproductHistory = new this.productPurchaseUserDetailHistory({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        status: true,
        tProduct: product.tProduct,
        user: userData._id,
      });

      await userTproductHistory.save({ session });

      product.lastEditDate = new Date();
      product.lastEditId = userTproductHistory._id as Types.ObjectId;
      await product.save({ session });
      await session.commitTransaction();
      return 'User details updated successfully.';
    } catch (error) {
      console.log('ERROR Message:', { error: error });

      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async purchaseTbalanceProductHistory(
    user: Types.ObjectId,
    paginateDTO: PaginateDTO,
  ) {
    const { page, limit, status, query, product, fromDate, toDate } =
      paginateDTO;

    const matchConditions: any[] = [
      { user: new Types.ObjectId(user), deletedAt: { $eq: null } },
    ];

    if (status) {
      matchConditions.push({
        status: status,
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

    if (product) {
      matchConditions.push({
        tProduct: new Types.ObjectId(product),
      });
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          $and: matchConditions,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: 'tbalanceproducts',
          foreignField: '_id',
          localField: 'tProduct',
          as: 'tProduct',
        },
      },
      {
        $unwind: {
          path: '$tProduct',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          foreignField: '_id',
          localField: 'user',
          as: 'user',
          pipeline: [
            {
              $project: {
                firstName: 1,
                lastName: 1,
                profilePicture: 1,
                username: 1,
                email: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'productpurchaseuserdetailhistories',
          foreignField: '_id',
          localField: 'lastEditId',
          as: 'lastEditId',
        },
      },
      {
        $unwind: {
          path: '$lastEditId',
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(query
        ? [
            {
              $match: {
                $or: [
                  { productUniqueId: { $regex: query, $options: 'i' } },
                  { 'tProduct.name': { $regex: query, $options: 'i' } },
                  { 'lastEditId.firstName': { $regex: query, $options: 'i' } },
                  { 'lastEditId.lastName': { $regex: query, $options: 'i' } },
                  { 'lastEditId.email': { $regex: query, $options: 'i' } },
                ],
              },
            },
          ]
        : []),
    ];

    const productData = await aggregatePaginate(
      this.tBalanceUserProduct,
      pipeline,
      page,
      limit,
    );
    return productData;
  }

  async processTbalance() {
    const config = new ConfigService();
    const fileName = 't-balance-processed-transaction-data.csv';
    // const fileName = 'yarn.lock';

    const outputPath = path.resolve(
      process.cwd(),
      'uploads',
      'shared-files',
      fileName,
    );
    const writeStream = fs.createWriteStream(outputPath);
    const csvStream = format({ headers: true });
    csvStream.pipe(writeStream);

    try {
      console.log('Processing...');
      const ids: string[] = [];

      const cursor = this.tBalanceUserProduct
        .find({
          deletedAt: null,
          status: TBalanceUserProductStatus.IN_PROCESS,
        })
        .populate(['tProduct', 'lastEditId'])
        .lean()
        .cursor({ batchSize: 100 });

      await cursor.forEach((doc: any) => {
        ids.push(doc._id);
        delete doc['deletedAt'];

        csvStream.write({
          bId: doc.bId,
          purchaseId: doc.productUniqueId,
          tProductPrice: doc.tProduct.price,
          status: doc.status,
          processedDate: doc.processedDate
            ? moment(moment(doc.processedDate)).format('YYYY-MM-DD HH:mm:ss')
            : null,
          purchasedDate: doc.purchasedDate
            ? moment(moment(doc.purchasedDate).toDate()).format(
                'YYYY-MM-DD HH:mm:ss',
              )
            : null,
          lastEditDate: doc.lastEditDate
            ? moment(moment(doc.lastEditDate).toDate()).format(
                'YYYY-MM-DD HH:mm:ss',
              )
            : null,
          lastEditFirstName: doc.lastEditId?.firstName,
          lastEditLastName: doc.lastEditId?.lastName,
          lastEditEmail: doc.lastEditId?.email,
          TgBalance: doc.newBalance ?? 0,
        });
      });

      csvStream.end();
      console.log('Writing CSV complete. Updating database...');

      // Wait for stream to finish
      await once(writeStream, 'finish');

      await this.tBalanceUserProduct.updateMany(
        { _id: { $in: ids } },
        {
          status: TBalanceUserProductStatus.PROCESSED,
          processedDate: new Date(),
        },
      );

      const receiverEmails = config
        .get<string>('TBALANCE_REPORT_RECEIVER_MAIL')
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email !== '');
      receiverEmails.map(async (toEmail) => {
        const newlog = await new this.TBalanceUploadFilesLogHistoryModel({
          createdAt: new Date(),
          receiverEmail: toEmail,
          emailSendStatus: EmailSendStatus.FAILED,
          processedTransactionCount: ids.length,
        }).save();

        let emailResp = EmailSendStatus.FAILED;

        const emailSendDay = moment().format('DD/MM/YYYY');
        if (ids.length > 0) {
          emailResp = await this.emailService.sendEmailWithAttachment({
            toEmail: toEmail,
            filePath: path.join(
              process.cwd(),
              'uploads',
              'shared-files',
              fileName,
            ),
            subject: `T-Balance Transaction of ${emailSendDay} is generated`,
            text: `T-Balance Transaction of ${emailSendDay} is generated`,
          });
        } else {
          emailResp = await this.emailService.sendEmailWithAttachment({
            toEmail: toEmail,
            subject: `T-Balance Transaction of ${emailSendDay} is empty`,
            text: `T-Balance Transaction of ${emailSendDay} is empty`,
          });
        }

        await newlog.updateOne({
          receiverEmail: toEmail,
          emailSendStatus: emailResp
            ? EmailSendStatus.SUCCESS
            : EmailSendStatus.FAILED,
        });
      });
      console.log('Processing completed.');
      return outputPath;
    } catch (error) {
      console.error('Error processing CSV:', error);
      throw error;
    }
  }

  async twalletBalance(user: Types.ObjectId) {
    const wallet: any = await this.walletService.findUserWalletByTokenSymbol(
      't-balance',
      user as Types.ObjectId,
    );

    const { walletBalance } = await this.walletService.getBalanceByWallet(
      user as Types.ObjectId,
      wallet._id,
    );
    return walletBalance;
  }

  async twalletSwapSettingList(user: Types.ObjectId) {
    const token = await this.tokenModel.findOne({
      symbol: 't-balance',
      deletedAt: null,
    });
    if (!token) {
      throw new UnprocessableEntityException(`T-Balance token is exist.`);
    }

    const swapSettings = await this.swapSettingModel
      .find({
        toToken: token._id,
        deletedAt: null,
        isEnable: true,
      })
      .sort({
        createdAt: -1,
      })
      .populate([{ path: 'fromToken', select: 'name symbol iconUrl color' }]);

    const walletBalances = await Promise.all(
      swapSettings.map(async (setting) => {
        const wallet = await this.walletService.getBalanceByToken(
          user as Types.ObjectId,
          setting.fromToken._id as Types.ObjectId,
        );
        return {
          walletBalance: wallet,
        };
      }),
    );

    return walletBalances;
  }

  async getProcessHistory(dto: tBalanceReportLogPaginateDTO) {
    const { page, limit, query, sortOrder } = dto;
    let userQuery = {};
    if (query) {
      const searchRegex = new RegExp(query, 'i');
      userQuery = {
        $or: [
          { receiverEmail: { $regex: searchRegex } },
          { emailSendStatus: query },
        ],
      };
    }
    const product = await aggregatePaginate(
      this.TBalanceUploadFilesLogHistoryModel,
      [
        {
          $match: {
            deletedAt: null,
            ...userQuery,
          },
        },
        {
          $sort: {
            createdAt: Number(sortOrder) ?? -1,
          },
        },
      ],
      page,
      limit,
    );
    return product;
  }

  async twalletSwappedTotal(user: Types.ObjectId) {
    const token = await this.tokenModel.findOne({
      symbol: 't-balance',
      deletedAt: null,
    });
    if (!token) {
      throw new UnprocessableEntityException(`T-Balance token is exist.`);
    }

    const swapSettings = await this.swapSettingModel
      .find({
        toToken: token._id,
        deletedAt: null,
        isEnable: true,
      })
      .sort({
        createdAt: -1,
      })
      .populate([{ path: 'fromToken', select: 'name symbol iconUrl color' }]);

    const swapTotals = await Promise.all(
      swapSettings.map(async (setting) => {
        const swapTotal = await this.walletService.getTBalanceSwapTotalService(
          user as Types.ObjectId,
          setting.fromToken._id as Types.ObjectId,
          setting.toToken._id as Types.ObjectId,
        );
        if (!swapTotal || swapTotal.length === 0) {
          const data = {
            fromTokenId: setting.fromToken._id,
            fromTokenName: setting.fromToken.name,
            fromTokenSymbol: setting.fromToken.symbol,
            toTokenId: token._id,
            toTokenName: token.name,
            toTokenSymbol: token.symbol,
            totalAmount: 0,
          };
          return data;
        }
        return swapTotal[0];
      }),
    );

    return swapTotals;
  }
  async updateTProductsToggle(productId: string) {
    try {
      const product = await this.tBalanceProduct.findById(productId);
      if (!product) {
        throw new UnprocessableEntityException(
          `T-Balance product is not exist.`,
        );
      }
      product.isVisible = !product.isVisible;
      return await product.save();
    } catch (error) {
      throw error;
    }
  }

  async swapTBalanceReport() {
    const config = new ConfigService();
    const fileName = 't-balance-swap-report-data.csv';
    // const fileName = 'yarn.lock';

    const outputPath = path.resolve(
      process.cwd(),
      'uploads',
      'shared-files',
      fileName,
    );
    const writeStream = fs.createWriteStream(outputPath);
    const csvStream = format({ headers: true });
    csvStream.pipe(writeStream);

    try {
      console.log('Processing...');

      const token: any = await this.walletService.getTokenBySymbol('t-balance');

      const wallets: any = await this.walletService.getAllWalletsByTokenId(
        token._id,
      );
      const walletIds = wallets.map((w) => w._id);
      const currentDate = await getCurrentDay();
      const cursor = this.swapTransactionModel
        .find({
          deletedAt: null,
          toWallet: { $in: walletIds },
          createdAt: {
            $gte: currentDate.startDate,
            $lte: currentDate.endDate,
          },
        })
        .populate({
          path: 'user',
          select: 'blockchainId',
        })
        .populate({
          path: 'fromWallet',
          select: 'token',
          populate: {
            path: 'token',
            select: 'name',
          },
        })
        .populate({
          path: 'settingsUsed',
          select: 'rate',
        })
        .lean()
        .cursor({ batchSize: 100 });
      console.log({ cursor });
      // .cursor({ batchSize: 100 });

      await cursor.forEach((doc: any) => {
        delete doc['deletedAt'];

        csvStream.write({
          BID: doc.user?.blockchainId,
          ReportDate: new Date(),
          SwapDate: new Date(doc.createdAt).toISOString(),
          FromTokenName: doc?.fromWallet?.token?.name ?? null,
          FromTokenAmount: doc.swapAmount,
          ConvertedTGBalance: doc.amount,
          ConversionRate: doc.settingsUsed?.rate ?? 0,
          OldTGBalance: doc.previousBalanceOfToToken,
          NewTGBalance: doc.newBalanceOfToToken,
        });
      });

      csvStream.end();
      console.log('Writing CSV complete. Updating database...');

      // Wait for stream to finish
      await once(writeStream, 'finish');

      const receiverEmails = config
        .get<string>('TBALANCE_REPORT_RECEIVER_MAIL')
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email !== '');

      receiverEmails.map(async (toEmail) => {
        const emailSendDay = moment().format('DD/MM/YYYY');
        const emailResp = await this.emailService.sendEmailWithAttachment({
          toEmail: toEmail,
          filePath: path.join(
            process.cwd(),
            'uploads',
            'shared-files',
            fileName,
          ),
          subject: `T-Balance Daily Swap Report of ${emailSendDay} is generated`,
          text: `T-Balance Daily Swap Report of ${emailSendDay} is generated`,
        });
      });
      console.log('Processing completed.');
      return outputPath;
    } catch (error) {
      console.error('Error processing CSV:', error);
      throw error;
    }
  }
}
