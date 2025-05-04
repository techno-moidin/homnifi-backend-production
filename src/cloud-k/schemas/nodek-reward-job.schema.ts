import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NodekRewardFilePathDocument = NodekRewardFilePath & Document;

@Schema({ timestamps: true, versionKey: false })
export class NodekRewardFilePath {
  @Prop({ required: true })
  startTime: Date;

  @Prop()
  endTime: Date;

  @Prop({ required: true })
  path: string;

  @Prop()
  remainingTime: number;

  @Prop({ required: true })
  success: boolean;
}

export const NodekRewardFilePathSchema =
  SchemaFactory.createForClass(NodekRewardFilePath);
