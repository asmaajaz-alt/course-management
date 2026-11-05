import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { Admin } from '../admins/entities/admin.entity';
import { Student } from '../students/entities/student.entity';
import { Role } from '../roles/entities/role.entity';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,

    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingAdmin = await this.adminRepository.findOne({
      where: { email: dto.email },
    });

    const existingStudent = await this.studentRepository.findOne({
      where: { email: dto.email },
    });

    if (existingAdmin || existingStudent) {
      throw new ConflictException('Email already exists');
    }

    const studentRole = await this.roleRepository.findOne({
      where: { name: 'student' },
    });

    if (!studentRole) {
      throw new Error('Student role was not found');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const student = this.studentRepository.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      password: hashedPassword,
      roleId: studentRole.id,
    });

    const savedStudent = await this.studentRepository.save(student);

    return {
      id: savedStudent.id,
      name: savedStudent.name,
      email: savedStudent.email,
      phone: savedStudent.phone,
      role: 'student',
    };
  }

  async login(dto: LoginDto) {
    const admin = await this.adminRepository
      .createQueryBuilder('admin')
      .addSelect(['admin.password', 'admin.refreshToken'])
      .leftJoinAndSelect('admin.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('admin.email = :email', { email: dto.email })
      .getOne();

    const student = admin
      ? null
      : await this.studentRepository
          .createQueryBuilder('student')
          .addSelect(['student.password', 'student.refreshToken'])
          .leftJoinAndSelect('student.role', 'role')
          .leftJoinAndSelect('role.permissions', 'permission')
          .where('student.email = :email', { email: dto.email })
          .getOne();

    const account = admin || student;

    if (!account || !(await bcrypt.compare(dto.password, account.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!account.role) {
      throw new UnauthorizedException('Account role is missing');
    }

    const permissions = account.role.permissions.map(
      (permission) => permission.name,
    );

    const payload = {
      sub: account.id,
      email: account.email,
      role: account.role.name,
      permissions,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: account.id,
        email: account.email,
        role: account.role.name,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    account.refreshToken = refreshToken;

    if (admin) {
      await this.adminRepository.save(admin);
    } else if (student) {
      await this.studentRepository.save(student);
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role.name,
        permissions,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const isAdmin = payload.role === 'admin';

      const repository = isAdmin
        ? this.adminRepository
        : this.studentRepository;

      const account = await repository
        .createQueryBuilder(isAdmin ? 'admin' : 'student')
        .addSelect(`${isAdmin ? 'admin' : 'student'}.refreshToken`)
        .leftJoinAndSelect(`${isAdmin ? 'admin' : 'student'}.role`, 'role')
        .leftJoinAndSelect('role.permissions', 'permission')
        .where(`${isAdmin ? 'admin' : 'student'}.id = :id`, {
          id: payload.sub,
        })
        .getOne();

      if (!account || account.refreshToken !== refreshToken || !account.role) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const permissions = account.role.permissions.map(
        (permission) => permission.name,
      );

      const accessToken = await this.jwtService.signAsync(
        {
          sub: account.id,
          email: account.email,
          role: account.role.name,
          permissions,
        },
        {
          secret: this.configService.getOrThrow<string>('JWT_SECRET'),
          expiresIn: '15m',
        },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(user: { sub: number; role: string }) {
    const isAdmin = user.role === 'admin';

    const repository = isAdmin ? this.adminRepository : this.studentRepository;

    const account = await repository.findOne({
      where: { id: user.sub },
    });

    if (account) {
      account.refreshToken = null;
      await repository.save(account);
    }
  }
}
