import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Burn, BURN_STATUS_TYPE } from './schema/burn.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { CreateBunDto } from './dto/create-bun.dto';
import { UpdateBunStatusDto, UpdateBurnDto } from './dto/update-bun-status';
import { CloudKMachine } from '../cloud-k/schemas/cloudk-machine.schema';
import { CloudKDepositService } from '../cloud-k/cloud-k-deposit.service';
import { BurnParticipants } from './schema/burn.participant.schema';
import { WalletService } from '../wallet/wallet.service';
import { CloudKService } from '../cloud-k/cloud-k.service';
import { CloudKSetting } from '../cloud-k/schemas/cloudk-setting.schema';
import { UpdateBurnTokenDto } from './dto/update-burn-tokens';
import { Token } from '../token/schemas/token.schema';

@Injectable()
export class BurnService {
  constructor(
    @InjectModel(Burn.name) private bunModel: Model<Burn>,
    @InjectModel(CloudKMachine.name) private machineModel: Model<CloudKMachine>,
    @InjectModel(Token.name) private tokenModel: Model<Token>,

    @InjectModel(CloudKSetting.name)
    private cloudKSettingModel: Model<CloudKSetting>,

    @InjectModel(BurnParticipants.name)
    private burnParticipantsModel: Model<BurnParticipants>,
    @Inject(forwardRef(() => CloudKDepositService))
    private readonly cloudKDepositService: CloudKDepositService,
    private readonly walletService: WalletService,
    private readonly cloudKService: CloudKService,
  ) {}

  async createBurn(adminId: Types.ObjectId, createPhaseDto: CreateBunDto) {
    const { startAt, expiresAt } = createPhaseDto;

    if (new Date(startAt).getTime() < Date.now()) {
      throw new BadRequestException('The start date cannot be in the past!');
    }

    if (new Date(expiresAt).getTime() < new Date(startAt).getTime()) {
      throw new BadRequestException(
        'The expiry date must be after the start date!',
      );
    }

    const overlappingPhase = await this.bunModel.findOne({
      $or: [
        {
          startAt: { $lt: createPhaseDto.expiresAt },
          expiresAt: { $gt: createPhaseDto.startAt },
        },
      ],
      status: {
        $nin: [
          BURN_STATUS_TYPE.IN_ACTIVE,
          BURN_STATUS_TYPE.CANCELLED,
          BURN_STATUS_TYPE.PENDING,
        ],
      },
      deletedAt: null,
    });

    if (overlappingPhase) {
      throw new BadRequestException(
        'A phase already exists within this time period.',
      );
    }

    const phaseUniqueCode = randomUUID();

    const phase = await this.bunModel.create({
      ...createPhaseDto,
      phaseUniqueCode,
      admin: adminId,
    });

    return phase;
  }

  async getAllBurns() {
    return await this.bunModel.find({ deletedAt: null }).exec();
  }

  async updateBurnStatus(
    burnId: string,
    updateBurnStatusDto: UpdateBunStatusDto,
  ) {
    const burn = await this.bunModel.findOne({
      _id: new Types.ObjectId(burnId),
      deletedAt: null,
    });

    if (!burn) {
      throw new NotFoundException('Phase not found');
    }

    burn.status = updateBurnStatusDto.status;

    await burn.save(); // Save the updated phase

    return burn;
  }

  async updateBurnTokenSettig(
    id: string,
    updateBurnTokenDto: UpdateBurnTokenDto,
  ) {
    const cloudkSetting = await this.cloudKSettingModel.findById(id);

    if (!cloudkSetting) {
      throw new NotFoundException('Setting Not Found');
    }

    // Update specific fields based on the DTO
    if (updateBurnTokenDto.burnReceiveToken) {
      const burnReceiveToken = await this.tokenModel.findById(
        updateBurnTokenDto.burnReceiveToken,
      );
      if (!burnReceiveToken) {
        throw new NotFoundException('Burn Receive Token Not Found');
      }
      cloudkSetting.burnReceiveToken = burnReceiveToken;
    }

    if (updateBurnTokenDto.burnInToken) {
      const burnInToken = await this.tokenModel.findById(
        updateBurnTokenDto.burnInToken,
      );
      if (!burnInToken) {
        throw new NotFoundException('Burn In Token Not Found');
      }
      cloudkSetting.burnInToken = burnInToken;
    }

    await cloudkSetting.save(); // Save the updated settings

    return cloudkSetting;
  }

