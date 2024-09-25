import { OrganizationStatus } from 'src/common/constants';
import { Base } from 'src/universal/base.entity';
import { Column, Entity } from 'typeorm';

@Entity()
export class AllowedOrganization extends Base {
  @Column({ type: 'varchar', length: 255, default: 'github' })
  host: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  organizationName: string;

  @Column({ type: 'varchar', length: 255 })
  adminUserName: string;

  @Column({ type: 'varchar', length: 255 })
  adminEmail: string;

  @Column('text', { array: true, default: [] })
  activeUsers: string[];

  @Column('text', { array: true, default: [] })
  inactiveUsers: string[];

  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.ACTIVE,
  })
  status: OrganizationStatus;

  @Column({ type: 'boolean', default: true })
  allowAllUsers: boolean;
}
