import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AllowedOrganization } from './entities/allowed-organization.entity';
import { Repository } from 'typeorm';
import { OrganizationStatus } from 'src/common/constants';
import { CreateOrgDto } from './dto/create.org.dto';
import { Env } from 'src/env';
import * as fs from 'fs';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { Octokit } from '@octokit/rest';

@Injectable()
export class GithubInstallationService {
  private readonly logger = new Logger(GithubInstallationService.name);
  constructor(
    @InjectRepository(AllowedOrganization)
    private allowedOrgRepository: Repository<AllowedOrganization>,
  ) {}

  async create(createOrgDto: CreateOrgDto): Promise<AllowedOrganization> {
    const newOrg = this.allowedOrgRepository.create(createOrgDto);
    return this.allowedOrgRepository.save(newOrg);
  }

  async findAll(): Promise<AllowedOrganization[]> {
    return this.allowedOrgRepository.find();
  }

  async findOne(id: string): Promise<AllowedOrganization> {
    const org = await this.allowedOrgRepository.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException(`Organization not found`);
    }
    return org;
  }

  async findByName(organizationName: string): Promise<AllowedOrganization> {
    const org = await this.allowedOrgRepository.findOne({
      where: { organizationName },
    });
    if (!org) {
      throw new NotFoundException(
        `Organization "${organizationName}" not found`,
      );
    }
    return org;
  }

  async update(
    id: string,
    updateOrgDto: CreateOrgDto,
  ): Promise<AllowedOrganization> {
    const org = await this.findOne(id);
    if (!org) {
      throw new NotFoundException(`Organization not found`);
    }
    Object.assign(org, updateOrgDto);
    return this.allowedOrgRepository.save(org);
  }

  async remove(id: string): Promise<void> {
    const result = await this.allowedOrgRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Organization not found`);
    }
  }

  async isOrganizationAllowed(organizationName: string): Promise<boolean> {
    const org = await this.allowedOrgRepository.findOne({
      where: { organizationName, status: OrganizationStatus.ACTIVE },
    });
    return !!org;
  }

  async isUserAllowed(
    organizationName: string,
    githubUsername: string,
  ): Promise<boolean> {
    try {
      const org = await this.findByName(organizationName);
      if (org.status !== OrganizationStatus.ACTIVE) {
        return false;
      }
      if (org.allowAllUsers) {
        return true;
      }
      return org.activeUsers.includes(githubUsername);
    } catch (error) {
      this.logger.error(`Error checking user allowance: ${error.message}`);
      return false;
    }
  }

  async addAllowedUser(
    organizationName: string,
    githubUsername: string,
  ): Promise<AllowedOrganization> {
    const org = await this.findByName(organizationName);
    if (!org) {
      throw new NotFoundException(`Organization not found`);
    }
    if (org.inactiveUsers.includes(githubUsername)) {
      org.inactiveUsers = org.inactiveUsers.filter(
        (username) => username !== githubUsername,
      );
    }
    if (!org.activeUsers.includes(githubUsername)) {
      org.activeUsers.push(githubUsername);
      return this.allowedOrgRepository.save(org);
    }
    return org;
  }

  async removeAllowedUser(
    organizationName: string,
    githubUsername: string,
  ): Promise<AllowedOrganization> {
    const org = await this.findByName(organizationName);
    if (!org) {
      throw new NotFoundException(`Organization not found`);
    }
    org.activeUsers = org.activeUsers.filter(
      (username) => username !== githubUsername,
    );
    if (!org.inactiveUsers.includes(githubUsername)) {
      org.inactiveUsers.push(githubUsername);
    }
    return this.allowedOrgRepository.save(org);
  }

  async updateStatus(
    organizationName: string,
    newStatus: OrganizationStatus,
  ): Promise<AllowedOrganization> {
    const org = await this.findByName(organizationName);
    if (!org) {
      throw new NotFoundException(`Organization not found`);
    }
    org.status = newStatus;
    return this.allowedOrgRepository.save(org);
  }

  async uninstall(id: number) {
    const now = Math.floor(Date.now() / 1000);

    const pemFilename = Env.GITHUB.APP_PEM;
    const pemFilePath = path.join(__dirname, '../../../', pemFilename);
    const privateKey = fs.readFileSync(pemFilePath, 'utf8');

    const payload = {
      iat: now,
      exp: now + 600,
      iss: Env.GITHUB.APP_ID,
      installation_id: id,
    };
    const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
    const octokit = new Octokit({
      auth: token,
    });

    await octokit.request('DELETE /app/installations/{installation_id}', {
      installation_id: id,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  }

  async allowedOrganisations(name: string) {
    return this.allowedOrgRepository.find({ where: { adminUserName: name } });
  }
}
