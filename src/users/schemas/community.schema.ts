import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';


@Schema({ timestamps: true, versionKey: false })
export class Community extends Document {
  
}

export const CommunitySchema = SchemaFactory.createForClass(Community);
