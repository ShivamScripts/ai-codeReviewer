import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiMessages } from 'src/common/constants';
import { Env } from 'src/env';
import axios from 'axios';
import { GithubService } from 'src/github/github.service';
import { TRequest } from 'src/common/types/user.types';
import { RedisService } from '@liaoliaots/nestjs-redis';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly githubService: GithubService,
    private readonly redisService: RedisService,
  ) {}

  async handleGitHubCallback(code: string) {
    const clientId = Env.GITHUB.CLIENT_ID;
    const clientSecret = Env.GITHUB.CLIENT_SECRET;

    try {
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
        },
        {
          headers: {
            accept: 'application/json',
          },
        },
      );

      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
        throw new HttpException(ApiMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const userDetails = await this.githubService.getUserDetails(accessToken);
      await this.githubService.saveUserDetails(userDetails, accessToken);
      const jwtToken = this.jwtService.sign(
        {
          userId: userDetails.id,
          email: userDetails.email,
        },
        {
          secret: Env.JWT.AUTH_TOKEN,
          expiresIn: Env.JWT.EXPIRES_IN,
        },
      );
      const client = this.redisService.getClient();
      await client.set(
        `jwt:${userDetails.id}`,
        jwtToken,
        'EX',
        Env.REDIS.EXPIRY,
      );
      await this.githubService.saveToken(userDetails.id, jwtToken);
      return jwtToken;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  async logout(req: TRequest) {
    const userId = req.user['userId'];
    const client = this.redisService.getClient();
    await client.del(`jwt:${userId}`);
  }
}
