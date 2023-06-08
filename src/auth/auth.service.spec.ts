import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, OTP, Password } from '@accounts/entities';
import { AccountService } from '@accounts/account.service';
import { testDatabaseConfigModule } from '@utils/test-database-module.config';
import { DataSource } from 'typeorm';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtTokenDto } from './dto';
import { AccountStatus, AccountTypes } from '@accounts/models';
import { faker } from '@faker-js/faker';
import { CreateAccountDto } from '@accounts/dto';

describe('AuthService', () => {
  let service: AuthService;

  // Data source instance
  let datasource: DataSource;

  // Config service instance
  let configService: ConfigService;

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
    }).compile();

    service = module.get<AuthService>(AuthService);
    // assign datasource module
    datasource = module.get<DataSource>(DataSource);

    // Assign config service instance
    configService = module.get<ConfigService>(ConfigService);

    // Assign account service instance
    accountService = module.get<AccountService>(AccountService);
  });

  // Drop database and close connection
  afterAll(async () => {
    await datasource.dropDatabase();
    await datasource.destroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a correct jwt token when sign in is called.', async () => {
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

  describe('Account validation.', () => {
    it('should successfully validate an account when validateAccount() is called with the correct emailAddress and password and return the validated account', async () => {
      const password = faker.internet.password();
      const emailAddress = faker.internet.email();
      const createAccountParams: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        userType: AccountTypes.INSTRUCTOR,
        emailAddress,
        password,
        confirmPassword: password,
      };

      await accountService.createAccount(createAccountParams);

      // Check if the account exists in the DB
      const account = await accountService.findAccount(emailAddress);
      expect(account).not.toBeNull();

      const validatedAccount = await service.validateAccount(
        emailAddress,
        password,
      );

      // Check if validated account is returned
      expect(validatedAccount).not.toBeNull();
    });

    it('should fail to validate an account when validateAccount() is called with an incorrect emailAddress.', async () => {
      const password = faker.internet.password();
      const emailAddress = faker.internet.email();
      const createAccountParams: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        userType: AccountTypes.INSTRUCTOR,
        emailAddress,
        password,
        confirmPassword: password,
      };

      await accountService.createAccount(createAccountParams);

      // Check if the account exists in the DB
      const account = await accountService.findAccount(emailAddress);
      expect(account).not.toBeNull();

      const validatedAccount = await service.validateAccount(
        faker.internet.email(), // Pass random wrong email
        password,
      );

      // Check if validated account is null since email does not match
      expect(validatedAccount).toBeNull();
    });

    it('should fail to validate an account when validateAccount() is called with a correct emailAddress and an incorrect password.', async () => {
      const password = faker.internet.password();
      const emailAddress = faker.internet.email();
      const createAccountParams: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        userType: AccountTypes.INSTRUCTOR,
        emailAddress,
        password,
        confirmPassword: password,
      };

      await accountService.createAccount(createAccountParams);

      // Check if the account exists in the DB
      const account = await accountService.findAccount(emailAddress);
      expect(account).not.toBeNull();

      const validatedAccount = await service.validateAccount(
        emailAddress,
        faker.internet.password(), // Pass random wrong email
      );

      // Check if validated account is null since password does not match
      expect(validatedAccount).toBeNull();
    });
  });
});
