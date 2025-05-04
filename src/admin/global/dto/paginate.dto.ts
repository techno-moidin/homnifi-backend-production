import { IsValidSorting } from '@/src/decorators/querySortingDecorators';
import { CLOUDK_MACHINE_STATUS } from '@/src/cloud-k/schemas/cloudk-machine.schema';
import { DateFilter } from '@/src/global/enums/date.filter.enum';
import { TransactionStatus } from '@/src/global/enums/transaction.status.enum';
import { SN_BONUS_TYPE } from '@/src/supernode/enums/sn-bonus-type.enum';
import { RequestStatus } from '@/src/wallet/enums/request.status.enum';

import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { DISTRIBUTION_STATUS_TYPE } from '@/src/supernode/enums/sngp-distribution.enum';
import { YesOrNo } from '@/src/enums/common.enums';
import { IsObjectId } from 'class-validator-mongo-object-id';
import { Types } from 'mongoose';
import { Transform } from 'class-transformer';
import { transformToLowerCase } from '@/src/utils/helpers';
import { string } from 'zod';
import { OnChainWalletSettingStatus } from '@/src/token/schemas/on.chain.wallet.setting.schema';
import { TransactionFlow } from '@/src/wallet/enums/transcation.flow.enum';
import { TBalanceUserProductStatus } from '@/src/t-balance/enums/t-product.enums';

export class SearchAndFilterDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  status?:
    | TransactionStatus
    | RequestStatus
    | SN_BONUS_TYPE
    | DISTRIBUTION_STATUS_TYPE
    | OnChainWalletSettingStatus
    | string
    | TBalanceUserProductStatus;

  @IsOptional()
  @IsEnum(DateFilter)
  date?: DateFilter;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  machine?: string;

  @IsOptional()
  @IsString()
  product?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @Transform(transformToLowerCase)
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  /**
   * It will always symbol and string
   *  */
  @Transform(transformToLowerCase)
  @IsOptional()
  fromToken?: string;

  /**
   * It will always symbol and string
   *  */
  @Transform(transformToLowerCase)
  @IsOptional()
  toToken?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  treeLevel?: string;

  @IsOptional()
  @IsString()
  rewardLevel?: string;

  @IsOptional()
  @IsEnum(TransactionFlow)
  transactionFlow: TransactionFlow;
}

export class PaginateDTO extends SearchAndFilterDto {
  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;

  // @IsOptional()
  // @IsString()
  // status?: string;
}

export class ProductPaginateDTO extends PaginateDTO {
  @IsOptional()
  @IsValidSorting(['name', 'externalProductId', 'genRewardPercentage'])
  sort?: object;
}

export class CloudKFilterDTO extends SearchAndFilterDto {
  @IsOptional()
  @IsString()
  bid?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  product?: string;
}

export class SpecialSwapPaginateDTO extends PaginateDTO {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  countries: Types.ObjectId[];
}

export class WithdrawSettingsDTO extends PaginateDTO {
  @IsOptional()
  @IsEnum(YesOrNo)
  isEnable: YesOrNo;

  @IsOptional()
  @IsEnum(YesOrNo)
  isVisible: YesOrNo;

  @IsOptional()
  @IsObjectId()
  platforms: string;

  @IsOptional()
  @IsEnum(YesOrNo)
  isOnChainDeposit?: YesOrNo;
}

export class SpecialSwapSettingsDTO extends WithdrawSettingsDTO {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  countries: Types.ObjectId[];
}

export class usersFilterDTO extends PaginateDTO {
  @IsOptional()
  @IsValidSorting([
    'createdAt',
    'updateAt',
    'lastLogin',
    'dateJoined',
    'updatedAt',
    'firstName',
    'username',
    'email',
    'blockchainId',
    'lastName',
    'supernodeStatus',
    'userStatus',
  ])
  sort?: object;

  @IsOptional()
  userStatus: boolean;

  @IsOptional()
  isBaseReferralEnabled: boolean;

  @IsOptional()
  isBuilderGenerationEnabled: boolean;

