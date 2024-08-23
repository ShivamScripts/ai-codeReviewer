import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AllowedOrganization } from './entities/allowed-organization.entity';
import { OrganizationStatus } from 'src/common/constants';
import { GithubInstallationService } from './github.installation.service';
import { ApiTags } from '@nestjs/swagger';
import { CreateOrgDto } from './dto/create.org.dto';

@ApiTags('Github-Installation')
@Controller('github-installation')
export class GithubInstallationController {
  constructor(
    private readonly githubInstallationService: GithubInstallationService,
  ) {}

  @Post()
  async create(
    @Body() createOrgDto: CreateOrgDto,
  ): Promise<AllowedOrganization> {
    try {
      return this.githubInstallationService.create(createOrgDto);
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Get()
  async findAll(): Promise<AllowedOrganization[]> {
    try {
      return this.githubInstallationService.findAll();
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AllowedOrganization> {
    try {
      return this.githubInstallationService.findOne(id);
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Get('by-name/:organizationName')
  async findByName(
    @Param('organizationName') organizationName: string,
  ): Promise<AllowedOrganization> {
    try {
      return this.githubInstallationService.findByName(organizationName);
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOrgDto: CreateOrgDto,
  ): Promise<AllowedOrganization> {
    try {
      return this.githubInstallationService.update(id, updateOrgDto);
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    try {
      return this.githubInstallationService.remove(id);
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Get('is-allowed/:organizationName')
  async isOrganizationAllowed(
    @Param('organizationName') organizationName: string,
  ): Promise<boolean> {
    try {
      return this.githubInstallationService.isOrganizationAllowed(
        organizationName,
      );
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Get('is-user-allowed')
  async isUserAllowed(
    @Query('organizationName') organizationName: string,
    @Query('githubUsername') githubUsername: string,
  ): Promise<boolean> {
    try {
      return this.githubInstallationService.isUserAllowed(
        organizationName,
        githubUsername,
      );
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Put('add-user/:organizationName')
  async addAllowedUser(
    @Param('organizationName') organizationName: string,
    @Query('githubUsername') githubUsername: string,
  ): Promise<AllowedOrganization> {
    try {
      return this.githubInstallationService.addAllowedUser(
        organizationName,
        githubUsername,
      );
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Put('remove-user/:organizationName')
  async removeAllowedUser(
    @Param('organizationName') organizationName: string,
    @Query('githubUsername') githubUsername: string,
  ): Promise<AllowedOrganization> {
    try {
      return this.githubInstallationService.removeAllowedUser(
        organizationName,
        githubUsername,
      );
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }

  @Put('update-status/:organizationName')
  async updateStatus(
    @Param('organizationName') organizationName: string,
    @Query('status') newStatus: OrganizationStatus,
  ): Promise<AllowedOrganization> {
    try {
      return this.githubInstallationService.updateStatus(
        organizationName,
        newStatus,
      );
    } catch (error) {
      if (error.status) {
        throw new HttpException(error.message, error.status);
      } else {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
    }
  }
}
