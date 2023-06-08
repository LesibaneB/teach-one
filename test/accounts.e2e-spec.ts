import { AccountsModule } from '@accounts/accounts.module';
import {
  CreateAccountDto,
  ResetPasswordDTO,
  SendAccountVerificationDTO,
  VerifyAccountDTO,
} from '@accounts/dto';
import { OTP } from '@accounts/entities';
import { AccountTypes } from '@accounts/models';
import {
  ACCOUNT_NOT_FOUND_ERROR_MESSAGE,
  AUTH_ACCOUNT_ERROR_MESSAGES,
  EMAIL_ADDRESS_INVALID,
  OTP_VERIFICATION_OTP_INVALID,
} from '@accounts/utils';
import { faker } from '@faker-js/faker';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { testDatabaseConfigModule } from '@utils/test-database-module.config';
import * as request from 'supertest';
import { DataSource, Repository } from 'typeorm';

describe('AccountsController (e2e)', () => {
  // Application instance
  let app: INestApplication;
  // Data source instance
  let datasource: DataSource;
  // OTP repository instance
  let otpRepository: Repository<OTP>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        testDatabaseConfigModule(),
        AccountsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // assign otp repository instance
    otpRepository = app.get<Repository<OTP>>(getRepositoryToken(OTP));
    // Assign data source
    datasource = moduleFixture.get<DataSource>(DataSource);

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

  describe('Account creation.', () => {
    it('(POST) /account should successfully create an account when called with correct payload.', () => {
      const password = faker.internet.password();
      const createAccountPayload: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress: faker.internet.email(),
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      return request(app.getHttpServer())
        .post('/account')
        .send(createAccountPayload)
        .expect(201);
    });

    it('(POST) /account should fail with appropriate messages to create an account when called with empty password and confirmPassword fields in the payload.', () => {
      const createAccountPayload: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress: faker.internet.email(),
        userType: AccountTypes.INSTRUCTOR,
        password: '',
        confirmPassword: '',
      };

      return request(app.getHttpServer())
        .post('/account')
        .send(createAccountPayload)
        .expect(400, {
          statusCode: 400,
          message: [
            AUTH_ACCOUNT_ERROR_MESSAGES.passwordWeak,
            AUTH_ACCOUNT_ERROR_MESSAGES.passwordShort,
            AUTH_ACCOUNT_ERROR_MESSAGES.passwordWeak,
            AUTH_ACCOUNT_ERROR_MESSAGES.passwordShort,
          ],
          error: 'Bad Request',
        });
    });

    it('(POST) /account should fail with appropriate messages to create an account when called with empty firstName and lastName fields in the payload', () => {
      const password = faker.internet.password();
      const createAccountPayload: CreateAccountDto = {
        firstName: '',
        lastName: '',
        emailAddress: faker.internet.email(),
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      return request(app.getHttpServer())
        .post('/account')
        .send(createAccountPayload)
        .expect(400, {
          statusCode: 400,
          message: [
            AUTH_ACCOUNT_ERROR_MESSAGES.firstNameEmpty,
            AUTH_ACCOUNT_ERROR_MESSAGES.lastNameEmpty,
          ],
          error: 'Bad Request',
        });
    });

    it('(POST) /account should fail with appropriate message to create an account when called with badly formatted email.', () => {
      const password = faker.internet.password();
      const createAccountPayload: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress: faker.string.alphanumeric(), // Generate non-email string
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      return request(app.getHttpServer())
        .post('/account')
        .send(createAccountPayload)
        .expect(400, {
          statusCode: 400,
          message: [EMAIL_ADDRESS_INVALID],
          error: 'Bad Request',
        });
    });
  });

  describe('Account verification.', () => {
    it('(POST) /account should successfully verify an account when called with correct payload.', async () => {
      const password = faker.internet.password();
      const createAccountPayload: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress: faker.internet.email(),
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
                emailAddress: createAccountPayload.emailAddress,
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
            .expect(201);
        });
    });

    it('(POST) /account fail to verify an account when called with otp in the correct payload.', async () => {
      const password = faker.internet.password();
      const createAccountPayload: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress: faker.internet.email(),
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      return request(app.getHttpServer())
        .post('/account')
        .send(createAccountPayload)
        .expect(201)
        .then(async () => {
          const verifyAccountPayload: VerifyAccountDTO = {
            emailAddress: createAccountPayload.emailAddress,
            otp: 123456, // Use incorrect otp
          };

          return request(app.getHttpServer())
            .post('/account/verify')
            .send(verifyAccountPayload)
            .expect(400, {
              statusCode: 400,
              message: OTP_VERIFICATION_OTP_INVALID,
              error: 'Bad Request',
            });
        });
    });
  });

  describe('Password reset.', () => {
    it('(PUT) /reset-password should succesfully reset password for an account when trying to reset password with a correct payload.', async () => {
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
          const newPassword = faker.internet.password();
          const resetPassword: ResetPasswordDTO = {
            emailAddress: createAccountPayload.emailAddress,
            password: newPassword,
            confirmPassword: newPassword,
          };

          return request(app.getHttpServer())
            .put('/account/reset-password')
            .send(resetPassword)
            .expect(200);
        });
    });

    it('(PUT) /reset-password should fail to reset password for an account when trying to reset password with an incorrect payload.', async () => {
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
          const newPassword = faker.internet.password();
          const resetPassword: ResetPasswordDTO = {
            emailAddress: faker.internet.email(),
            password: newPassword,
            confirmPassword: newPassword,
          };

          return request(app.getHttpServer())
            .put('/account/reset-password')
            .send(resetPassword)
            .expect(400, {
              statusCode: 400,
              message: ACCOUNT_NOT_FOUND_ERROR_MESSAGE,
              error: 'Bad Request',
            });
        });
    });
  });

  describe('Send verification.', () => {
    it('(POST) /send-verification should succesfully send account verification when a correct email is used.', async () => {
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
          const sendAccountVerificationRequest: SendAccountVerificationDTO = {
            emailAddress: createAccountPayload.emailAddress,
          };

          return request(app.getHttpServer())
            .post('/account/send-verification')
            .send(sendAccountVerificationRequest)
            .expect(201);
        });
    });

    it('(POST) /send-verification should fail to send account verification when an icorrect email is used.', async () => {
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
          const sendAccountVerificationRequest: SendAccountVerificationDTO = {
            emailAddress: faker.internet.email(), // Use wrong email
          };

          return request(app.getHttpServer())
            .post('/account/send-verification')
            .send(sendAccountVerificationRequest)
            .expect(400, {
              statusCode: 400,
              message: ACCOUNT_NOT_FOUND_ERROR_MESSAGE,
              error: 'Bad Request',
            });
        });
    });
  });
});
