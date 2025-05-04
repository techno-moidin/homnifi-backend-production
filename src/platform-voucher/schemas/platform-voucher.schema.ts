import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PlatformVoucherStatusEnum } from '../enum/PlatformVoucherStatus.enum';
import { PlatfromValidityEnum } from '../enum/PlatfromValidity.enum';
import { PlatformTypeEnum } from '../enum/PlatformType.enum';

export type PlatformVoucherDocument = PlatformVoucher & Document;

@Schema({ timestamps: true })
export class PlatformVoucher {
  @Prop({ type: String, required: false })
  userBID: string;

  @Prop({ type: String, required: false })
  orderId: string;

  @Prop({ type: String, required: false })
  ProductId: string;

  @Prop({ type: String, required: false })
  validity: string;

  @Prop({ type: String, required: false })
  type: string;

  @Prop({ type: String, required: true })
  vouchers: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: false })
  description?: string;

  @Prop({ type: String, required: false })
  code: string;

  @Prop({
    type: String,
    default: 'active',
  })
  status: string;

  @Prop({ default: null })
  deletedAt: Date;
}

export const PlatformVoucherSchema =
  SchemaFactory.createForClass(PlatformVoucher);
