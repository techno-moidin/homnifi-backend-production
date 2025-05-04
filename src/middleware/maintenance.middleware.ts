import { Injectable, NestMiddleware, HttpException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MaintenanceService } from '../maintenance/maintenance.service';
import * as jwt from 'jsonwebtoken';
import { IMPERSONATE } from '../utils/constants';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly maintenanceService: MaintenanceService) {}
  async use(req: Request, res: Response, next: NextFunction) {
    const authorizationHeader = req.headers['authorization'];
    let decodedToken: any = null;

    if (authorizationHeader) {
      const parts = authorizationHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        try {
          const secretKey = process.env.JWT_SECRET;
          decodedToken = jwt.verify(token, secretKey);
        } catch (error) {
          decodedToken = null;
        }
      }
    }
    const maintenance = await this.maintenanceService.getMaintenance();
    const exemptedRoutes = ['/maintenance'];

    const adminPath = req.path.startsWith('/admin');
    const impersonatePath = req.path.startsWith('/impersonate');
    const webhooksPath = req.path.startsWith('/webhooks');

    if (maintenance && (adminPath || webhooksPath)) {
      next();
      return;
    }
    if (impersonatePath || decodedToken?.mode === IMPERSONATE) {
      next();
      return;
    }
    if (maintenance && !exemptedRoutes.includes(req.path)) {
      throw new HttpException(maintenance, 503);
    } else {
      next();
    }
  }
}
