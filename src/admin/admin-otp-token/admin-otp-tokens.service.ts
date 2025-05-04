import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  OTP_TOKEN_TYPES,
  AdminOtpTokens,
} from './schemas/admin-otp-tokens.schema';
import { Model, ObjectId } from 'mongoose';
import * as crypto from 'crypto';
import { Admin } from '../schemas/admin.schema';

@Injectable()
export class AdminOtpTokensService {
  constructor(
    @InjectModel(AdminOtpTokens.name)
    private adminotpTokensModel: Model<AdminOtpTokens>,
    @InjectModel(Admin.name) private userModel: Model<Admin>,
  ) {}

  generateCode(): string {
    const otp = crypto.randomInt(0, 1000000);
    return otp.toString().padStart(6, '0');
  }

  async createVerificationCode(
    admin: Admin,
    type: OTP_TOKEN_TYPES,
    tokencode?: string,
    expiresAt?: Date,
    token?: string,
  ): Promise<AdminOtpTokens> {
    const code = this.generateCode();
    const verificationCode = new this.adminotpTokensModel({
      admin: admin._id,
      code: tokencode || code,
      type,
      token,
      expiresAt: expiresAt || new Date(Date.now() + 25 * 60 * 1000),
    });
    return verificationCode.save();
  }

  async findVerificationCode(
    code: string,
    adminId: ObjectId,
    type: OTP_TOKEN_TYPES,
  ): Promise<AdminOtpTokens> {
    return this.adminotpTokensModel
      .findOne({
        code,
        admin: adminId,
        type,
        isUsed: false,
      })
      .sort({ createdAt: -1 });
  }

  async markCodeAsUsed(id: string): Promise<AdminOtpTokens | null> {
    return this.adminotpTokensModel.findByIdAndUpdate(
      id,
      { isUsed: true },
      { new: true },
    );
  }

  async checkIfCodeIsValid(
    code: string,
    adminId: ObjectId,
    type: OTP_TOKEN_TYPES,
  ): Promise<AdminOtpTokens> {
    const verificationCode = await this.findVerificationCode(
      code,
      adminId,
      type,
    );
    if (!verificationCode) {
      throw new NotFoundException('Verification code not found');
    }
    if (verificationCode.isUsed) {
      throw new BadRequestException('Verification code is already used');
    }
    if (verificationCode.expiresAt < new Date()) {
      throw new BadRequestException('Verification code is expired');
    }
    return verificationCode;
  }
}
