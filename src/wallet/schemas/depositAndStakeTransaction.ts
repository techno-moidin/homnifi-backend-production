import { User } from '@/src/users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { DepositAndStakeTransactionStatusEnum } from '../../token/enums/depositAndStakeTransactionStatus-Enum';
import { Network } from '../../token/schemas/network.schema';
import { Token } from '../../token/schemas/token.schema';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { AmountType } from '@/src/global/enums/amount.type.enum';
import { DepositAndStakeSettings } from '@/src/token/schemas/depositAndStackSettings.schema';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class DepositAndStakeTransaction extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Network.name })
  network: Types.ObjectId;

  /**
   * A random string representing a transaction unique identifier. We are using  walletService.generateUniqueRequestId function to generate it.
   *
   */
  @Prop({ type: String, required: true })
  requestId: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  token: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name })
  toToken: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user: Types.ObjectId;

  @Prop({ type: String })
  depositAddress: string;

  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  totalAmount: number;

  @Prop({
    type: String,
    enum: DepositAndStakeTransactionStatusEnum,
    default: DepositAndStakeTransactionStatusEnum.PENDING,
  })
  status: DepositAndStakeTransactionStatusEnum;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: DepositAndStakeSettings.name,
  })
  depositAndStakeSettings: Types.ObjectId;

  @Prop({
    type: Object,
    default: null,
    required: false,
  })
  meta: object;

  @Prop({
    type: String,
  })
  remarks: string;

  @Prop({ type: Date, default: null })
  expiredAt: Date;

  @Prop({ type: Date, default: null })
  deletedAt: Date;
}

export const DepositAndStakeTransactionSchema = SchemaFactory.createForClass(
  DepositAndStakeTransaction,
);