  async getAllBurnsTokenSetting() {
    return this.cloudKSettingModel.find();
  }

  async fetchActiveBurn() {
    const activeBun = await this.bunModel.findOne({
      status: {
        $nin: [
          BURN_STATUS_TYPE.IN_ACTIVE,
          BURN_STATUS_TYPE.CANCELLED,
          BURN_STATUS_TYPE.PENDING,
        ],
      },
      startAt: { $lte: new Date() },
      expiresAt: { $gte: new Date() },
      deletedAt: null,
    });

    return activeBun;
  }

  async getActiveBurnCalculation(
    amount,
    machine,
    userId,
    price,
    HundredPercentClicked,
  ) {
    return this.cloudKDepositService.getBunCalculationV4(
      machine,
      userId,
      amount,
      true,
      price,
      HundredPercentClicked,
    );
  }

  async joinActiveBurn(user: Types.ObjectId) {
    const [activeBun, isJoinedOrNot, settings] = await Promise.all([
      this.fetchActiveBurn(),
      this.burnParticipantsModel
        .findOne({
          user,
        })
        .select('_id'),
      this.cloudKService.getCurrentCloudkSettings(),
    ]);

    if (!activeBun) {
      throw new NotFoundException('No active burn phase found.');
    }

    if (isJoinedOrNot) {
      throw new NotFoundException('User already joined.');
    }
    const [usdkPromoWallet, smlykWallet]: any = await Promise.all([
      this.walletService.findUserWalletByTokenSymbol(
        settings.burnReceiveToken.symbol,
        user,
      ),
      this.walletService.findUserWalletByTokenSymbol(
        settings.burnInToken.symbol,
        user,
      ),
    ]);

    const [usdkPromoBalance, smlykBalance] = await Promise.all([
      this.walletService.getBalanceByToken(user, usdkPromoWallet.token._id),
      this.walletService.getBalanceByToken(user, smlykWallet.token._id),
    ]);

    //
    const joinParticipant = await this.burnParticipantsModel.create({
      user,
      joiningDate: new Date(),
    });

    return {
      message: 'Successfully joined',
      data: { joinParticipant, usdkPromoBalance, smlykBalance },
    };
  }

  async userStatusForActiveBurn(user: Types.ObjectId) {
    const activeBurn = await this.fetchActiveBurn();
    // console.log(
    //   '🚀 ~ BurnService ~ userStatusForActiveBurn ~ activeBurn:',
    //   activeBurn,
    // );

    if (!activeBurn) {
      return {
        activeBurn: null,
      };
    }

    const [settings, isJoinedOrNot] = await Promise.all([
      this.cloudKService.getCurrentCloudkSettings(),
      this.burnParticipantsModel
        .findOne({
          user,
        })
        .select('_id'),
    ]);

    if (!settings) {
      throw new NotFoundException(
        'There is no setting available from the Admin',
      );
    }
    const [usdkPromoWallet, smlykWallet]: any = await Promise.all([
      this.walletService.findUserWalletByTokenSymbol(
        settings.burnReceiveToken.symbol,
        user,
      ),
      this.walletService.findUserWalletByTokenSymbol(
        settings.burnInToken.symbol,
        user,
      ),
    ]);

    const [usdkPromoBalance, smlykBalance] = await Promise.all([
      this.walletService.getBalanceByToken(user, usdkPromoWallet.token._id),
      this.walletService.getBalanceByToken(user, smlykWallet.token._id),
    ]);

    if (!usdkPromoWallet) {
      throw new NotFoundException('User does not have USDK-PROMO wallet');
    }
    if (!smlykWallet) {
      throw new NotFoundException('User does not have SM-LYK wallet');
    }

    if (!isJoinedOrNot) {
      // throw new NotFoundException('User Not joined the active Burn');
      return {
        activeBurn: activeBurn,
        isJoined: false,
        usdkPromoBalance: usdkPromoBalance.balance,
        smlykBalance: smlykBalance.balance,
      };
    }
    return {
      isJoined: true,
      usdkPromoBalance: usdkPromoBalance.balance,
      smlykBalance: smlykBalance.balance,
      activeBurn,
    };
  }

