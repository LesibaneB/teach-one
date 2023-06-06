import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from '@accounts/account.controller';
import { testDatabaseConfigModule } from '@utils/test-database.config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Account, OTP, Password } from '@accounts/entities';
import { AccountService } from '@accounts/account.service';
import { DataSource, Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import { CreateAccountDto, ResetPasswordDTO } from '@accounts/dto';
import { AccountTypes } from '@accounts/models';
import { BadRequestException } from '@nestjs/common';
import {
  ACCOUNT_EXISTS_ERROR_MESSAGE,
  ACCOUNT_NOT_FOUND_ERROR_MESSAGE,
  OTP_VERIFICATION_OTP_INVALID,
} from '@accounts/utils';
import { EventEmitterModule } from '@nestjs/event-emitter';

describe('AccountController', () => {
  // Test controller instance
  let controller: AccountController;
  // Data source instance
  let datasource: DataSource;
  // Password repository instance
  let passwordRepository: Repository<Password>;
  // OTP repository instance
  let otpRepository: Repository<OTP>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
        testDatabaseConfigModule(),
        TypeOrmModule.forFeature([Account, Password, OTP]),
      ],
      controllers: [AccountController],
      providers: [AccountService],
    }).compile();

    // assign instances
    controller = module.get<AccountController>(AccountController);
    // assign password repository instance
    passwordRepository = module.get<Repository<Password>>(
      getRepositoryToken(Password),
    );
    // assign otp repository instance
    otpRepository = module.get<Repository<OTP>>(getRepositoryToken(OTP));
    // assign datasource module
    datasource = module.get<DataSource>(DataSource);
  });

  // Drop database and close connection
  afterAll(async () => {
    await datasource.dropDatabase();
    await datasource.destroy();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Account Creation.', () => {
    it('should successfully create account when correct values are supplied in the payload.', async () => {
      const password = faker.internet.password();
      const createAccountParams: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress: faker.internet.email(),
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      await controller.createAccount(createAccountParams);
    });

    it('should fail with appropriate message when the email address is a duplicate.', async () => {
      const password = faker.internet.password();
      const createAccountParams: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress: faker.internet.email(),
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      // Initial successful call
      await controller.createAccount(createAccountParams);
      try {
        // Duplicate payload call
        await controller.createAccount(createAccountParams);
      } catch (e: any) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect(e.message).toBe(ACCOUNT_EXISTS_ERROR_MESSAGE);
      }
    });
  });

  describe('Account Verification.', () => {
    it('should successfully verify an account when verifyAccount() is called with the correct values.', async () => {
      const password = faker.internet.password();
      const createAccountParams: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress: faker.internet.email(),
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      await controller.createAccount(createAccountParams);

      // Check if otp was saved for account
      const otp = await otpRepository.findOne({
        relations: {
          account: true,
        },
        where: {
          account: {
            emailAddress: createAccountParams.emailAddress,
          },
        },
      });
      expect(otp).not.toBeNull();

      await controller.verifyAccount({
        emailAddress: createAccountParams.emailAddress,
        otp: otp.otp,
      });
    });

    it('should fail to verify an account when verifyAccount() is called with an incorrect otp.', async () => {
      const password = faker.internet.password();
      const createAccountParams: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress: faker.internet.email(),
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      await controller.createAccount(createAccountParams);

      try {
        await controller.verifyAccount({
          emailAddress: createAccountParams.emailAddress,
          otp: 123456,
        });
      } catch (error: any) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBe(OTP_VERIFICATION_OTP_INVALID);
      }
    });
  });

  describe('Account password reset.', () => {
    it('should successfully reset password when resetPassword() is called with the correct emailAddress.', async () => {
      const password = faker.internet.password();
      const createAccountPayload: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress: faker.internet.email(),
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      await controller.createAccount(createAccountPayload);

      // Check if password was created for account
      const oldPasswordForAccount = await passwordRepository.findOne({
        relations: {
          account: true,
        },
        where: {
          account: {
            emailAddress: createAccountPayload.emailAddress,
          },
        },
      });
      expect(oldPasswordForAccount).not.toBeNull();

      const newPassword = faker.internet.password();

      const resetPasswordPayload: ResetPasswordDTO = {
        emailAddress: createAccountPayload.emailAddress,
        password: newPassword,
        confirmPassword: newPassword,
      };

      await controller.resetPassword(resetPasswordPayload);

      const newPasswordForAccount = await passwordRepository.findOne({
        relations: {
          account: true,
        },
        where: {
          account: {
            emailAddress: createAccountPayload.emailAddress,
          },
        },
      });
      expect(newPasswordForAccount).not.toBeNull();

      // Check if passwords aren't the same
      expect(oldPasswordForAccount.passwordHash).not.toEqual(
        newPasswordForAccount.passwordHash,
      );
    });

    it('should fail to reset password when resetPassword() is called with the incorrect emailAddress.', async () => {
      const password = faker.internet.password();
      const createAccountPayload: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress: faker.internet.email(),
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      await controller.createAccount(createAccountPayload);

      // Check if password was created for account
      const oldPasswordForAccount = await passwordRepository.findOne({
        relations: {
          account: true,
        },
        where: {
          account: {
            emailAddress: createAccountPayload.emailAddress,
          },
        },
      });
      expect(oldPasswordForAccount).not.toBeNull();

      const newPassword = faker.internet.password();

      const resetPasswordPayload: ResetPasswordDTO = {
        emailAddress: faker.internet.email(), // Generate incorrect email
        password: newPassword,
        confirmPassword: newPassword,
      };

      try {
        await controller.resetPassword(resetPasswordPayload);
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toBe(ACCOUNT_NOT_FOUND_ERROR_MESSAGE);
      }
    });
  });

  describe('Send verification.', () => {
    it('should successfully send account verification when sendVerification() is called with the correct email.', async () => {
      const password = faker.internet.password();
      const emailAddress = faker.internet.email();
      const createAccountParams: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress,
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      await controller.createAccount(createAccountParams);

      await controller.sendAccountVerification({
        emailAddress,
      });

      // Check if otp was saved for account
      const otps = await otpRepository.find({
        relations: {
          account: true,
        },
        where: {
          account: {
            emailAddress,
          },
        },
      });
      expect(otps).not.toBeNull();

      // Check second otp has been saved
      expect(otps.length).toBe(2);
    });

    it('should fail to send account verification when sendVerification() is called with the incorrect email.', async () => {
      const password = faker.internet.password();
      const emailAddress = faker.internet.email();
      const createAccountParams: CreateAccountDto = {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        emailAddress,
        userType: AccountTypes.INSTRUCTOR,
        password,
        confirmPassword: password,
      };

      await controller.createAccount(createAccountParams);

      try {
        await controller.sendAccountVerification({
          emailAddress: faker.internet.email(),
        });
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toBe(ACCOUNT_NOT_FOUND_ERROR_MESSAGE);
      }
    });
  });
});
