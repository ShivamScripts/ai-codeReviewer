import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { EntityManager, In, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ApiMessages, TokenUsageTags } from 'src/common/constants';
import { TRequest } from 'src/common/types/user.types';
import { Env } from 'src/env';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import * as path from 'path';
import axios from 'axios';
import { Repo } from 'src/webhook/entities/repository.entity';
import { UpdatePracticesDto } from './dto/update.practices.dto';
import { OpenAiService } from 'src/open-ai/open-ai.service';
import { calculateOffset } from 'src/utils/app.utils';
import { PullRequest } from 'src/webhook/entities/pull-request.entity';
import { UserInstallation } from './entities/user-installation.entity';
import { GithubInstallationService } from './github.installation.service';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserInstallation)
    private userInstallationRepository: Repository<UserInstallation>,
    @InjectEntityManager()
    private entityManager: EntityManager,
    private readonly openAiService: OpenAiService,
    private readonly githubInstallationService: GithubInstallationService,
  ) {}

  async getUserDetails(accessToken: string) {
    try {
      const octokit = new Octokit({ auth: accessToken });

      const { data: user } = await octokit.rest.users.getAuthenticated();
      if (!user) {
        throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
      }

      const { data: emails } =
        await octokit.rest.users.listEmailsForAuthenticatedUser();
      const primaryEmail = emails.find((email) => email.primary)?.email;

      return {
        ...user,
        email: primaryEmail || null,
      };
    } catch (error) {
      if (error.status) throw new HttpException(error.message, error.status);
      else throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getUser(req: TRequest) {
    try {
      const userId = req.user['userId'];
      const githubUser = await this.userRepository.findOne({
        where: { githubUserId: userId },
      });
      const userDetails = await this.getUserDetails(
        githubUser.githubAccessToken,
      );
      return userDetails;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  async saveToken(userId: number, accessToken: string) {
    const user = await this.userRepository.findOne({
      where: { githubUserId: `${userId}` },
    });
    if (!user) {
      throw new HttpException(ApiMessages.NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    user.accessToken = accessToken;
    await this.userRepository.save(user);
  }

  async findUserById(userId: string) {
    return await this.userRepository.findOne({
      where: { githubUserId: userId },
    });
  }

  async handleInstallation(req: TRequest, installationId: string) {
    try {
      const userId = req.user['userId'];
      const user = await this.userRepository.findOne({
        where: { githubUserId: userId },
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      await this.validateAndUpdateInstallations(user);
      const existingInstallation =
        await this.userInstallationRepository.findOne({
          where: { installationId: installationId },
        });

      if (existingInstallation) {
        return { message: 'Installation ID up-to-date' };
      }

      const installationToken =
        await this.generateInstallationAccessToken(installationId);
      const repositories =
        await this.fetchOrganizationDetails(installationToken);

      if (!repositories || repositories.length === 0) {
        throw new HttpException('No repositories found', HttpStatus.NOT_FOUND);
      }

      const organizationName = repositories[0].owner.login;

      let userInstallation = await this.userInstallationRepository.findOne({
        where: { user: { id: user.id }, organizationName: organizationName },
      });

      if (!userInstallation) {
        userInstallation = new UserInstallation();
        userInstallation.organizationName = organizationName;
        userInstallation.installationId = installationId;
        userInstallation.user = user;
      } else if (userInstallation.installationId !== installationId) {
        userInstallation.installationId = installationId;
      } else {
        return { message: 'Installation ID already up-to-date' };
      }

      await this.userInstallationRepository.save(userInstallation);
      return { message: 'Installation ID saved/updated successfully' };
    } catch (error) {
      if (error.status === '404') {
        throw new NotFoundException('App not installed');
      }
      throw new HttpException(
        `Failed to handle installation: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private hasDuplicates(items: number[]): boolean {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (items[i] === items[j]) {
          console.log('items[i]', items[i], 'items[j]', items[j]);
          return true;
        }
      }
    }
    return false;
  }
}
