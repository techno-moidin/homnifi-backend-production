import { User } from '@/src/users/schemas/user.schema';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Token } from '@/src/token/schemas/token.schema';
import { BONUS_TYPES } from '../enums/bonus-types.enum';
import { CloudKProduct } from '@/src/cloud-k/schemas/cloudk-products.schema';
import { AmountType } from '@/src/global/enums/amount.type.enum';

@Schema({ timestamps: true, versionKey: false })
export class MyFriendsBonusTransaction extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: User;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: User.name,
  })
  fromUser: User;

  @Prop({
    enum: BONUS_TYPES,
    required: true,
  })
  bonusType: BONUS_TYPES;

  @Prop({
    type: Number,
    required: true,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
  })
  tokenAmount: number;

  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.DOLLAR),
  })
  totalTokenPrice: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: false,
  })
  token: Token;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: CloudKProduct.name,
  })
  product: CloudKProduct;
}

export const MyFriendsBonusTransactionSchema = SchemaFactory.createForClass(
  MyFriendsBonusTransaction,
);
