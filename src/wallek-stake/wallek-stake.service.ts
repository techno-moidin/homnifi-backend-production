import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { TrxType } from '../global/enums/trx.type.enum';
import { TransactionFlow } from '../wallet/enums/transcation.flow.enum';
import { WalletTransaction } from '../wallet/schemas/wallet.transaction.schema.';
import { WallekStake } from './schemas/wallek-stake.schema';
import { TransactionStatus } from '../global/enums/transaction.status.enum';
import { DepositTransaction } from '../wallet/schemas/deposit.transaction.schema';
import { DepositTransactionHistory } from '../wallet/schemas/deposit.history.transaction.schema';
import { PaginateDTO } from '../admin/global/dto/paginate.dto';
import { WallekTransactionHistory } from './schemas/wallek-transaction-history.schema';

import { WalletService } from '../wallet/wallet.service';
import { pagination } from '../utils/helpers';
import { StakeSettings } from './schemas/stake-settings.schema';
import { Token } from '../token/schemas/token.schema';

@Injectable()
export class WallekStakeService {
  constructor(
    @InjectModel(WallekStake.name)
    private wallekStakeModel: Model<WallekStake>,
    @InjectModel(WalletTransaction.name)
    private walletTransactionModel: Model<WalletTransaction>,
    @InjectModel(DepositTransaction.name)
    private depositTransactionModel: Model<DepositTransaction>,
    @InjectModel(DepositTransactionHistory.name)
    private depositTransactionHistoryModel: Model<DepositTransactionHistory>,
    @InjectModel(WallekTransactionHistory.name)
    private wallekTransactionHistoryModel: Model<WallekTransactionHistory>,
    @InjectModel(StakeSettings.name)
    private wallekStakeSettingsModel: Model<StakeSettings>,

    @InjectModel(Token.name)
    private tokenModel: Model<Token>,

    private walletService: WalletService,
  ) {}

  async getStakingBalance(
    userId: mongoose.Types.ObjectId,
    paginateDTO: PaginateDTO,
  ) {
    try {
      const { page = 1, limit = 10 } = paginateDTO;
      const skip = (page - 1) * limit;
      const count = await this.wallekStakeModel.countDocuments({
        user: userId,
        deletedAt: null,
      });

      const result = await this.wallekStakeModel
        .find({
          user: userId,
          deletedAt: null,
        })
        .populate({
          path: 'token',
          select:
            'name symbol type withdrawType color borderColor networks iconUrl valueType platforms showZeroBalance',
        })
        .populate({
          path: 'wallet',
          select: 'name balance allowWithdraw allowDeposit',
        })
        .select('-meta')
        .skip(skip)
        .limit(limit);
      return {
        totalCount: count,
        page: page,
        limit: limit,
        result,
      };
    } catch (error) {
      throw new InternalServerErrorException('Error fetching staking balance');
    }
  }

