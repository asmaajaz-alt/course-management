import 'reflect-metadata';
import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: '',
  database: 'course_management_test',

  entities: [__dirname + '/**/*.entity{.ts,.js}'],

  migrations: [__dirname + '/migrations/*{.ts,.js}'],

  synchronize: false,
});

export default AppDataSource;
