import { Request } from '@nestjs/common';
import { Admin } from '../admin/schemas/admin.schema';
import { User as UserSchema } from '../users/schemas/user.schema';

interface User extends UserSchema {
  userId: string;
}

// export type AppRequest = ExpressRequest &
//   Request & {
//     admin?: Admin;
//     user?: User;
//     [key: string]: any;
//   };

export interface AppRequest extends Request {
  admin?: Admin;
  user?: User;
  [key: string]: any;
}
