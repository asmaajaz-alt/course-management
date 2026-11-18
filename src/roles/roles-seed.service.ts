import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { Admin } from '../admins/entities/admin.entity';
import { Student } from '../students/entities/student.entity';

@Injectable()
export class RolesSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,

    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,

    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async onModuleInit() {
    const permissionNames = [
      'course:create',
      'course:read',
      'course:update',
      'course:delete',
      'student:create',
      'student:list',
      'student:read',
      'student:update',
      'student:delete',
      'admin:create',
      'admin:read',
      'admin:update',
      'admin:delete',
      'enrollment:create',
      'enrollment:list',
      'enrollment:read',
      'enrollment:update',
      'enrollment:delete',
    ];

    for (const name of permissionNames) {
      let permission = await this.permissionRepository.findOne({
        where: { name },
      });

      if (!permission) {
        permission = this.permissionRepository.create({ name });
        await this.permissionRepository.save(permission);
      }
    }

    const adminRole = await this.createOrUpdateRole('admin', permissionNames);

    const studentRole = await this.createOrUpdateRole('student', [
      'course:read',
      'student:read',
      'student:update',
      'enrollment:create',
      'enrollment:read',
      'enrollment:update',
    ]);

    const students = await this.studentRepository.find();

    for (const student of students) {
      if (!student.roleId) {
        student.roleId = studentRole.id;
        await this.studentRepository.save(student);
      }
    }

    const admins = await this.adminRepository.find();

    for (const admin of admins) {
      if (!admin.roleId) {
        admin.roleId = adminRole.id;
        await this.adminRepository.save(admin);
      }
    }
  }

  private async createOrUpdateRole(
    roleName: string,
    permissionNames: string[],
  ): Promise<Role> {
    let role = await this.roleRepository.findOne({
      where: { name: roleName },
      relations: {
        permissions: true,
      },
    });

    if (!role) {
      role = this.roleRepository.create({ name: roleName });
    }

    role.permissions = await this.permissionRepository.find({
      where: permissionNames.map((name) => ({ name })),
    });

    return this.roleRepository.save(role);
  }
}
