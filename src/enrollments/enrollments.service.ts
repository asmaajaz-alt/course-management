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

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,

    @Inject(forwardRef(() => StudentsService))
    private readonly studentsService: StudentsService,

    @Inject(forwardRef(() => CoursesService))
    private readonly coursesService: CoursesService,
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
      user?.role === 'student'
        ? Number(user.sub)
        : createEnrollmentDto.studentId;

    if (
      user?.role === 'student' &&
      createEnrollmentDto.studentId !== undefined &&
      Number(createEnrollmentDto.studentId) !== Number(user.sub)
    ) {
      throw new ForbiddenException('Students cannot enroll another student');
    }

    if (!studentId) {
      throw new BadRequestException('studentId is required');
    }

    await this.studentsService.findOne(studentId);

    const course = await this.coursesService.findOne(courseId);

    if (!course.isActive) {
      throw new BadRequestException('Course is not active');
    }

    const activeEnrollment = await this.enrollmentsRepository.findOneBy({
      studentId,
      courseId,
      status: EnrollmentStatus.ACTIVE,
    });

    if (activeEnrollment) {
      throw new ConflictException('Student is already enrolled in this course');
    }

    const newEnrollment = this.enrollmentsRepository.create({
      studentId,
      courseId,
      priceAtEnrollment: course.finalPrice,
      status: EnrollmentStatus.ACTIVE,
    });

    return this.enrollmentsRepository.save(newEnrollment);
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
