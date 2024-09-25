import {
  IsString,
  MinLength,
  Matches,
  IsNotEmpty,
  IsEmail,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateUserDto {
  @IsString()
  @ApiProperty({
    example: 'username',
  })
  @IsNotEmpty({ message: 'First name is required' })
  name: string;

  @Length(8, 18, {
    message: 'Phone number should be between 8 and 18 digits',
  })
  // @Matches(/^\+\d{1,3}-?\d{7,15}$/, {
  //   message:
  //     'Phone number should start with a + and country code (1 to 3 digits), followed by an optional dash, and then 7 to 15 digits',
  // })
  @ApiProperty({
    description:
      'The phone number of the user, including country code and an optional dash',
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @ApiProperty({
    example: 'user@domainname.com',
  })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password should be a minimum of 8 characters' })
  @ApiProperty({
    example: 'SamplePassword123',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: "It's a weak password",
  })
  password: string;
}
