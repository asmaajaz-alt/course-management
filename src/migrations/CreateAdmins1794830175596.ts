import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateAdmins1794830175596 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'admins',
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
          {
            name: 'createdAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
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
      'admins',
      new TableIndex({
        name: 'UQ_admins_email',
        columnNames: ['email'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('admins');
  }
}