  async claimBalance(
    stakeId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
  ) {
    const stake = await this.wallekStakeModel.findById(stakeId);

    if (!stake) {
      throw new NotFoundException('Stake not found');
    }

    if (!stake.user.equals(userId)) {
      throw new UnauthorizedException(
        'You are not authorized to claim this stake',
      );
    }

    if (stake.isClaimed) {
      throw new BadRequestException('Stake already claimed');
    }

    stake.stakedPeriod ??= 0;
    stake.lockupPeriod ??= 0;

    if (!this.isStakeClaimable(stake)) {
      const lockupEndDate = new Date(stake.endStakedDate);

      throw new BadRequestException(
        `Stake is locked until ${lockupEndDate.toISOString()}. Please wait until the lockup period ends.`,
      );
    }

    try {
      const session = await this.wallekStakeModel.db.startSession();
      let transaction, depositTx, wallekHistory;

      const stakeSetting = await this.wallekStakeSettingsModel
        .findOne({ fromToken: stake.token })
        .lean();
      if (!stakeSetting) {
        console.log(`No stakeSetting found for token: ${stake.token}`);
      } else {
        console.log('Found stakeSetting:', stakeSetting);
      }

      const _toToken = await this.tokenModel
        .findOne({ _id: stakeSetting.toToken, deletedAt: null })
        .lean();

      const _toWallet = await this.walletService.findUserWalletByTokenSymbol(
        _toToken.symbol,
        stake.user._id as any,
      );

      const { walletBalance } = await this.walletService.getBalanceByWallet(
        stake.user._id as any,
        _toWallet._id as any,
      );
      const { requestId, serialNumber } =
        await this.walletService.generateUniqueRequestId(TrxType.DEPOSIT);

      const result = await session.withTransaction(async () => {
        transaction = await this.walletTransactionModel.create(
          [
            {
              user: stake.user,
              wallet: _toWallet,
              trxType: TrxType.STAKE_CLAIM,
              amount: stake.tokenAmount,
              actualAmount: stake.tokenAmount,
              transactionFlow: TransactionFlow.IN,
              note: 'Stake claim',
              meta: {
                stake: stake._id,
                userBid: stake.userBid,
                stakedPeriod: stake.stakedPeriod,
                lockupPeriod: stake.lockupPeriod,
                expiryDate: stake.expiryDate,
                token: _toToken,
                stakedDate: stake.startStakedDate,
              },
            },
          ],
          { session },
        );
        depositTx = await this.depositTransactionModel.create(
          [
            {
              user: stake.user,
              amount: stake.tokenAmount,
              token: _toToken,
              toWallet: _toWallet,
              toWalletTrx: transaction[0]._id,
              transactionStatus: TransactionStatus.SUCCESS,
              note: 'Stake claim deposit',
              requestId: requestId,
              previousBalance: walletBalance,
              newBalance: walletBalance + stake.tokenAmount,
              remarks: `WalleK claimed stake amount of  ${Number(stake.tokenAmount.toFixed(6))} ${_toToken.symbol} deposited successfully.`,
              serialNumber: serialNumber,
            },
          ],
          { session },
        );

        await this.depositTransactionHistoryModel.create(
          [
            {
              deposit_id: depositTx[0]._id,
              serialNumber: depositTx[0].serialNumber,
              requestId: depositTx[0].requestId,
              user: stake.user,
              toWallet: _toWallet,
              token: _toToken,
              amount: stake.tokenAmount,
              remarks: `WalleK claimed stake amount of  ${Number(stake.tokenAmount.toFixed(6))} ${_toToken.symbol} deposited successfully.`,
              transactionStatus: TransactionStatus.SUCCESS,
              note: 'Stake claim deposit history',
              toWalletTrx: transaction[0]._id,
              status: TransactionStatus.SUCCESS,
              previousBalance: walletBalance,
              newBalance: walletBalance + stake.tokenAmount,
              meta: {
                stakeId: stake._id,
                stakedPeriod: stake.stakedPeriod,
                lockupPeriod: stake.lockupPeriod,
                expiryDate: stake.expiryDate,
                stakedDate: stake.startStakedDate,
              },
            },
          ],
          { session },
        );

        wallekHistory = await this.wallekTransactionHistoryModel.create(
          [
            {
              user: stake.user,
              deposit_id: depositTx[0].requestId,
              stake: stake._id,
              bid: stake.userBid,
              stakeExpiryDate: stake.expiryDate,
              wallek: _toWallet,
              claimDate: new Date(),
              status: TransactionStatus.COMPLETED,
              amount: stake.tokenAmount,
              toToken: _toToken,
              fromToken: stake.token,
              stakeSettings: stakeSetting._id,
            },
          ],
          { session },
        );

        stake.isClaimed = true;
        stake.status = TransactionStatus.SUCCESS;
        await stake.save({ session });

        return { transaction, depositTx, wallekHistory };
      });

      await session.endSession();

      if (!result) {
        throw new InternalServerErrorException('Transaction failed');
      }

      return {
        message: 'Stake claimed successfully',
        stake,
        transaction: result.transaction[0],
        depositTransaction: result.depositTx[0],
        wallekTransactionHistory: result.wallekHistory[0],
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('This stake has already been processed');
      }
      throw new InternalServerErrorException(
        'Error processing claim: ' + error.message,
      );
    }
  }

