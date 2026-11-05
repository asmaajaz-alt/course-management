import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Enrollment } from '../../enrollments/entities/enrollment.entity';
import { Role } from '../../roles/entities/role.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Enrollment, (enrollment) => enrollment.student)
  enrollments: Enrollment[];

  @Column({ select: false })
  password: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    select: false,
  })
  refreshToken: string | null;

  @Column({ nullable: true })
  roleId: number | null;

  @ManyToOne(() => Role, (role) => role.students)
  @JoinColumn({ name: 'roleId' })
  role: Role;
}
