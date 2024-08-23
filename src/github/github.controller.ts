import {
  Controller,
  Query,
  Get,
  HttpStatus,
  Post,
  UseGuards,
  HttpException,
  Req,
  Put,
  Param,
  Body,
  Delete,
} from '@nestjs/common';
import { GithubService } from './github.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Env } from 'src/env';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { UpdatePracticesDto } from './dto/update.practices.dto';
import { TRequest } from 'src/common/types/user.types';
import { GetApiQueryParamsSwaggerWithOrganizationName } from 'src/decorator/decorator';

@Controller('github')
@ApiTags('Github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @ApiBearerAuth()
  @GetApiQueryParamsSwaggerWithOrganizationName()
  @UseGuards(JwtAuthGuard)
  @Get('repos')
  async listRepos(
    @Req() req: TRequest,
    @Query('organizationName') organizationName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    try {
      const repos = await this.githubService.listRepos(
        req,
        organizationName,
        page,
        limit,
      );
      return repos;
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Get('oauth/redirect')
  githubAuthRedirect() {
    const clientId = Env.GITHUB.CLIENT_ID;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user,read:org`;
    return githubAuthUrl;
  }

  @Get('app/redirect')
  async redirectToGitHubAppInstallation() {
    const githubAppUrl = `https://github.com/apps/${Env.GITHUB.APP_NAME}/installations/select_target`;
    return githubAppUrl;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('app/install')
  async handleInstallation(
    @Req() req: TRequest,
    @Query('installationId') installationId: string,
  ) {
    try {
      const result = await this.githubService.handleInstallation(
        req,
        installationId,
      );
      return result;
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
  @Get('user')
  async getUser(@Req() req: TRequest) {
    try {
      const result = await this.githubService.getUser(req);
      return result;
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
  @Get(':repoName/practices')
  async getPractices(
    @Req() req: TRequest,
    @Param('repoName') repoName: string,
  ) {
    try {
      return await this.githubService.getPractices(req, repoName);
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
  @Put(':repoName/practices')
  async updatePractices(
    @Req() req: TRequest,
    @Param('repoName') repoName: string,
    @Body() updatePracticesDto: UpdatePracticesDto,
  ) {
    try {
      return await this.githubService.updatePractices(
        req,
        repoName,
        updatePracticesDto,
      );
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
  @Get(':repoName')
  async repoDetails(@Req() req: TRequest, @Param('repoName') repoName: string) {
    try {
      return await this.githubService.repoDetails(req, repoName);
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
  @Get('user/organizations')
  async userOrganizations(@Req() req: TRequest) {
    try {
      return await this.githubService.userOrganizations(req);
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
  @Delete(':repoName/practices')
  async deletePractices(
    @Req() req: TRequest,
    @Param('repoName') repoName: string,
  ) {
    try {
      return await this.githubService.deletePractices(req, repoName);
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
  @Get(':repoName/pulls')
  async getPullRequests(
    @Req() req: TRequest,
    @Param('repoName') repoName: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    try {
      return await this.githubService.getPullRequests(
        req,
        repoName,
        page,
        limit,
      );
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Get('user-details/sample/data')
  async getUserDetails(@Query('accessToken') accessToken: string) {
    const response = await this.githubService.getUserDetails(accessToken);
    console.log(response);
  }
}
