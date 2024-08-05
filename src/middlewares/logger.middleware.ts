import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger();
  private readonly jwt = new JwtService();

  use(req: Request, res: Response, next: NextFunction) {
    const token = req.headers?.authorization?.split(' ')[1] || '';
    const userDetail = this.jwt.decode(token) || {};

    this.logger.debug(
      `Request Method:[${req.method}] || Request URI:${
        req.baseUrl
      } || Request Body:[${JSON.stringify(
        req.body,
      )}] || Request Query Params:[${JSON.stringify(req.query)}] Request IP:[${
        req.ip
      }] || User Details: [${JSON.stringify(userDetail)}]`,
    );
    next();
  }
}
