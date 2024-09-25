import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Env } from 'src/env';

@Injectable()
export class FeedbackSecretGuard implements CanActivate {
  constructor() {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = Env.SECRET.FEEDBACK;
    const requestSecret = request.headers['x-feedback-secret'];

    if (requestSecret && requestSecret === secret) {
      return true;
    } else {
      throw new UnauthorizedException('Invalid feedback secret');
    }
  }
}
