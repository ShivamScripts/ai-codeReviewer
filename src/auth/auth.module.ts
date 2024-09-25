import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { Env } from 'src/env';
import { JwtStrategy } from './jwt.strategy';
import { GithubModule } from 'src/github/github.module';

@Module({
  imports: [
    GithubModule,
    PassportModule,
    JwtModule.register({
      secret: Env.JWT.AUTH_TOKEN,
      signOptions: { expiresIn: Env.JWT.EXPIRES_IN },
    }),
    RedisModule.forRoot({
      config: { host: Env.REDIS.HOST, port: Env.REDIS.PORT },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
