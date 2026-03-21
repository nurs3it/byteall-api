import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class LogoutDto {
  @ApiProperty()
  @IsString()
  @IsUUID('4')
  refresh_token: string;
}
