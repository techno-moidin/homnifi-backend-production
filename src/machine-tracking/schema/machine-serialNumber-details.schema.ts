import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class MachineSerialNumberDetails extends MongooseDocument {
  @Prop({ type: String, required: true })
  sn: string;

  @Prop({ type: Boolean, default: false })
  linked: boolean;

  @Prop({ default: null, type: Date })
  deletedAt?: Date;
}

export const MachineSerialNumberDetailsSchema = SchemaFactory.createForClass(
  MachineSerialNumberDetails,
);

MachineSerialNumberDetailsSchema.index({ status: 1 });
MachineSerialNumberDetailsSchema.index({ deletedAt: 1 });
