import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { CloudKMachine } from './cloudk-machine.schema';
import { WalletTransaction } from '@/src/wallet/schemas/wallet.transaction.schema.';
import { CloudKMachineStake } from './cloudk-machine-stakes.schema';

@Schema({ timestamps: true, versionKey: false })
export class CloudKMachineStakeTransaction extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKMachine.name,
    required: true,
  })
  machine: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKMachineStake.name,
    required: true,
  })
  stake: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: WalletTransaction.name,
  })
  walletTransaction: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: String,
  })
  note: string;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const CloudKMachineStakeTransactionSchema = SchemaFactory.createForClass(
  CloudKMachineStakeTransaction,
);
