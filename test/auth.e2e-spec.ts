import { CreateAccountDto, VerifyAccountDTO } from '@accounts/dto';
import { OTP } from '@accounts/entities';
import { AccountTypes } from '@accounts/models';
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { testDatabaseConfigModule } from '@utils/test-database-module.config';
import { DataSource, Repository } from 'typeorm';
import * as request from 'supertest';
import { AuthModule } from '@auth/auth.module';
import { AccountsModule } from '@accounts/accounts.module';
import { LOGIN_UNAUTHORIZED_MESSAGE } from '@auth/utils';

describe('AuthController (e2e)', () => {
  // Application instance
  let app: INestApplication;
  // Data source instance
  let datasource: DataSource;

  // OTP repository instance
  let otpRepository: Repository<OTP>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        testDatabaseConfigModule(),
        EventEmitterModule.forRoot(),
        AccountsModule,
        AuthModule,
      ],
      providers: [ConfigService],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Assign data source
    datasource = moduleFixture.get<DataSource>(DataSource);

    // assign otp repository instance
    otpRepository = app.get<Repository<OTP>>(getRepositoryToken(OTP));

    // Use validation pipe
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  // Destroy database connection after each test
  afterAll(async () => {
    await datasource.dropDatabase();
    await datasource.destroy();
    await app.close();
  });

  describe('Sign-in.', () => {
    it('POST /sign-in should successfully sign-in an account when called with correct payload.', async () => {
      const password = faker.internet.password();
      const emailAddress = faker.internet.email();
      const createAccountPayload: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress,
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      return request(app.getHttpServer())
        .post('/account')
        .send(createAccountPayload)
        .expect(201)
        .then(async () => {
          // Check if otp was saved for account
          let otp = await otpRepository.findOne({
            relations: {
              account: true,
            },
            where: {
              account: {
                emailAddress,
              },
            },
          });
          expect(otp).not.toBeNull();

          const verifyAccountPayload: VerifyAccountDTO = {
            emailAddress: createAccountPayload.emailAddress,
            otp: otp.otp,
          };

          return request(app.getHttpServer())
            .post('/account/verify')
            .send(verifyAccountPayload)
            .expect(201)
            .then(async () => {
              const signInPayload = {
                emailAddress,
                password,
              };
              return request(app.getHttpServer())
                .post('/auth/sign-in')
                .send(signInPayload)
                .expect(201);
            });
        });
    });

    it('POST /sign-in should fail to sign-in an account when called with incorrect email.', async () => {
      const password = faker.internet.password();
      const emailAddress = faker.internet.email();
      const createAccountPayload: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress,
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      return request(app.getHttpServer())
        .post('/account')
        .send(createAccountPayload)
        .expect(201)
        .then(async () => {
          // Check if otp was saved for account
          let otp = await otpRepository.findOne({
            relations: {
              account: true,
            },
            where: {
              account: {
                emailAddress,
              },
            },
          });
          expect(otp).not.toBeNull();

          const verifyAccountPayload: VerifyAccountDTO = {
            emailAddress: createAccountPayload.emailAddress,
            otp: otp.otp,
          };

          return request(app.getHttpServer())
            .post('/account/verify')
            .send(verifyAccountPayload)
            .expect(201)
            .then(async () => {
              const signInPayload = {
                emailAddress: faker.internet.email(), // Pass random wrong email
                password,
              };
              return request(app.getHttpServer())
                .post('/auth/sign-in')
                .send(signInPayload)
                .expect(401, {
                  statusCode: 401,
                  message: LOGIN_UNAUTHORIZED_MESSAGE,
                  error: 'Unauthorized',
                });
            });
        });
    });

    it('POST /sign-in should fail to sign-in an account when called with incorrect password.', async () => {
      const password = faker.internet.password();
      const emailAddress = faker.internet.email();
      const createAccountPayload: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress,
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      return request(app.getHttpServer())
        .post('/account')
        .send(createAccountPayload)
        .expect(201)
        .then(async () => {
          // Check if otp was saved for account
          let otp = await otpRepository.findOne({
            relations: {
              account: true,
            },
            where: {
              account: {
                emailAddress,
              },
            },
          });
          expect(otp).not.toBeNull();

          const verifyAccountPayload: VerifyAccountDTO = {
            emailAddress: createAccountPayload.emailAddress,
            otp: otp.otp,
          };

          return request(app.getHttpServer())
            .post('/account/verify')
            .send(verifyAccountPayload)
            .expect(201)
            .then(async () => {
              const signInPayload = {
                emailAddress,
                password: faker.internet.password(), // Pass random wrong password
              };
              return request(app.getHttpServer())
                .post('/auth/sign-in')
                .send(signInPayload)
                .expect(401, {
                  statusCode: 401,
                  message: LOGIN_UNAUTHORIZED_MESSAGE,
                  error: 'Unauthorized',
                });
            });
        });
    });
  });
});
