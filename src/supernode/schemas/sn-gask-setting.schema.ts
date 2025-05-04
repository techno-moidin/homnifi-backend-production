export class Supernode {}
import { User } from '@/src/users/schemas/user.schema';
import { TransactionFlow } from '@/src/wallet/enums/transcation.flow.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { STATUS_CODES } from 'http';
import { Document, Types } from 'mongoose';
import { STATUS_TYPE } from '../enums/sngp-type.enum';

@Schema({ timestamps: true, versionKey: false })
export class SuperNodeGaskSetting extends Document {
  @Prop({ required: true })
  multiplier: number;

  @Prop({ enum: STATUS_TYPE, default: STATUS_TYPE.ACTIVE })
  status: string ;
  @Prop({ type: Date, default: null })
  deletedAt: Date;

}


export const SuperNodeGaskSettingSchema =
  SchemaFactory.createForClass(SuperNodeGaskSetting);
