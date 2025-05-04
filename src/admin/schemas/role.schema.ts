import { PERMISSION } from '@/src/enums/permission';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
  },
  toObject: {
    virtuals: true,
  },
})
export class Role extends Document {
  @Prop()
  name: string;

  @Prop({
    default: null,
  })
  permissions: PERMISSION[];

  @Prop({ default: null })
  deletedAt: Date;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

RoleSchema.pre<RoleDocument>('save', async function (next) {
  next();
});
