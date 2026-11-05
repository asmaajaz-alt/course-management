import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { Admin } from '../admins/entities/admin.entity';
import { Student } from '../students/entities/student.entity';
import { RolesSeedService } from './roles-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, Admin, Student])],
  providers: [RolesSeedService],
  exports: [TypeOrmModule],
})
export class RolesModule {}
