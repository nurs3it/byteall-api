import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'обновление' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
