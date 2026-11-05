import { IsEnum } from 'class-validator';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';

export class UpdateEnrollmentDto {
  @IsEnum(EnrollmentStatus)
  status!: EnrollmentStatus;
}
