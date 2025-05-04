import { MailerService } from '@nestjs-modules/mailer';
import { Model, Types } from 'mongoose';
import { Admin } from '../admin/schemas/admin.schema';
import * as bcrypt from 'bcryptjs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { EmailService } from '../email/email.service';
import { AdminOtpTokensService } from '../admin/admin-otp-token/admin-otp-tokens.service';
import { OTP_TOKEN_TYPES } from '../otp-tokens/schemas/otp-tokens.schema';
import { JwtService } from '@nestjs/jwt';
import { ADMIN_ACCOUNT_STATUS } from '../admin/auth/enums/admin.account.status.enum';
import { AdminAuthService } from '../admin/auth/admin.auth.service';

// eslint-disable-next-line @typescript-eslint/no-unused-vars

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const adminModel = appContext.get<Model<Admin>>(Admin.name + 'Model');
  const emailService = appContext.get(EmailService);
  const adminOtpTokensService = appContext.get(AdminOtpTokensService);
  const jwtService = appContext.get(JwtService);
  const adminAuthService = appContext.get(AdminAuthService);

  const salt = await bcrypt.genSalt(10);
  const vPassword = 'softbuiler@2025';
  const hashedPassword = await bcrypt.hash(vPassword, salt);

  const payLoadUser = {
    username: 'alessio12',
    email: 'insideout2004@proton.me',
    type: 'admin',
    firstName: 'Alessio',
    lastName: '',
    password: hashedPassword,
    status: ADMIN_ACCOUNT_STATUS.ACTIVE,
    isSuperAdmin: true,
    role: new Types.ObjectId('66ad239373c11302a2965c01'),
  };

  const createdAdmin = await adminModel.create(payLoadUser);

  ;

  const token = await adminAuthService.createToken(createdAdmin);

  ;

  const result = await adminOtpTokensService.createVerificationCode(
    createdAdmin,
    OTP_TOKEN_TYPES.RESET_PASSWORD,
    token,
    new Date(Date.now() + 5 * 60 * 1000),
  );

  ;

  const link = `${process.env.ADMIN_FRONTEND_URL}/auth/reset-password?token=${token}`;

  ;

  await emailService.superAdminEmail(createdAdmin, link);

  ;
  process.exit(1);
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
