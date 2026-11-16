import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
} from 'typeorm';

import { OneToMany } from 'typeorm';
import { Admin } from '../../admins/entities/admin.entity';
import { Student } from '../../students/entities/student.entity';
import { Permission } from '../../permissions/entities/permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: {
      name: 'roleId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'permissionId',
      referencedColumnName: 'id',
    },
  })
  permissions: Permission[];

  @OneToMany(() => Admin, (admin) => admin.role)
  admins: Admin[];

  @OneToMany(() => Student, (student) => student.role)
  students: Student[];
}
