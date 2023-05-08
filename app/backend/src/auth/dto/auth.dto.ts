import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class AuthDto {
  @IsOptional()
  authId: number;
  @IsOptional()
  username: string;
  @IsOptional()
  email: string;
  @IsOptional()
  id: number;
  @IsOptional()
  password?: string;
  @IsOptional()
  twoFactorSecret?: string;
  @IsOptional()
  isTwoFactorEnabled: boolean;
  @IsOptional()
  isKnown?: boolean;
}

export interface RequestWithUser extends Request {
  user: AuthDto;
}
