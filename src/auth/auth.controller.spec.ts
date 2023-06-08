import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { testDatabaseConfigModule } from '@utils/test-database-module.config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, OTP, Password } from '@accounts/entities';
import { AuthService } from './auth.service';
import { AccountService } from '@accounts/account.service';
import { DataSource } from 'typeorm';

describe('AuthController', () => {
  let controller: AuthController;

  // Data source instance
  let datasource: DataSource;

  // Account service instance
  let accountService: AccountService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: { expiresIn: configService.get<string>('JWT_EXPIRY') },
          }),
        }),
        testDatabaseConfigModule(),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forFeature([Account, Password, OTP]),
      ],
      providers: [ConfigService, AuthService, AccountService],
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    // assign datasource module
    datasource = module.get<DataSource>(DataSource);

    // Assign account service instance
    accountService = module.get<AccountService>(AccountService);
  });

  // Drop database and close connection
  afterAll(async () => {
    await datasource.dropDatabase();
    await datasource.destroy();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
