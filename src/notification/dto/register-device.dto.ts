import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { DevicePlatform } from '../entities/device-token.entity';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;
}
