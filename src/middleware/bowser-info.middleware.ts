import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as UAParser from 'ua-parser-js';

@Injectable()
export class BrowserInfoMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const parser = new UAParser.UAParser();
    const userAgent = req.headers['user-agent'];
    if (userAgent) {
      const parsedUserAgent = parser.setUA(userAgent).getResult();
      req['userAgent'] = parsedUserAgent;
      req['browserName'] = parsedUserAgent.browser.name;
      req['deviceName'] =
        parsedUserAgent?.os?.name + ' ' + parsedUserAgent?.os?.version;
      req['deviceType'] = parsedUserAgent.device.type ?? 'desktop';
      const xForwardedFor = req.headers['x-forwarded-for'];
      let ip = xForwardedFor || req.connection.remoteAddress;
      if (Array.isArray(ip)) {
        ip = ip[0];
      } else if (ip.includes(',')) {
        ip = ip.split(',')[0];
      }
      if (ip === '::1') {
        ip = '127.0.0.1';
      }
      req['ipAddress'] = ip;
    }
    next();
  }
}
