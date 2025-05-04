import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Observable } from 'rxjs';
import { AdminLog } from '../../log/schema/admin.log.schema';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    @InjectModel(AdminLog.name)
    private adminLogModel: Model<AdminLog>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    await this.adminLogModel.create({
      module: 'ADMIN_AUTH',
      payload: request.body,
      method: request.method,
      endPoint: request.originalUrl || null,
      admin: null,
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
    return true;
  }
}
