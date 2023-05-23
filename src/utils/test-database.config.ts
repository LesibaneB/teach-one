import { DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Creates the test database module instance
 * @returns Returns the test database module instance
 */
export function testDatabaseConfigModule(): DynamicModule {
  return TypeOrmModule.forRoot({
    type: 'postgres',
    host: 'localhost',
    port: 5002,
    username: 'teach-one',
    password: 'teach-one',
    database: 'teach-one-test',
    entities: [__dirname + '/../**/**/*.entity.{ts,js}'],
    synchronize: true,
    // dropSchema: true,
  });
}
