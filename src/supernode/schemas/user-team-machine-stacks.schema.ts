import { User } from '@/src/users/schemas/user.schema';
import { TransactionFlow } from '@/src/wallet/enums/transcation.flow.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsDecimal } from 'class-validator';
import mongoose, { Decimal128, Document, Types } from 'mongoose';
import { setDecimalPlaces } from '@/src/utils/helpers';
import { AmountType } from '@/src/global/enums/amount.type.enum';

@Schema({ timestamps: true, versionKey: false })
export class UserTeamMachineStakes extends Document {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  user: User;

  @Prop({ type: String, required: false })
  bid: string;
  //MachineStack
  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  totalPersonalMachineStack: number;

  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  totalFirstLineMachineStack: number;

  @Prop({
    type: Number,
    set: (value) => setDecimalPlaces(value, AmountType.TOKEN),
    default: 0,
  })
  totalTeamMachineStack: number;

  @Prop({
    type: String,
  })
  note: String;

  @Prop({
    type: String,
  })
  remark: String;

  @Prop({ default: null, type: Date })
  createdAt: { type: Date; required: true; default: Date };

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const UserTeamMachineStakesSchema = SchemaFactory.createForClass(
  UserTeamMachineStakes,
);
