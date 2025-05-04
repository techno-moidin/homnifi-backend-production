import { Network } from '@/src/token/schemas/network.schema';
import { Token } from '../../token/schemas/token.schema';
import { User } from '../../users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Wallet } from './wallet.schema';
import { OnChainWalletStatus } from '../enums/on-chain-status.';

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    versionKey: false,
    transform: function (doc, ret, option) {
      delete ret._id;
      delete ret.createdAt;
      delete ret.updatedAt;
    },
  },
})
export class OnChainWallet extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
    immutable: true,
  })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  token: mongoose.Schema.Types.ObjectId;

  @Prop({
    required: true,
    immutable: true,
  })
  address: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Network.name,
    required: true,
  })
  network: string;

  @Prop({
    type: String,
    enum: Object.values(OnChainWalletStatus),
    default: OnChainWalletStatus.ACTIVE,
  })
  status: OnChainWalletStatus;
}

export const OnChainWalletSchema = SchemaFactory.createForClass(OnChainWallet);
