import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AdminService } from '../admin/admin.service'; // Import AdminService

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly adminService: AdminService) {} // Inject AdminService

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Token is not provided');
      return next(); // Allow access but without authentication
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.decode(token) as {
        userId: string;
        exp: number;
      } | null;

      if (!decoded || !decoded.userId) {
        console.log('Invalid token');
        return next();
      }

      if (decoded.exp * 1000 < Date.now()) {
        console.log('Token is expired');
        return next();
      }

      // Check if user is blocked
      const isBlocked = await this.adminService.isUserBlocked(decoded.userId);
      if (isBlocked) {
        console.log(`User ${decoded.userId} is blocked`);
        throw new UnauthorizedException('Your account is blocked.');
      }

      req.user = { userId: decoded.userId } as any; // Extend user object as needed
      console.log('User is authenticated', req.user);
    } catch (error) {
      console.log('Error decoding token', error);
      throw new UnauthorizedException('Invalid token.');
    }

    next();
  }
}
