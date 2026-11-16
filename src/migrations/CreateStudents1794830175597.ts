import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateStudents1794830175597 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'students',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'createdAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'refreshToken',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'roleId',
            type: 'int',
            isNullable: true,
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['roleId'],
            referencedTableName: 'roles',
            referencedColumnNames: ['id'],
          }),
        ],
      }),
    );

    await queryRunner.createIndex(
      'students',
      new TableIndex({
        name: 'UQ_students_email',
        columnNames: ['email'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('students');
  }
}
