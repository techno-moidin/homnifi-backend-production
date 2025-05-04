import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request, Response, NextFunction } from 'express';
import { AdminLog } from '../admin/log/schema/admin.log.schema';
import { Model } from 'mongoose';

@Injectable()
export class AdminHostMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(AdminLog.name)
    private readonly adminLogModel: Model<AdminLog>,
  ) {}
  use(req: Request, res: Response, next: NextFunction) {
    // if (process.env.NODE_ENV !== 'qa-server') {
    //   if (req.headers.origin !== process.env.ADMIN_FRONTEND_URL) {
    //     throw new ForbiddenException('Origin not allowed');
    //   }
    // }
    next();
  }
}
