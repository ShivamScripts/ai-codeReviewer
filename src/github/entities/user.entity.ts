import { Base } from 'src/universal/base.entity';
import { PullRequest } from 'src/webhook/entities/pull-request.entity';
import { Repo } from 'src/webhook/entities/repository.entity';
import { Column, Entity, OneToMany } from 'typeorm';
import { UserInstallation } from './user-installation.entity';
@Entity()
export class User extends Base {
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  password: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  githubUserId: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  githubUsername: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  githubAvatarUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  githubAccessToken: string;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  accessToken: string;
  
  @OneToMany(() => UserInstallation, (installation) => installation.user)
  installations: UserInstallation[];

  @OneToMany(() => Repo, (repo) => repo.user)
  repo: Repo[];
}