  private async generateSerialNumber(): Promise<number> {
    const lastDeposit = await this.depositTransactionModel
      .findOne()
      .sort({ serialNumber: -1 });
    return (lastDeposit?.serialNumber || 0) + 1;
  }

  async getClaimHistory(
    userId: mongoose.Types.ObjectId,
    paginateDTO: PaginateDTO,
  ) {
    try {
      const { page = 1, limit = 10, query } = paginateDTO;

      const whereConfig: any = { user: userId };
      if (query) {
        whereConfig.deposit_id = query;
      }

      const paginate = await pagination({
        page,
        pageSize: limit,
        model: this.wallekTransactionHistoryModel,
        condition: whereConfig,
        pagingRange: 5,
      });

      const list = await this.wallekTransactionHistoryModel
        .aggregate([
          {
            $match: whereConfig,
          },
          {
            $lookup: {
              from: 'wallekstakes',
              localField: 'stake',
              foreignField: '_id',
              as: 'stakeDetails',
            },
          },
          {
            $unwind: {
              path: '$stakeDetails',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'tokens',
              localField: 'fromToken',
              foreignField: '_id',
              as: 'fromTokenDetails',
            },
          },
          {
            $unwind: {
              path: '$fromTokenDetails',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'tokens',
              localField: 'toToken',
              foreignField: '_id',
              as: 'toTokenDetails',
            },
          },
          {
            $unwind: {
              path: '$toTokenDetails',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $sort: { claimDate: -1 },
          },
          {
            $skip: paginate.offset,
          },
          {
            $limit: paginate.limit,
          },
          {
            $project: {
              _id: 1,
              deposit_id: 1,
              amount: 1,
              tokenAmount: '$stakeDetails.tokenAmount',
              status: 1,
              stake: 1,
              claimDate: 1,
              stakeExpiryDate: 1,
              stakedDate: '$stakeDetails.startStakedDate',
              lockupPeriod: '$stakeDetails.lockupPeriod',
              user: 1,
              bid: 1,
              wallet: '$wallek',
              timeToExpiry: {
                $subtract: [
                  { $toLong: '$stakeExpiryDate' },
                  { $toLong: '$claimDate' },
                ],
              },
              claimedBeforeExpiry: {
                $lt: ['$claimDate', '$stakeExpiryDate'],
              },
              toToken: {
                $ifNull: [
                  {
                    id: '$toTokenDetails._id',
                    name: '$toTokenDetails.name',
                    symbol: '$toTokenDetails.symbol',
                  },
                  null,
                ],
              },
              fromToken: {
                $ifNull: [
                  {
                    id: '$fromTokenDetails._id',
                    name: '$fromTokenDetails.name',
                    symbol: '$fromTokenDetails.symbol',
                  },
                  null,
                ],
              },
            },
          },
        ])
        .exec();

      return {
        list,
        totalCount: paginate.total,
        totalPages: paginate.metadata.page.totalPage,
        currentPage: paginate.metadata.page.currentPage,
        paginate,
      };
    } catch (error) {
      console.error('Error fetching claim history:', error);
      throw new InternalServerErrorException('Error fetching claim history');
    }
  }

  private isStakeClaimable(stake: WallekStake): boolean {
    const now = Date.now(); // Current time in UTC
    let lockupEnd = new Date(stake.endStakedDate);

    // Convert Gulf Standard Time (UTC+4) to UTC
    lockupEnd.setHours(lockupEnd.getHours() - 4);

    return now >= lockupEnd.getTime();
  }
}
