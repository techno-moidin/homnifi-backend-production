import { AdminModuleType } from './../../global/enums/admin.log-module-type.enum';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JWT_SECRET_ADMIN } from '@/src/utils/constants';
import { AdminService } from '../../admin.service';
import { ConfigService } from '@nestjs/config';
import { ADMIN_ACCOUNT_STATUS } from '../enums/admin.account.status.enum';
import { AdminJWTPayload } from '@/src/interface/admin-jwt-playload';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION,
  PERMISSION_MODULE,
  permissionList,
} from '@/src/enums/permission';
import { checkExistence } from '@/src/utils/helpers';
import { InjectModel } from '@nestjs/mongoose';
import { AdminLog } from '../../log/schema/admin.log.schema';
import { Model } from 'mongoose';
import { AdminLogModel } from './../../log/schema/admin.log.schema';
import { CACHE_TYPE } from '@/src/cache/Enums/cache.enum';
import { CacheService } from '@/src/cache/cache.service';
import * as bcrypt from 'bcrypt';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectModel(AdminLog.name)
    private adminLogModel: Model<AdminLog>,

    private jwtService: JwtService,
    private adminService: AdminService,
    private readonly configService: ConfigService,
    private reflector: Reflector,
    private cacheService: CacheService,
  ) { }

  private module = null;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: any = context.switchToHttp().getRequest();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    } else {
      try {
        const payload: AdminJWTPayload = await this.jwtService.verifyAsync(
          token,
          {
            secret: this.configService.get<string>(JWT_SECRET_ADMIN),
          },
        );

        const admin: any = await this.adminService.findById(payload.id);
        if (!admin) {
          throw new UnauthorizedException('Admin not found');
        }

        // Check token is exist in the Cache memory to login
        const adminCacheData = await this.cacheService.getCacheUser({
          type: CACHE_TYPE.ADMIN_USER,
          user: String(admin._id),
        });

        if (adminCacheData) {
          let isTokenExist: boolean = false;
          for (let index = 0; index < adminCacheData.length; index++) {
            const element = adminCacheData[index];
            if (await this.compareJWTTokens(element, token)) {
              isTokenExist = true;
              break;
            }
          }
          if (!isTokenExist) {
            throw new UnauthorizedException('Invalid token');
          }
        } else {
          // console.log(
          //   '=========================== ADMIN SESSION DETAILS =====================================',
          // );
          // console.log('JWT Payload :', payload.id);
          // console.log('JWT Payload Username:', payload.username);
          // console.log('CACHE_TYPE.ADMIN_USER :', CACHE_TYPE.ADMIN_USER);
          // console.log('admin :', admin._id, admin.email);
          // console.log('adminCacheData :', adminCacheData);
          // console.log(
          //   '================================================================',
          // );
          throw new UnauthorizedException('Session expired');
        }
        // Cache checking completed successfully

        if (
          admin.status === ADMIN_ACCOUNT_STATUS.BLOCKED ||
          admin.status === ADMIN_ACCOUNT_STATUS.INACTIVE
        ) {
          throw new ForbiddenException('Admin blocked');
        }

        const tokenPasswordChangedAt = payload?.passwordChangedAt;
        const userPasswordChangedAt = admin.passwordChangedAt;

        if (
          tokenPasswordChangedAt &&
          userPasswordChangedAt &&
          new Date(tokenPasswordChangedAt) < userPasswordChangedAt
        ) {
          throw new UnauthorizedException(
            'Permission denied. Password has been changed.',
          );
        }

        const checkPermission = this.reflector.get<PERMISSION[]>(
          'permission-check',
          context.getHandler(),
        );

        if (checkPermission) {
          const assignPermission = admin.role.permissions;
          const accessable_api_modules = this.reflector.get<PERMISSION[]>(
            'permissions',
            context.getHandler(),
          );
          this.module = accessable_api_modules[0].module;
          const hasPermission = checkExistence(
            assignPermission,
            accessable_api_modules,
          );

          if (!hasPermission) {
            // throw new ForbiddenException('Permission denied');
            throw new ForbiddenException('Access Denied');
          }
        }
        request.admin = admin;
        request.id = String(admin._id);
        if (
          request.method !== 'GET' &&
          !request.originalUrl.includes('login')
        ) {
          await this.adminLogModel.create({
            module: this.module,
            payload: request.body,
            method: request.method,
            endPoint: request.originalUrl || null,
            admin: admin._id,
            email: admin.email ?? null,
            username: admin.username ?? null,
            deviceData: {
              device_name: request.headers.device_name || null,
              OS: request.headers.device_os || null,
            },
            ipAddress: request.headers.ip_address || request.ipAddress || null,
            macAddress: request.headers.mac_address || null,
            location: request?.headers?.location
              ? JSON.parse(request.headers.location)
              : null,
            note: null,
          });
        }
      } catch (e) {
        console.log('--------------------', e);
        if (e instanceof UnauthorizedException) {
          throw e;
        }
        throw new ForbiddenException("Access Denied");
      }
      return true;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
  private async compareJWTTokens(token1, token2): Promise<boolean> {
    // const isMatch = await bcrypt.compare(token1, token2);
    const isMatch = JSON.stringify(token1) == JSON.stringify(token2);
    return isMatch;
  }
}
