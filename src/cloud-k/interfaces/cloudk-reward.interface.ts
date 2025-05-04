import { ObjectId, Types } from 'mongoose';
import { CloudKDailyJob } from '../schemas/cloudk-reward-job.schema';
import { CloudKMachine } from '../schemas/cloudk-machine.schema';
import { AdditionalMintingPromotionStatus } from '@/src/admin/schemas/additional-minting-promotion.schema';

export interface CloudKadditionalMintingPowerDataInterface {
  additionalMintingPowerStatus: AdditionalMintingPromotionStatus;
  additionalMintingPowerId: string | null;
  additionalMintingCountryLevelId: string | null;
  additionalMintingPowerPercentage: number;
  countryCodeAlpha3: string | null;
}
export interface CloudKRewardExcessDistributionInterface {
  IsAnyUpdatedId: ObjectId | Types.ObjectId;
  fromMachine: Types.ObjectId;
  fromMachineUniqueName: string;
  fromMachineName: string;
  collatoral: number;
  todaysJob: CloudKDailyJob;
  tokenAmount: number;
  rewardTokenPrice: number;
  UpdatedAdditionalrewardTokens: number;
  token: Types.ObjectId;
  stakeToken: Types.ObjectId;
  currentReward_id: Types.ObjectId;
  user: Types.ObjectId;
  lifetimeReward: number;
  claimableRewards: number;
  currentPrice: number;
  multiplier: number;
  // Active Gen Reward
  genActiveRewardTokens: number;
  isGenActiveReward: boolean;
  actveGenRewardId: Types.ObjectId | null;
  genRewardPercentage: number;
  // Additional Minting Power
  isAdditionalMintingPower: boolean;
  additionalMintingRewardId: Types.ObjectId | null;
  additionalMintingPowerPercentage: number;
}

export interface CloudKRewardGenerationInterface {
  machine: CloudKMachine;
  currentPrice: number;
  todaysJob: CloudKDailyJob;
  rewardDate?: Date;
  additionalMintingPower: CloudKadditionalMintingPowerDataInterface;
  genRewardData: {
    isGenActiveReward: boolean;
    genRewardPercentage: number | null;
    actveGenRewardPercentageId: string | null;
  };
  multiplier?: number;
}

export enum CloudKRewardGenerationType {
  REWARD = 'cloudk-reward',
  ADDITIONAL_MINTING_REWARD = 'additional-minting-cloudk-reward',
  ACTIVE_GEN_REWARD = 'active-gen-reward',
}
export interface CountryItemAdditionalMinting {
  countryId?: Types.ObjectId | string | null;
  name?: string | null;
  countryCodeAlpha3?: string | null;
  percentage?: number | null;
}
