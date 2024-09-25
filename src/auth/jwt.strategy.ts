import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Env } from 'src/env/index';
import { JwtPayload } from './jwt-interface';
import { RedisService } from '@liaoliaots/nestjs-redis';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly redisService: RedisService,
  ) {
    super({
      secretOrKey: Env.JWT.AUTH_TOKEN,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload) {
    const { userId } = payload;
    const client = this.redisService.getClient();
    const jwtToken = await client.get(`jwt:${userId}`);
    if (!jwtToken) {
      throw new UnauthorizedException();
    }
    return payload;
  }
}
