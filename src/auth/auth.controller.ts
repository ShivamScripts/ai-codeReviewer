import {
  Controller,
  HttpStatus,
  Get,
  Query,
  HttpException,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TRequest } from 'src/common/types/user.types';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('oauth/callback')
  async githubAuthCallback(@Query('code') code: string) {
    try {
      const jwtToken = await this.authService.handleGitHubCallback(code);

      return jwtToken;
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: TRequest) {
    try {
      return await this.authService.logout(req);
    } catch (error) {
      if (error.status)
        throw new HttpException(error.message, error.status);
      else throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
