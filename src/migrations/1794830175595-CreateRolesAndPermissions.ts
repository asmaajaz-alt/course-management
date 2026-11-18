import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateRolesAndPermissions1794830175595 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'roles',
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
            isUnique: true,
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'permissions',
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
            isUnique: true,
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          {
            name: 'roleId',
            type: 'int',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'permissionId',
            type: 'int',
            isPrimary: true,
            isNullable: false,
          },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_role_permissions_permissionId',
            columnNames: ['permissionId'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_role_permissions_role',
            columnNames: ['roleId'],
            referencedTableName: 'roles',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          }),
          new TableForeignKey({
            name: 'FK_role_permissions_permission',
            columnNames: ['permissionId'],
            referencedTableName: 'permissions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('role_permissions');
    await queryRunner.dropTable('permissions');
    await queryRunner.dropTable('roles');
  }
}
