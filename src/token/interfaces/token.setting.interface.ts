import { Admin } from '@/src/admin/schemas/admin.schema';
import { Types } from 'mongoose';
import { Token } from '../schemas/token.schema';

export interface TokenSettingI {
  readonly _id: Types.ObjectId;
  readonly token: Token;
  readonly withdrawEnabled: boolean;
  readonly depositEnabled: boolean;
  readonly fromSwapEnabled: boolean;
  readonly toSwapEnabled: boolean;
  readonly updatedBy: Admin;
}
