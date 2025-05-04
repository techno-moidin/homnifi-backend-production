import { INestApplicationContext } from '@nestjs/common';
import { Model } from 'mongoose';
import { Admin } from '../admin/schemas/admin.schema';
import * as bcrypt from 'bcryptjs';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface UserSample {
  username: string;
  email: string;
  type: string; // 'SUPER_ADMIN'
  firstName: string;
  lastName: string;
  password: string;
  status: string;
  accountState: string;
  isSuperAdmin: boolean;
}

export const runUserScript = async (appContext: INestApplicationContext) => {
  const adminModel = appContext.get<Model<Admin>>(Admin.name + 'Model');
  const salt = await bcrypt.genSalt(10);
  const vPassword = 'Qweerrt11232@';
  const hashedPassword = await bcrypt.hash(vPassword, salt);

  const payLoadUser = {
    username: 'superadmin',
    email: 'myzeest+super-admin@gmail.com',
    type: 'admin',
    firstName: 'super',
    lastName: 'admin',
    password: hashedPassword,
    status: 'true',
    accountState: 'active',
    isSuperAdmin: 'true',
  };

  await adminModel.create(payLoadUser);
  return;
};
