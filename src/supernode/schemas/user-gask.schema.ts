export class Supernode {}
import { CloudKMachineStake } from '@/src/cloud-k/schemas/cloudk-machine-stakes.schema';
import { CloudKMachine } from '@/src/cloud-k/schemas/cloudk-machine.schema';
import { CloudKDailyJob } from '@/src/cloud-k/schemas/cloudk-reward-job.schema';
import { CloudKReward } from '@/src/cloud-k/schemas/cloudk-reward.schema';
import { User } from '@/src/users/schemas/user.schema';
import { TransactionFlow } from '@/src/wallet/enums/transcation.flow.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, mongo, Types } from 'mongoose';

export enum UserGaskFrom {
  CLOUDK_REWARD = 'cloudk-reward',
  //Additional Minting Power
  ADDITIONAL_MINTING_POWER_REWARD = 'additional-minting-power-reward',
  //Active Gen Power
  ACTIVE_GEN_REWARD = 'active-gen-reward',
}
@Schema({ timestamps: true, versionKey: false })
export class UserGask extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: CloudKMachine.name, required: false })
  machine: CloudKMachine;

  @Prop({
    type: Types.ObjectId,
    ref: CloudKMachine.name,
    required: false,
    default: null,
  })
  fromMachine: CloudKMachine;

  @Prop({ required: true })
  amount: number; // dollar value

  @Prop({ required: true })
  flow: TransactionFlow;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: CloudKMachineStake.name })
  stake: CloudKMachineStake;

  @Prop({ type: Number })
  multiplier: number;

  @Prop({ type: String })
  from: string;

  @Prop({ type: String })
  remarks?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: CloudKDailyJob.name })
  job: CloudKDailyJob;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKReward.name,
  })
  reward: CloudKReward;

  @Prop({
    type: String,
    default: null,
  })
  note: string;
}

export const UserGaskSchema = SchemaFactory.createForClass(UserGask);
