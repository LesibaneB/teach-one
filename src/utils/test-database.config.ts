import { configuration } from '@config/configuration';
import { DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Creates the test database module instance
 * @returns DynamicModule
 */
export function testDatabaseConfigModule(): DynamicModule {
  return TypeOrmModule.forRootAsync({
    imports: [
      ConfigModule.forRoot({
        envFilePath: `${process.cwd()}/src/config/env/${
          process.env.NODE_ENV
        }.env`,
        load: [configuration],
      }),
    ],
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => ({
      type: 'postgres',
      host: configService.get('DATABASE_HOST'),
      port: configService.get('DATABASE_PORT'),
      username: configService.get('DATABASE_USER'),
      password: configService.get('DATABASE_PASSWORD'),
      database: configService.get('DATABASE_NAME'),
      entities: [`${process.cwd()}/src/**/**/*.entity.{ts,js}`],
      synchronize: true,
    }),
  });
}
