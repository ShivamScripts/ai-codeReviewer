import { Base } from 'src/universal/base.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class UserInstallation extends Base {
  @Column({ type: 'varchar', length: 20 })
  installationId: string;

  @Column({ type: 'varchar', length: 255 })
  organizationName: string;

  @ManyToOne(() => User, (user) => user.installations)
  user: User;
}
