import { IsEmail, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class UpdateAdminDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEmail()
  email?: string;
}
