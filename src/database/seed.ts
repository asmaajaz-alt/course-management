import 'reflect-metadata';
import 'dotenv/config';

import * as bcrypt from 'bcrypt';

import AppDataSource from '../data-source';

import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { Admin } from '../admins/entities/admin.entity';
import { Student } from '../students/entities/student.entity';
import { Course } from '../courses/entities/course.entity';
import { Enrollment } from '../enrollments/entities/enrollment.entity';

import { DiscountType } from '../courses/enums/discount-type.enum';
import { EnrollmentStatus } from '../enrollments/enums/enrollment-status.enum';

async function seed() {
  await AppDataSource.initialize();

  try {
    await AppDataSource.transaction(async (manager) => {
      const roleRepo = manager.getRepository(Role);
      const permissionRepo = manager.getRepository(Permission);
      const adminRepo = manager.getRepository(Admin);
      const studentRepo = manager.getRepository(Student);
      const courseRepo = manager.getRepository(Course);
      const enrollmentRepo = manager.getRepository(Enrollment);

      // 1. Permissions
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

      const permissions: Permission[] = [];

      for (const name of permissionNames) {
        let permission = await permissionRepo.findOneBy({ name });

        if (!permission) {
          permission = await permissionRepo.save(
            permissionRepo.create({ name }),
          );
        }

        permissions.push(permission);
      }

      // 2. Roles and role_permissions
      const adminPermissions = permissions;

      const studentPermissionNames = [
        'course:read',
        'student:read',
        'student:update',
        'enrollment:create',
        'enrollment:read',
        'enrollment:update',
      ];

      const studentPermissions = permissions.filter((permission) =>
        studentPermissionNames.includes(permission.name),
      );

      let adminRole = await roleRepo.findOne({
        where: { name: 'admin' },
        relations: { permissions: true },
      });

      if (!adminRole) {
        adminRole = roleRepo.create({ name: 'admin' });
      }

      adminRole.permissions = adminPermissions;
      adminRole = await roleRepo.save(adminRole);

      let studentRole = await roleRepo.findOne({
        where: { name: 'student' },
        relations: { permissions: true },
      });

      if (!studentRole) {
        studentRole = roleRepo.create({ name: 'student' });
      }

      studentRole.permissions = studentPermissions;
      studentRole = await roleRepo.save(studentRole);

      // 3. Initial Admin
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminName = process.env.ADMIN_NAME || 'Main Admin';

      if (!adminEmail || !adminPassword || adminPassword.length < 8) {
        throw new Error(
          'ADMIN_EMAIL and ADMIN_PASSWORD are required in .env. Password must be at least 8 characters.',
        );
      }

      let admin = await adminRepo.findOneBy({ email: adminEmail });

      if (!admin) {
        admin = adminRepo.create({
          name: adminName,
          email: adminEmail,
          password: await bcrypt.hash(adminPassword, 10),
          refreshToken: null,
          roleId: adminRole.id,
        });
      } else {
        admin.roleId = adminRole.id;
      }

      await adminRepo.save(admin);

      // 4. Students
      const studentData = [
        {
          name: 'Sara Ahmad',
          email: 'sara@example.com',
          phone: '0911000001',
        },
        {
          name: 'Omar Khaled',
          email: 'omar@example.com',
          phone: '0911000002',
        },
        {
          name: 'Lina Samer',
          email: 'lina@example.com',
          phone: '0911000003',
        },
      ];

      const studentPassword = await bcrypt.hash('Student@12345', 10);
      const students: Student[] = [];

      for (const data of studentData) {
        let student = await studentRepo.findOneBy({
          email: data.email,
        });

        if (!student) {
          student = studentRepo.create({
            ...data,
            password: studentPassword,
            refreshToken: null,
            roleId: studentRole.id,
          });
        } else {
          student.roleId = studentRole.id;
        }

        students.push(await studentRepo.save(student));
      }

      // 5. Courses
      const courseData = [
        {
          title: 'NestJS Fundamentals',
          description: 'Learn NestJS and backend development.',
          price: 100,
          discountType: DiscountType.NONE,
          discountValue: 0,
          isActive: true,
        },
        {
          title: 'Advanced TypeScript',
          description: 'Master TypeScript concepts.',
          price: 200,
          discountType: DiscountType.PERCENTAGE,
          discountValue: 20,
          isActive: true,
        },
        {
          title: 'Database Design',
          description: 'Learn relational database design.',
          price: 150,
          discountType: DiscountType.FIXED,
          discountValue: 30,
          isActive: true,
        },
        {
          title: 'Archived Course',
          description: 'An inactive course for testing.',
          price: 80,
          discountType: DiscountType.NONE,
          discountValue: 0,
          isActive: false,
        },
      ];

      const courses: Course[] = [];

      for (const data of courseData) {
        let course = await courseRepo.findOneBy({
          title: data.title,
        });

        if (!course) {
          course = courseRepo.create(data);
        } else {
          Object.assign(course, data);
        }

        courses.push(await courseRepo.save(course));
      }

      // 6. Enrollments
      const enrollmentData = [
        {
          student: students[0],
          course: courses[0],
          status: EnrollmentStatus.ACTIVE,
        },
        {
          student: students[1],
          course: courses[1],
          status: EnrollmentStatus.CANCELLED,
        },
      ];

      for (const data of enrollmentData) {
        const existing = await enrollmentRepo.findOneBy({
          studentId: data.student.id,
          courseId: data.course.id,
          status: data.status,
        });

        if (!existing) {
          const price = data.course.price;
          const discount =
            data.course.discountType === DiscountType.PERCENTAGE
              ? (price * data.course.discountValue) / 100
              : data.course.discountType === DiscountType.FIXED
                ? data.course.discountValue
                : 0;

          await enrollmentRepo.save(
            enrollmentRepo.create({
              studentId: data.student.id,
              courseId: data.course.id,
              priceAtEnrollment: Math.max(0, price - discount),
              status: data.status,
            }),
          );
        }
      }

      // 7. Attempt enrollment in inactive course: blocked
      const inactiveCourse = courses.find((course) => !course.isActive);

      if (inactiveCourse) {
        console.log(
          `Blocked enrollment in inactive course: ${inactiveCourse.title}`,
        );
      }
    });

    console.log('Database seeding completed successfully.');
  } finally {
    await AppDataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exitCode = 1;
});
