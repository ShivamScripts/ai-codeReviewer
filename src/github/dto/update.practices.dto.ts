import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePracticesDto {
  @ApiProperty({
    description: 'Practices can be strings or a single paragraph.',
    example: ['practice1', 'practice2'],
  })
  @IsNotEmpty()
  practices: string[];
}
