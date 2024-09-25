import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Request } from 'express';
import { Env } from 'src/env';

@Injectable()
export class WebhookSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const signature = request.headers['x-hub-signature-256'] as string;
    const secret = Env.SECRET.WEBHOOK;
    const payload = JSON.stringify(request.body);

    if (!signature) {
      throw new UnauthorizedException('Missing signature');
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = `sha256=${hmac.update(payload).digest('hex')}`;

    if (!crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature))) {
      throw new UnauthorizedException('Invalid signature');
    }

    return true;
  }
}