  @IsOptional()
  isBuilderReferralEnabled: boolean;

  @IsOptional()
  @IsString()
  @IsDateString()
  lastLoginFromDate?: string;

  @IsOptional()
  @IsString()
  @IsDateString()
  lastLoginToDate?: string;
}
export class WalletFilterDTO extends PaginateDTO {
  @IsOptional()
  @IsValidSorting([
    'createdAt',
    'updatedAt',
    'amount',
    'user.email',
    'transactionStatus',
  ])
  sort?: object;
}

export enum AutoCompoundValues {
  YES = 'YES',
  NO = 'NO',
}
export class MachineFilterDTO extends PaginateDTO {
  @IsEnum(AutoCompoundValues)
  @IsOptional()
  autoCompound?: AutoCompoundValues;

  @IsEnum(CLOUDK_MACHINE_STATUS)
  @IsOptional()
  machineStatus?: CLOUDK_MACHINE_STATUS;
}

export class dataTableFilterDTO extends PaginateDTO {
  @IsOptional()
  @IsValidSorting()
  sort?: string;
}
export class DepositAndStakeSettingsFilterDTO extends PaginateDTO {
  @Transform(transformToLowerCase)
  @IsOptional()
  fromToken?: string;

  @Transform(transformToLowerCase)
  @IsOptional()
  toToken?: string;

  @IsOptional()
  platforms?: string;

  @IsOptional()
  @IsEnum(YesOrNo)
  isEnable?: YesOrNo;

  @IsOptional()
  @IsEnum(YesOrNo)
  isVisible?: YesOrNo;

  @IsOptional()
  @IsString()
  query?: string;
}

export class OnChainWalletSettingsDTO extends PaginateDTO {
  @IsOptional()
  @IsObjectId()
  token: string;

  @IsOptional()
  @IsObjectId()
  network: string;
}

// export class SupernodeTransactionDTO extends PaginateDTO {
//   @IsOptional()
//   @IsValidSorting(['createdAt', 'updatedAt'])
//   sort?: object;

//   @IsOptional()
//   @IsString()
//   isReceivable: string;

//   @IsOptional()
//   @IsString()
//   isClaimed: string;

//   @IsOptional()
//   @IsEnum(SN_BONUS_TYPE)
//   type: SN_BONUS_TYPE;

//   @IsOptional()
//   @IsString()
//   percentage: string;

//   @IsOptional()
//   @IsString()
//   level: string;
// }
export class WithdrawFilterDTO extends PaginateDTO {
  @IsOptional()
  @IsString()
  fromDate?: string;
  @IsOptional()
  @IsString()
  toDate?: string;
  @IsOptional()
  @IsString()
  token?: string;
  @IsOptional()
  @IsString()
  platform?: string;
  @IsOptional()
  @IsString()
  network?: string;
}

export class TokenFilterDTO extends PaginateDTO {
  @IsOptional()
  @IsString()
  fromDate?: string;
  @IsOptional()
  @IsString()
  toDate?: string;
  @IsOptional()
  @IsString()
  token?: string;
  @IsOptional()
  @IsString()
  platform?: string;
  @IsOptional()
  @IsString()
  network?: string;
}

export class SwapFilterDTO extends PaginateDTO {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  network?: string;

  @IsOptional()
  @IsString()
  fromToken?: string;

  @IsOptional()
  @IsString()
  toToken?: string;
}

export class SupernodeTransactionDTO extends PaginateDTO {
  @IsOptional()
  @IsValidSorting(['createdAt', 'updatedAt'])
  sort?: object;
  @IsOptional()
  @IsString()
  isReceivable: string;
  @IsOptional()
  @IsString()
  isClaimed: string;
  @IsOptional()
  @IsEnum(SN_BONUS_TYPE)
  type: SN_BONUS_TYPE;
  @IsOptional()
  @IsString()
  percentage: string;
  @IsOptional()
  @IsString()
  level: string;
}

export class SortDTO extends PaginateDTO {
  @IsOptional()
  sort?: object;
}

export class PromotionDTO extends PaginateDTO {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
