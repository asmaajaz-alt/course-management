import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateEnrollments1794830175599 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'enrollments',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'studentId',
            type: 'int',
          },
          {
            name: 'courseId',
            type: 'int',
          },
          {
            name: 'priceAtEnrollment',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'CANCELLED', 'COMPLETED'],
            default: "'ACTIVE'",
          },
          {
            name: 'enrolledAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['studentId'],
            referencedTableName: 'students',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
          new TableForeignKey({
            columnNames: ['courseId'],
            referencedTableName: 'courses',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        ],
      }),
    );

    await queryRunner.createIndex(
      'enrollments',
      new TableIndex({
        name: 'IDX_enrollments_student_course',
        columnNames: ['studentId', 'courseId'],
      }),
    );

    await queryRunner.createIndex(
      'enrollments',
      new TableIndex({
        name: 'IDX_enrollments_courseId',
        columnNames: ['courseId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('enrollments');
  }
}
