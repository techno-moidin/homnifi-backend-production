import { CloudKMachine } from '@/src/cloud-k/schemas/cloudk-machine.schema';
import { CloudKProduct } from '@/src/cloud-k/schemas/cloudk-products.schema';
import { User } from '../../users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
export enum MAHCINE_TRACK_API_STATUS {
  IN_HOUSE = 'in-house',
  IN_PROCESS = 'in-process',
  READY_FOR_SHIPPING = 'ready-for-shipping',
  IN_TRANSIT = 'in-transit',
  READY_FOR_PICKUP = 'ready-for-pickup',
  PICKED_UP = 'picked-up',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  ORDER_REFUNDED = 'order-refunded',
  SHIPPING_REFUNDED = 'shipping-refunded',
}

export enum MAHCINE_CONNECTION_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'in-active',
}
@Schema({
  timestamps: true,
})
export class MachineTrack extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'users', index: true })
  user: mongoose.Types.ObjectId;

  @Prop({ required: false, index: true })
  orderId: string;

  @Prop({ required: false })
  shipmentItemIdentifier: string;

  @Prop({ required: true, enum: MAHCINE_TRACK_API_STATUS, index: true })
  shipmentStatus: string;

  @Prop({ required: false, default: null })
  assignedSerialNumber: string;

  @Prop({ required: true, index: true })
  userBID: string;

  @Prop({ type: String, index: true })
  productId: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  meta: object;

  @Prop({
    type: mongoose.SchemaTypes.ObjectId,
    required: false,
    ref: 'cloudkmachines',
  })
  cloudkMachine: mongoose.Types.ObjectId;

  @Prop({ type: Date, default: null, index: true })
  deletedAt: Date;

  @Prop({ type: String, default: null })
  remark: string;
}

export const MachineTrackSchema = SchemaFactory.createForClass(MachineTrack);
