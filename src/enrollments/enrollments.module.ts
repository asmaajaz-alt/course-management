import { Module, forwardRef } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsRelationsController } from './enrollments-relations.controller';
import { EnrollmentsService } from './enrollments.service';
import { StudentsModule } from '../students/students.module';
import { CoursesModule } from '../courses/courses.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './entities/enrollment.entity';

@Module({
  imports: [
    forwardRef(() => StudentsModule),
    forwardRef(() => CoursesModule),
    TypeOrmModule.forFeature([Enrollment]),
  ],
  controllers: [EnrollmentsController, EnrollmentsRelationsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
