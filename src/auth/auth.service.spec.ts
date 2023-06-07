import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, OTP, Password } from '@accounts/entities';
import { JwtStrategy, LocalStrategy } from '@auth/strategies';
import { AccountService } from '@accounts/account.service';
import { testDatabaseConfigModule } from '@utils/test-database-module.config';
import { DataSource } from 'typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtTokenDto } from './dto';
import { AccountStatus, AccountTypes } from '@accounts/models';
import { faker } from '@faker-js/faker';

describe('AuthService', () => {
  let service: AuthService;

  // Data source instance
  let datasource: DataSource;

  let configService: ConfigService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        testDatabaseConfigModule(),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forFeature([Account, Password, OTP]),
      ],
      providers: [
        AuthService,
        LocalStrategy,
        JwtStrategy,
        ConfigService,
        JwtService,
        AccountService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    // assign datasource module
    datasource = module.get<DataSource>(DataSource);

    // Assign config service instance
    configService = module.get<ConfigService>(ConfigService);
  });

  // Drop database and close connection
  afterAll(async () => {
    await datasource.dropDatabase();
    await datasource.destroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO finish writing this test
  it('should return a jwt token when sign in is called.', async () => {
    const token: JwtTokenDto = service.signIn({
      id: faker.string.uuid(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      emailAddress: faker.internet.email(),
      verified: true,
      userType: AccountTypes.INSTRUCTOR,
      status: AccountStatus.ACTIVE,
    } as Account);

    expect(token).toBeDefined();
    expect(token.access_token).toBeDefined();
    expect(token.expires).toBeDefined();
    expect(token.expires).toBe(
      configService.get<number>('JWT_EXPIRY_PERIOD_IN_SECONDS'),
    );
  });
});
