import { Module, forwardRef } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { Admin } from '../admins/entities/admin.entity';
import { Role } from '../roles/entities/role.entity';

@Module({
  imports: [
    forwardRef(() => EnrollmentsModule),
    TypeOrmModule.forFeature([Student, Admin, Role]),
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
