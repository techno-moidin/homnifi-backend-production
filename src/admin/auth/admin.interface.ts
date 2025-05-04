import { Types } from 'mongoose';
import { Role } from '../schemas/role.schema';

export interface AdminI extends Document {
  readonly _id: Types.ObjectId;
  readonly username: string;
  readonly type: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
  readonly accountState: string;
  readonly status: string;
  readonly isSuperAdmin: boolean;
  readonly isSubSuperAdmin: boolean;
  readonly addedBy: Types.ObjectId;
  readonly updatedBy: Types.ObjectId;
  readonly deletedBy: Types.ObjectId;
  readonly role: Role;
}
