import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExecutionContext,
  Inject,
  Injectable,
  InternalServerErrorException,
  MethodNotAllowedException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService, ConfigType } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../../users/schemas/user.schema';
import { Model, Schema, Types } from 'mongoose';
import { Device } from '@/src/device/schemas/device.schema';
import { IMPERSONATE } from '@/src/utils/constants';
import { AdminI } from '@/src/admin/auth/admin.interface';
import { Admin } from '@/src/admin/schemas/admin.schema';
import { ImpersonateLog } from '@/src/impersonate/schemas/impersonate-log.schema';
import { ImpersonateHistroty } from '@/src/admin/schemas/impersonate-histroty.schema';

export type JwtPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
  constructor(
    @InjectModel(Device.name) private deviceModel: Model<Device>,
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(ConfigService) private config: ConfigService,
    @InjectModel(Admin.name) private adminModel: Model<AdminI>,
    @InjectModel(ImpersonateLog.name)
    private impersonateLogModel: Model<ImpersonateLog>,
    @InjectModel(ImpersonateHistroty.name)
    private impersonateHistrotyModel: Model<ImpersonateHistroty>,
  ) {
    super({
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    payload: {
      userId: string;
      email: string;
      deviceId: string;
      mode?: any;
      admin?: Types.ObjectId;
    },
    context: ExecutionContext,
  ) {
    const user = await this.userModel.findById(payload.userId);

    // console.log(
    //   '=========VALIDATE USER ============',
    //   payload,
    //   'BID : ',
    //   user.blockchainId,
    // );

    if (payload.mode !== IMPERSONATE) {
      const device = await this.deviceModel.findOne({
        deviceId: payload.deviceId,
        user: payload.userId,
        isLoggedIn: true,
      });
      // console.log(
      //   '========= IMPERSONATE DEVICE ============',
      //   payload.deviceId,
      // );

      if (!user) {
        // console.log(
        //   '========= UnauthorizedException ============',
        //   user,
        //   payload,
        // );

        throw new UnauthorizedException('Please log in to continue..');
      }
    }

    const requestUrl = request.url || '';
    const isSignout = requestUrl.endsWith('/signout');
    if (payload.mode === IMPERSONATE) {
      const adminUser = await this.adminModel
        .findById(payload.admin)
        .populate(['role']);
      const isSuperAdmin = adminUser?.isSuperAdmin ?? false;
      if (!isSuperAdmin && !isSignout && request.method !== 'GET') {
        throw new MethodNotAllowedException(
          'Impersonation mode not allowed for this request',
        );
      }
      try {
        const moduleName = requestUrl.split('/')[1] || 'Unknown';
        const capitalizedModuleName =
          moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
        const { reason } = await this.impersonateHistrotyModel
          .findOne({ user: user._id })
          .sort({ createdAt: -1 });

        await this.impersonateLogModel.create({
          user: user._id,
          admin: payload.admin,
          path: requestUrl,
          module: capitalizedModuleName,
          method: request.method,
          payload: request.body,
          reason: reason,
        });
      } catch (error) {
        throw new InternalServerErrorException(
          'An error occurred while logging impersonation action.',
        );
      }
    }
    return {
      userId: payload.userId,
      email: payload.email,
      deviceId: payload.deviceId,
      ...(payload.mode && { mode: payload.mode }),
    };
  }
}
