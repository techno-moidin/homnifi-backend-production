import { User } from '@/src/users/schemas/user.schema';
import { Token } from '../../token/schemas/token.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { IsOptional } from 'class-validator';

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
export class Wallet extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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

  @Prop({ type: Number, default: 0 }) // Using @Prop() for totalBalanceinToken
  totalBalanceinToken: number;

  @Prop({ type: Number, default: 0 }) // Using @Prop() for totalBalanceinDollar
  totalBalanceinDollar: number;

  @IsOptional()
  @Prop({ type: String, default: '' }) // Using @Prop() for totalBalanceinDollar
  note?: string;

  @Prop({ default: null })
  deletedAt?: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);
