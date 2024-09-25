import { Module } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { OpenAiModule } from 'src/open-ai/open-ai.module';
import { UserInstallation } from './entities/user-installation.entity';
import { AllowedOrganization } from './entities/allowed-organization.entity';
import { GithubInstallationService } from './github.installation.service';
import { GithubInstallationController } from './github.installation.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserInstallation, AllowedOrganization]),
    OpenAiModule,
  ],
  controllers: [GithubController, GithubInstallationController],
  providers: [GithubService, ConfigService, GithubInstallationService],
  exports: [GithubService, GithubInstallationService],
})
export class GithubModule {}
