import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AuthCredsDto {
  @IsString()
  @ApiProperty({ description: 'The email of the user' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @ApiProperty({ description: 'The password of the user' })
  @IsNotEmpty()
  password: string;
}
