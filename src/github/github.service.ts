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

  async listRepos(
    req: TRequest,
    organizationName: string,
    page: number,
    limit: number,
  ) {
    try {
      const userId = req.user['userId'];
      const user = await this.userRepository.findOne({
        where: { githubUserId: userId },
        relations: ['installations'],
      });

      if (!user) {
        throw new HttpException('User not found.', HttpStatus.NOT_FOUND);
      }
      const installations = user.installations;
      if (installations.length === 0) {
        throw new HttpException('App not installed.', HttpStatus.BAD_REQUEST);
      }

      let installationId;
      if (organizationName) {
        const installation = installations.find(
          (inst) => inst.organizationName === organizationName,
        );
        if (!installation) {
          throw new HttpException(
            'Installation not found for the organization.',
            HttpStatus.BAD_REQUEST,
          );
        }
        installationId = installation.installationId;
      } else {
        const defaultInstallation = installations.find(
          (inst) => inst.organizationName === user.githubUsername,
        );
        installationId = defaultInstallation
          ? defaultInstallation.installationId
          : installations[0].installationId;
      }
      const installationAccessToken =
        await this.generateInstallationAccessToken(installationId);
      const octokit = new Octokit({
        auth: installationAccessToken,
      });

      const response = await octokit.request('GET /installation/repositories', {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
        per_page: limit,
        page: page,
      });
      await this.updateRepoDetails(response.data.repositories, user);
      const apiResponse = {
        results: response.data.repositories,
        totalPages: Math.ceil(response.data.total_count / limit),
        count: response.data.total_count,
        page: page,
        limit: limit,
      };
      return apiResponse;
    } catch (error) {
      throw new HttpException(
        `Error listing repositories: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async saveUserDetails(userDetails: any, accessToken: string): Promise<User> {
    try {
      let user = await this.userRepository.findOne({
        where: { githubUsername: userDetails.login },
      });
      if (!user) {
        user = this.userRepository.create({
          name: userDetails.name,
          email: userDetails.email,
          githubAccessToken: accessToken,
          githubUsername: userDetails.login,
          githubAvatarUrl: userDetails.avatar_url,
          githubUserId: userDetails.id,
        });
      } else {
        user.githubAccessToken = accessToken;
      }
      await this.validateAndUpdateInstallations(user);
      return await this.userRepository.save(user);
    } catch (error) {
      throw new Error(`Failed to save user details: ${error.message}`);
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

  async generateInstallationAccessToken(
    installationId: string,
  ): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 1000);

      const pemFilename = Env.GITHUB.APP_PEM;
      const pemFilePath = path.join(__dirname, '../../../', pemFilename);
      const privateKey = fs.readFileSync(pemFilePath, 'utf8');

      const payload = {
        iat: now,
        exp: now + 600, // Token expires in 10 minutes (600 seconds)
        iss: Env.GITHUB.APP_ID,
        installation_id: installationId,
        scopes: ['repo'],
      };
      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
      const response = await axios.post(
        `https://api.github.com/app/installations/${installationId}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        },
      );

      if (response.status === 201) {
        return response.data.token;
      } else {
        throw new Error(
          `Failed to obtain installation access token. Status: ${response.status}`,
        );
      }
    } catch (error) {
      if (error.response) {
        throw new HttpException(
          error.response.data.message,
          error.response.data.status,
        );
      }
      throw new Error(
        `Error generating installation access token: ${error.message}`,
      );
    }
  }

  async getUserByInstallationId(installationId: string) {
    const installation = await this.userInstallationRepository.findOne({
      where: { installationId: installationId },
      relations: ['user'],
    });
    return installation.user;
  }

  async updateRepoDetails(repositories: any, user: User) {
    const repoIds = repositories.map((repo) => repo.id.toString());
    const existingRepos = await this.entityManager.find(Repo, {
      where: { githubRepositoryId: In(repoIds) },
    });
    const existingRepoMap = new Map<string, Repo>();
    for (const repo of existingRepos) {
      existingRepoMap.set(repo.githubRepositoryId, repo);
    }

    const reposToUpdateOrInsert: Repo[] = [];

    for (const repoData of repositories) {
      const existingRepo = existingRepoMap.get(repoData.id.toString());
      if (existingRepo) {
        const needsUpdate =
          existingRepo.name !== repoData.name ||
          existingRepo.fullName !== repoData.full_name ||
          existingRepo.isPrivate !== repoData.private ||
          existingRepo.repoUrl !== repoData.html_url ||
          existingRepo.language !== repoData.language ||
          JSON.stringify(existingRepo.repoData) !== JSON.stringify(repoData);

        if (needsUpdate) {
          existingRepo.name = repoData.name;
          existingRepo.fullName = repoData.full_name;
          existingRepo.isPrivate = repoData.private;
          existingRepo.repoUrl = repoData.html_url;
          existingRepo.language = repoData.language;
          existingRepo.repoData = repoData;
          reposToUpdateOrInsert.push(existingRepo);
        }
      } else {
        const newRepo = this.entityManager.create(Repo, {
          githubRepositoryId: repoData.id.toString(),
          name: repoData.name,
          fullName: repoData.full_name,
          isPrivate: repoData.private,
          repoUrl: repoData.html_url,
          language: repoData.language,
          repoData: repoData,
          user: user,
        });

        reposToUpdateOrInsert.push(newRepo);
      }
    }
    await this.entityManager.transaction(async (transactionalEntityManager) => {
      if (reposToUpdateOrInsert.length > 0) {
        await transactionalEntityManager.save(Repo, reposToUpdateOrInsert);
      }
    });
  }

  async repoDetails(req: TRequest, repoName: string) {
    const userId = req.user['userId'];
    const user = await this.userRepository.findOne({
      where: { githubUserId: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const repo = await this.entityManager.findOne(Repo, {
      where: { name: repoName, user: { id: user.id } },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }
    const formattedData = {
      id: repo.id,
      githubRepositoryId: repo.githubRepositoryId,
      name: repo.name,
      fullName: repo.fullName,
      repoUrl: repo.repoUrl,
      isPrivate: repo.isPrivate,
      language: repo.language,
      practices: repo.practices,
      practicesPrompt: repo.practicesPrompt,
    };
    return formattedData;
  }

  async userOrganizations(req: TRequest) {
    const userId = req.user['userId'];
    const user = await this.userRepository.findOne({
      where: { githubUserId: userId },
      relations: ['installations'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.installations || user.installations.length === 0) {
      throw new BadRequestException('App not installed');
    }
    const formattedData = user.installations.map((installation) => ({
      id: installation.id,
      label: installation.organizationName,
      value: installation.organizationName,
    }));
    return formattedData;
  }

  async getPractices(req: TRequest, repoName: string): Promise<any> {
    const userId = req.user['userId'];
    const user = await this.userRepository.findOne({
      where: { githubUserId: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const repo = await this.entityManager.findOne(Repo, {
      where: { name: repoName, user: { id: user.id } },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }
    return { practices: repo.practices };
  }

  async updatePractices(
    req: TRequest,
    repoName: string,
    updatePracticesDto: UpdatePracticesDto,
  ): Promise<Repo> {
    const userId = req.user['userId'];
    const user = await this.userRepository.findOne({
      where: { githubUserId: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const repo = await this.entityManager.findOne(Repo, {
      where: { name: repoName, user: { id: user.id } },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }
    let practicesPrompt = null;
    try {
      practicesPrompt = await this.openAiService.formatPractices(
        updatePracticesDto.practices,
      );
    } catch (error) {
      this.logger.error('Error formatting practices with OpenAI:', error);
    }
    repo.practices = updatePracticesDto.practices;
    repo.practicesPrompt = practicesPrompt;
    const result = await this.entityManager.save(Repo, repo);
    return result;
  }

  async deletePractices(req: TRequest, repoName: string) {
    const userId = req.user['userId'];
    const user = await this.userRepository.findOne({
      where: { githubUserId: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const repo = await this.entityManager.findOne(Repo, {
      where: { name: repoName, user: { id: user.id } },
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }
    repo.practices = null;
    repo.practicesPrompt = null;
    return await this.entityManager.save(Repo, repo);
  }

  async getPullRequests(
    req: TRequest,
    repoName: string,
    page: number,
    limit: number,
  ) {
    const skip = calculateOffset(page, limit);
    const userId = req.user['userId'];
    const repo = await this.entityManager.findOne(Repo, {
      where: { user: { githubUserId: userId }, name: repoName },
      relations: ['user'],
    });
    if (!repo) {
      throw new NotFoundException('Repository not found');
    }
    const pullRequests = await this.entityManager.find(PullRequest, {
      where: { repo: { id: repo.id } },
      relations: ['events', 'events.tokens'],
      skip: skip,
      take: limit,
    });
    if (!pullRequests || pullRequests.length === 0) {
      throw new NotFoundException('Pull requests not found');
    }
    const result = pullRequests.map((pr) => {
      const prUrl = pr.url
        .replace('https://api.github.com/repos/', 'https://github.com/')
        .replace('/pulls/', '/pull/');

      let prLightBotTokens = 0;
      let prHeavyBotTokens = 0;

      const events = pr.events.map((event) => {
        let eventLightBotTokens = 0;
        let eventHeavyBotTokens = 0;

        event.tokens.forEach((token) => {
          if (token.tag === TokenUsageTags.SUMMARY_USAGE_LOW) {
            eventLightBotTokens += token.totalTokens;
          } else {
            eventHeavyBotTokens += token.totalTokens;
          }
        });

        prLightBotTokens += eventLightBotTokens;
        prHeavyBotTokens += eventHeavyBotTokens;

        return {
          id: event.id,
          eventType: event.eventType,
          status: event.status,
          tokens: {
            lightBotTokens: eventLightBotTokens,
            heavyBotTokens: eventHeavyBotTokens,
          },
        };
      });

      return {
        id: pr.id,
        githubPrId: pr.githubPrId,
        url: pr.url,
        prUrl: prUrl,
        title: pr.title,
        userComments: pr.userComments,
        botComments: pr.botComments,
        commitCount: pr.commitCount,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changedFiles,
        events: events,
        lightBotTokens: prLightBotTokens,
        heavyBotTokens: prHeavyBotTokens,
      };
    });

    return result;
  }

  async fetchOrganizationDetails(installationAccessToken: string) {
    try {
      const octokit = new Octokit({
        auth: installationAccessToken,
      });
      const response = await octokit.request('GET /installation/repositories', {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      return response.data.repositories;
    } catch (error) {
      console.error('Error fetching organization details:', error.message);
      throw error;
    }
  }

  async validateAndUpdateInstallations(user: User) {
    try {
      const accessToken = user.githubAccessToken;

      const githubInstallations =
        await this.fetchUserInstallations(accessToken);

      const githubInstallationIds = new Set(
        githubInstallations.map((inst) => inst.id.toString()),
      );
      const localInstallations = await this.userInstallationRepository.find({
        where: { user: { id: user.id } },
      });

      const allowedOrganizations =
        await this.githubInstallationService.allowedOrganisations(
          user.githubUsername,
        );
      const allowedOrgNames = new Set(
        allowedOrganizations.map((org) => org.organizationName),
      );

      const uninstalledInstallationIds = new Set<string>();

      for (const installation of githubInstallations) {
        if (!allowedOrgNames.has(installation.account.login)) {
          await this.githubInstallationService.uninstall(installation.id);
          uninstalledInstallationIds.add(installation.id.toString());
        }
      }
      const installationsToRemove = localInstallations.filter(
        (localInstallation) =>
          !githubInstallationIds.has(localInstallation.installationId),
      );

      const installationsToAdd = githubInstallations
        .filter(
          (githubInstallation) =>
            !localInstallations.some(
              (localInstallation) =>
                localInstallation.installationId ===
                githubInstallation.id.toString(),
            ) &&
            !uninstalledInstallationIds.has(githubInstallation.id.toString()),
        )
        .map((githubInstallation) => ({
          installationId: githubInstallation.id.toString(),
          organizationName: githubInstallation.account.login,
          user: user,
        }));

      if (installationsToRemove.length > 0) {
        await this.userInstallationRepository.remove(installationsToRemove);
      }

      if (installationsToAdd.length > 0) {
        await this.userInstallationRepository.save(installationsToAdd);
      }
    } catch (error) {
      this.logger.warn(`Failed to update user installations: ${error.message}`);
    }
  }

  async fetchUserInstallations(accessToken: string): Promise<any[]> {
    try {
      const octokit = new Octokit({
        auth: accessToken,
      });
      const { data } = await octokit.request('GET /user/installations', {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      return data.installations;
    } catch (error) {
      throw new HttpException(
        `Error fetching user installations: ${error.message}`,
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
