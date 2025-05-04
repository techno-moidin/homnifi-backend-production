import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Token } from './token.schema';
import { Admin } from '@/src/admin/schemas/admin.schema';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class TokenATHPrice extends Document {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Token.name,
    required: true,
    immutable: true,
  })
  token: Token;

  @Prop({
    type: Number,
    required: true,
  })
  dayAth: number;
}

export const TokenATHPriceSchema = SchemaFactory.createForClass(TokenATHPrice);
