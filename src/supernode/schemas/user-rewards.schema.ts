export class Supernode {}
import { User } from '@/src/users/schemas/user.schema';
import { TransactionFlow } from '@/src/wallet/enums/transcation.flow.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsDecimal } from 'class-validator';
import mongoose, { Decimal128, Document, Types } from 'mongoose';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { AmountType } from '@/src/global/enums/amount.type.enum';
@Schema({ timestamps: true, versionKey: false })
export class UserRewards extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: User;
  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  myProduction: number;
  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  teamProduction: number;
  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  firstLineProduction: number;
  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  totalBaseReferralReward: number;
  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  totalBaseReferralUsers: number;
  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  firstLineBaseReferralRewards: number;
  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  firstLineBaseReferralUsers: number;
  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  totalBuilderGenReward: number;
  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  totalBuilderGenUsers: number;
  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  firstLineBuilderGenRewards: number;
  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  firstLineBuilderGenUsers: number;
  @Prop({ default: null, type: Date })
  deletedAt: Date;
}
export const UserRewardsSchema = SchemaFactory.createForClass(UserRewards);
