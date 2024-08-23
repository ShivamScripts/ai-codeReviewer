import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsEnum,
  IsArray,
  IsBoolean,
  IsOptional,
  Length,
} from 'class-validator';
import { OrganizationStatus } from 'src/common/constants';

export class CreateOrgDto {
  @ApiProperty({
    description: 'The host of the organization (e.g., GitHub)',
    example: 'github',
    default: 'github',
  })
  @IsString()
  @Length(1, 255)
  host: string;

  @ApiProperty({
    description: 'The unique name of the organization',
    example: 'example-org',
  })
  @IsString()
  @Length(1, 255)
  organizationName: string;

  @ApiProperty({
    description: 'The unique username of the admin',
    example: 'admin-user',
  })
  @IsString()
  @Length(1, 255)
  adminUserName: string;

  @ApiProperty({
    description: 'The unique email of the admin',
    example: 'admin@example.com',
  })
  @IsString()
  @Length(1, 255)
  adminEmail: string;

  @ApiProperty({
    description: 'A list of active users',
    example: ['user1', 'user2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  activeUsers: string[];

  @ApiProperty({
    description: 'A list of inactive users',
    example: ['user3', 'user4'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  inActiveUsers: string[];

  @ApiProperty({
    description: 'The status of the organization',
    enum: OrganizationStatus,
    default: OrganizationStatus.ACTIVE,
  })
  @IsEnum(OrganizationStatus)
  status: OrganizationStatus;

  @ApiProperty({
    description: 'Whether all users are allowed by default',
    example: true,
    default: true,
  })
  @IsBoolean()
  allowAllUsers: boolean;
}