  async burnUsdkTosmLYK(userid) {
    const data: any = await this.cloudKDepositService.getBurnWalletBalance(
      new Types.ObjectId(userid),
    );
    // Check if the burn-in token balance is zero
    if (data.burnReceiveTokenBalance <= 0) {
      return {
        message: `No balance available in ${data.burnReceiveToken.name} to burn in ${data.burnInToken.name}.`,
      };
    }

    const swap = await this.walletService.newSwap(userid, {
      fromToken: data.burnReceiveToken.id,
      toToken: data.burnInToken._id,
      amount: data.burnReceiveTokenBalance,
    });
    //
    if (swap) {
      return {
        message: ` Total ${data.burnReceiveTokenBalance} burn successfully in ${data.burnInToken.name}.`,
      };
    }
  }

  async updatePhaseData(burnId: string, updateBurnDto: UpdateBurnDto) {
    const burn = await this.bunModel.findOne({
      _id: new Types.ObjectId(burnId),
      deletedAt: null,
    });

    if (!burn) {
      throw new NotFoundException('Phase not found');
    }

    if (
      new Date(updateBurnDto.startAt).getTime() !=
        new Date(burn.startAt).getTime() &&
      burn.status == BURN_STATUS_TYPE.ACTIVE
    ) {
      throw new BadRequestException(
        "Already started. You don't have the permission to change the start date. ",
      );
    }

    if (
      new Date(updateBurnDto.startAt).getTime() !=
        new Date(burn.startAt).getTime() &&
      new Date(updateBurnDto.startAt).getTime() < Date.now()
    ) {
      throw new BadRequestException('The start date cannot be in the past!');
    }

    if (
      new Date(updateBurnDto.expiresAt).getTime() <
      new Date(updateBurnDto.startAt).getTime()
    ) {
      throw new BadRequestException(
        'The expiry date must be after the start date!',
      );
    }

    // check in between start date and end date any phase is enabled or not
    const overlappingPhase = await this.bunModel.findOne({
      $or: [
        {
          startAt: { $lt: updateBurnDto.expiresAt },
          expiresAt: { $gt: updateBurnDto.startAt },
        },
      ],
      status: {
        $nin: [BURN_STATUS_TYPE.IN_ACTIVE, BURN_STATUS_TYPE.CANCELLED],
      },
      _id: {
        $nin: [burn._id],
      },
      deletedAt: null,
    });

    if (overlappingPhase) {
      throw new NotFoundException(
        'Already a phase exist with same date or in between date',
      );
    }

    burn.name = updateBurnDto.name;
    burn.startAt = updateBurnDto.startAt;
    burn.expiresAt = updateBurnDto.expiresAt;
    burn.normalPercentage = updateBurnDto.normalPercentage;
    burn.boostPercentage = updateBurnDto.boostPercentage;

    await burn.save(); // Save the updated phase

    return burn;
  }
  async deletePhaseData(burnId: string) {
    const burn = await this.bunModel.findOne({
      _id: new Types.ObjectId(burnId),
      deletedAt: null,
    });

    if (!burn) {
      throw new NotFoundException('Phase not found');
    }

    burn.deletedAt = new Date();

    await burn.save(); // Save the updated phase

    return burn;
  }
  async getBurnTokenLimit(
    machineId: Types.ObjectId,
    userId: Types.ObjectId,
    price: any,
  ) {
    return this.cloudKDepositService.getBurnlimit(machineId, userId, price);
  }
}
