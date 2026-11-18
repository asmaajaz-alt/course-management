import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Student } from './entities/student.entity';
import { Admin } from '../admins/entities/admin.entity';
import { Role } from '../roles/entities/role.entity';

import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

import { DataSource } from 'typeorm';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

import * as bcrypt from 'bcrypt';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,

    @InjectRepository(Admin)
    private readonly adminsRepository: Repository<Admin>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    private readonly dataSource: DataSource,
  ) {}

  async findAll() {
    const students = await this.studentsRepository.find();
    return students.map((student) => this.withoutSecrets(student));
  }

  async findOne(id: number) {
    const student = await this.studentsRepository.findOneBy({ id });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    return this.withoutSecrets(student);
  }

  async create(createStudentDto: CreateStudentDto) {
    const emailExists = await this.studentsRepository.findOneBy({
      email: createStudentDto.email,
    });
    const adminEmailExists = await this.adminsRepository.findOneBy({
      email: createStudentDto.email,
    });

    if (emailExists || adminEmailExists) {
      throw new ConflictException('Email already exists');
    }

    const studentRole = await this.roleRepository.findOneBy({
      name: 'student',
    });

    if (!studentRole) {
      throw new NotFoundException('Student role was not found');
    }

    const hashedPassword = await bcrypt.hash(createStudentDto.password, 10);

    const newStudent = this.studentsRepository.create({
      ...createStudentDto,
      password: hashedPassword,
      roleId: studentRole.id,
    });

    const savedStudent = await this.studentsRepository.save(newStudent);
    return this.withoutSecrets(savedStudent);
  }

  async update(
    id: number,
    updateStudentDto: UpdateStudentDto,
    user: { sub: number; role: string },
  ) {
    if (!user || (user.role !== 'student' && user.role !== 'admin')) {
      throw new ForbiddenException('An authenticated account is required');
    }

    if (user?.role === 'student' && Number(user.sub) !== Number(id)) {
      throw new ForbiddenException(
        'Students can only update their own profile',
      );
    }

    if (user?.role === 'student' && updateStudentDto.email !== undefined) {
      throw new BadRequestException('Students cannot change their email');
    }

    const student = await this.findOne(id);

    if (updateStudentDto.email) {
      const emailExists = await this.studentsRepository.findOneBy({
        email: updateStudentDto.email,
      });
      const adminEmailExists = await this.adminsRepository.findOneBy({
        email: updateStudentDto.email,
      });

      if ((emailExists && emailExists.id !== id) || adminEmailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(student, updateStudentDto);

    await this.studentsRepository.save(student);
    return this.findOne(id);
  }

  async remove(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const studentsRepository = manager.getRepository(Student);
      const enrollmentsRepository = manager.getRepository(Enrollment);

      const student = await studentsRepository.findOneBy({ id });

      if (!student) {
        throw new NotFoundException(`Student with ID ${id} not found`);
      }

      const hasEnrollments = await enrollmentsRepository.existsBy({
        studentId: id,
      });

      if (hasEnrollments) {
        throw new ConflictException(
          'Cannot delete student because enrollments exist',
        );
      }

      await studentsRepository.delete(id);

      return { message: 'Student deleted successfully' };
    });
  }

  private withoutSecrets(student: Student) {
    const {
      password: _password,
      refreshToken: _refreshToken,
      ...safeStudent
    } = student;
    return safeStudent;
  }
}
