import { User } from '../../users/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class BurnParticipants {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
  })
  user: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  joiningDate: Date;

  @Prop({ default: null, type: Date })
  deletedAt: Date;
}

export const BurnParticipantsSchema =
  SchemaFactory.createForClass(BurnParticipants);
