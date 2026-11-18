import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Enrollment } from './entities/enrollment.entity';

import { StudentsService } from '../students/students.service';
import { CoursesService } from '../courses/courses.service';

import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';
import { EnrollmentStatus } from './enums/enrollment-status.enum';

import { DataSource } from 'typeorm';
import { Course } from '../courses/entities/course.entity';
import { Student } from '../students/entities/student.entity';
import { DiscountType } from '../courses/enums/discount-type.enum';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,

    @Inject(forwardRef(() => StudentsService))
    private readonly studentsService: StudentsService,

    @Inject(forwardRef(() => CoursesService))
    private readonly coursesService: CoursesService,

    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    return this.enrollmentsRepository.find();
  }

  async findOne(id: number, user: { sub: number; role: string }) {
    this.assertAccount(user);

    const enrollment = await this.enrollmentsRepository.findOneBy({ id });

    if (
      user?.role === 'student' &&
      (!enrollment || Number(enrollment.studentId) !== Number(user.sub))
    ) {
      throw new ForbiddenException(
        'Students can only access their own enrollments',
      );
    }

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    return enrollment;
  }

  async create(
    createEnrollmentDto: CreateEnrollmentDto,
    user: { sub: number; role: string },
  ) {
    this.assertAccount(user);

    const { courseId } = createEnrollmentDto;

    const studentId =
      user.role === 'student'
        ? Number(user.sub)
        : createEnrollmentDto.studentId;

    if (
      user.role === 'student' &&
      createEnrollmentDto.studentId !== undefined &&
      Number(createEnrollmentDto.studentId) !== Number(user.sub)
    ) {
      throw new ForbiddenException('Students cannot enroll another student');
    }

    if (!studentId) {
      throw new BadRequestException('studentId is required');
    }

    return this.dataSource.transaction(async (manager) => {
      const studentsRepository = manager.getRepository(Student);
      const coursesRepository = manager.getRepository(Course);
      const enrollmentsRepository = manager.getRepository(Enrollment);

      const student = await studentsRepository.findOneBy({
        id: studentId,
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      const course = await coursesRepository.findOneBy({
        id: courseId,
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (!course.isActive) {
        throw new BadRequestException('Course is not active');
      }

      const activeEnrollment = await enrollmentsRepository.findOneBy({
        studentId,
        courseId,
        status: EnrollmentStatus.ACTIVE,
      });

      if (activeEnrollment) {
        throw new ConflictException(
          'Student is already enrolled in this course',
        );
      }

      let finalPrice = Number(course.price);
      const discountValue = Number(course.discountValue);

      if (course.discountType === DiscountType.NONE) {
        finalPrice = Number(course.price);
      }

      if (course.discountType === DiscountType.PERCENTAGE) {
        if (discountValue > 100) {
          throw new BadRequestException(
            'Percentage discount cannot exceed 100%',
          );
        }

        finalPrice -= (finalPrice * discountValue) / 100;
      }

      if (course.discountType === DiscountType.FIXED) {
        if (discountValue > finalPrice) {
          throw new BadRequestException(
            'Fixed discount cannot exceed course price',
          );
        }

        finalPrice -= discountValue;
      }

      finalPrice = Number(finalPrice.toFixed(2));

      const newEnrollment = enrollmentsRepository.create({
        studentId,
        courseId,
        priceAtEnrollment: finalPrice,
        status: EnrollmentStatus.ACTIVE,
      });

      return enrollmentsRepository.save(newEnrollment);
    });
  }

  async update(
    id: number,
    updateEnrollmentDto: UpdateEnrollmentDto,
    user: { sub: number; role: string },
  ) {
    this.assertAccount(user);

    const enrollment = await this.findOne(id, user);

    if (
      user?.role === 'student' &&
      updateEnrollmentDto.status !== EnrollmentStatus.CANCELLED
    ) {
      throw new ForbiddenException(
        'Students may only cancel their enrollments',
      );
    }

    if (updateEnrollmentDto.status === EnrollmentStatus.ACTIVE) {
      const activeEnrollment = await this.enrollmentsRepository.findOneBy({
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        status: EnrollmentStatus.ACTIVE,
      });

      if (activeEnrollment && activeEnrollment.id !== id) {
        throw new ConflictException(
          'Student is already actively enrolled in this course',
        );
      }
    }

    Object.assign(enrollment, updateEnrollmentDto);

    return this.enrollmentsRepository.save(enrollment);
  }

  async remove(id: number, user: { sub: number; role: string }) {
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Only admins can delete enrollments');
    }

    await this.findOne(id, user);

    await this.enrollmentsRepository.delete(id);
  }

  async hasEnrollmentsForStudent(studentId: number) {
    return this.enrollmentsRepository.existsBy({ studentId });
  }

  async hasEnrollmentsForCourse(courseId: number) {
    return this.enrollmentsRepository.existsBy({ courseId });
  }

  async findByStudent(studentId: number, user: { sub: number; role: string }) {
    this.assertAccount(user);

    if (user?.role === 'student' && Number(user.sub) !== Number(studentId)) {
      throw new ForbiddenException(
        'Students can only access their own enrollments',
      );
    }

    const student = await this.studentsService.findOne(studentId);

    const enrollments = await this.enrollmentsRepository.findBy({
      studentId,
    });

    return Promise.all(
      enrollments.map(async (enrollment) => ({
        ...enrollment,
        student,
        course: await this.coursesService.findOne(enrollment.courseId),
      })),
    );
  }

  async findByCourse(courseId: number) {
    const course = await this.coursesService.findOne(courseId);

    const enrollments = await this.enrollmentsRepository.findBy({
      courseId,
    });

    return Promise.all(
      enrollments.map(async (enrollment) => ({
        ...enrollment,
        course,
        student: await this.studentsService.findOne(enrollment.studentId),
      })),
    );
  }

  private assertAccount(user: { sub: number; role: string }) {
    if (!user || (user.role !== 'student' && user.role !== 'admin')) {
      throw new ForbiddenException('An authenticated account is required');
    }
  }
}
