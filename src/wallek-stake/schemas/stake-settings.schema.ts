import { Token } from '@/src/token/schemas/token.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class StakeSettings extends Document {
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name ,required: true })
    fromToken: mongoose.Types.ObjectId;
    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Token.name ,required: true })
    toToken: mongoose.Types.ObjectId;
    @Prop({ type: Date, default: null })
    deletedAt: Date;
    @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
    meta?: Record<string, any>;
}

export const StakeSettingsSchema = SchemaFactory.createForClass(StakeSettings);
