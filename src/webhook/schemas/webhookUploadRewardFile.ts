import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';


@Schema({ timestamps: true, versionKey: false })
export class WebhookUploadRewardFile extends Document {
    @Prop({ required: true })
    startTime: Date;

    @Prop({ required: true })
    path: string;

    @Prop()
    fileName: string;

    @Prop()
    kmallUrl: string;

    @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
    kmalluploadRewardFileResponse: any;

}

export const WebhookUploadRewardFileSchema =
    SchemaFactory.createForClass(WebhookUploadRewardFile);