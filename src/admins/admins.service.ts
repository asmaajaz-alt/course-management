import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Admin } from './entities/admin.entity';
import { Student } from '../students/entities/student.entity';
import { Role } from '../roles/entities/role.entity';

import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(Admin)
    private adminsRepository: Repository<Admin>,

    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,

    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll() {
    const admins = await this.adminsRepository.find();
    return admins.map((admin) => this.withoutSecrets(admin));
  }

  async findOne(id: number) {
    const admin = await this.adminsRepository.findOneBy({ id });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${id} not found`);
    }

    return this.withoutSecrets(admin);
  }

  async create(createAdminDto: CreateAdminDto) {
    const emailExists = await this.adminsRepository.findOneBy({
      email: createAdminDto.email,
    });
    const studentEmailExists = await this.studentsRepository.findOneBy({
      email: createAdminDto.email,
    });

    if (emailExists || studentEmailExists) {
      throw new ConflictException('Email already exists');
    }

    const adminRole = await this.roleRepository.findOneBy({ name: 'admin' });

    if (!adminRole) {
      throw new NotFoundException('Admin role was not found');
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

    const newAdmin = this.adminsRepository.create({
      ...createAdminDto,
      password: hashedPassword,
      roleId: adminRole.id,
    });

    const savedAdmin = await this.adminsRepository.save(newAdmin);

    return this.withoutSecrets(savedAdmin);
  }

  async update(id: number, updateAdminDto: UpdateAdminDto) {
    const admin = await this.findOne(id);

    if (updateAdminDto.email) {
      const emailExists = await this.adminsRepository.findOneBy({
        email: updateAdminDto.email,
      });
      const studentEmailExists = await this.studentsRepository.findOneBy({
        email: updateAdminDto.email,
      });

      if ((emailExists && emailExists.id !== id) || studentEmailExists) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(admin, updateAdminDto);

    await this.adminsRepository.save(admin);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);

    await this.adminsRepository.delete(id);
  }

  private withoutSecrets(admin: Admin) {
    const {
      password: _password,
      refreshToken: _refreshToken,
      ...safeAdmin
    } = admin;
    return safeAdmin;
  }
}
