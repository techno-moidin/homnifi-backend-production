import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { AdminDatabaseDumpCode } from '../global/enums/admin.database-dump.enum';

@Schema({ timestamps: true, versionKey: false })
export class DatabaseDump extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: AdminDatabaseDumpCode.SUCCESS })
  status: AdminDatabaseDumpCode;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ default: null })
  deletedAt?: Date;
}
export const DatabaseDumpSchema = SchemaFactory.createForClass(DatabaseDump);
