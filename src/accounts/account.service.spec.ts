import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from '@accounts/account.service';
import { Account, OTP, Password } from '@accounts/entities';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { testDatabaseConfigModule } from '@utils/test-database.config';
import { DataSource, Repository } from 'typeorm';
import { faker } from '@faker-js/faker';
import { CreateAccountDto, ResetPasswordDTO } from '@accounts/dto';
import { AccountStatus, AccountTypes } from '@accounts/models/enums';
import {
  ACCOUNT_NOT_FOUND_ERROR_MESSAGE,
  OTP_VERIFICATION_OTP_INVALID,
} from '@accounts/utils';

describe('AccountService', () => {
  // Test service instance
  let service: AccountService;
  // Data source instance
  let datasource: DataSource;
  // Password repository instance
  let passwordRepository: Repository<Password>;
  // OTP repository instance
  let otpRepository: Repository<OTP>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        testDatabaseConfigModule(),
        TypeOrmModule.forFeature([Account, Password, OTP]),
      ],
      providers: [AccountService],
    }).compile();

    // assign service instance
    service = module.get<AccountService>(AccountService);
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
    expect(service).toBeDefined();
  });

  it('should add a new account, password, and otp when createAccount() is called with the correct values in the payload.', async () => {
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

    await service.createAccount(createAccountParams);

    // Check if the account exists in the DB
    const account = await service.findAccount(emailAddress);
    expect(account).not.toBeNull();
    expect(account.firstName).toEqual(createAccountParams.firstName);
    expect(account.lastName).toEqual(createAccountParams.lastName);
    expect(account.emailAddress).toEqual(createAccountParams.emailAddress);
    expect(account.verified).toEqual(false);

    // Check if password was created for account
    const passwordForAccount = await passwordRepository.findOne({
      relations: {
        account: true,
      },
      where: {
        account: {
          emailAddress: account.emailAddress,
        },
      },
    });
    expect(passwordForAccount).not.toBeNull();

    // TODO: Check if email was sent with correct payload

    // Check if otp was saved for account
    const otp = await otpRepository.findOne({
      relations: {
        account: true,
      },
      where: {
        account: {
          emailAddress: account.emailAddress,
        },
      },
    });
    expect(otp).not.toBeNull();
  });

  describe('Account verification', () => {
    it('should successfully verify an account when verifyAccount() is called with the correct values.', async () => {
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

      await service.createAccount(createAccountParams);

      // Check if the account exists in the DB
      let account = await service.findAccount(emailAddress);
      expect(account).not.toBeNull();
      expect(account.firstName).toEqual(createAccountParams.firstName);
      expect(account.lastName).toEqual(createAccountParams.lastName);
      expect(account.emailAddress).toEqual(createAccountParams.emailAddress);
      expect(account.verified).toEqual(false);

      // TODO: Check if email was sent with correct payload

      // Check if otp was saved for account
      let otp = await otpRepository.findOne({
        relations: {
          account: true,
        },
        where: {
          account: {
            emailAddress: account.emailAddress,
          },
        },
      });
      expect(otp).not.toBeNull();
      await service.verifyAccount({
        emailAddress: account.emailAddress,
        otp: otp.otp,
      });

      // Reload and check if account was activated and verified
      account = await service.findAccount(emailAddress);
      expect(account.verified).toBe(true);
      expect(account.status).toBe(AccountStatus.ACTIVE);

      // Reload and check if used otp has been invalidated
      otp = await otpRepository.findOne({
        relations: {
          account: true,
        },
        where: {
          account: {
            emailAddress: account.emailAddress,
          },
        },
      });
      expect(otp.isValid).toBe(false);
    });

    it('should fail to verify an account when verifyAccount() is called with an incorrect otp.', async () => {
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

      await service.createAccount(createAccountParams);

      // Check if the account exists in the DB
      const account = await service.findAccount(emailAddress);
      expect(account).toBeDefined();
      expect(account.firstName).toEqual(createAccountParams.firstName);
      expect(account.lastName).toEqual(createAccountParams.lastName);
      expect(account.emailAddress).toEqual(createAccountParams.emailAddress);
      expect(account.verified).toEqual(false);

      // TODO: Check if email was sent with correct payload

      // Check if otp was saved for account
      const otp = await otpRepository.findOne({
        relations: {
          account: true,
        },
        where: {
          account: {
            emailAddress: account.emailAddress,
          },
        },
      });
      expect(otp).not.toBeNull();

      try {
        await service.verifyAccount({
          emailAddress: account.emailAddress,
          otp: 123456,
        });
      } catch (error: any) {
        expect(error.message).toEqual(OTP_VERIFICATION_OTP_INVALID);
      }
    });
  });

  describe('Account password reset.', () => {
    it('should successfully reset password when resetPassword() is called with the correct email address.', async () => {
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

      await service.createAccount(createAccountParams);

      // Check if the account exists in the DB
      let account = await service.findAccount(emailAddress);
      expect(account).not.toBeNull();
      expect(account.firstName).toEqual(createAccountParams.firstName);
      expect(account.lastName).toEqual(createAccountParams.lastName);
      expect(account.emailAddress).toEqual(createAccountParams.emailAddress);
      expect(account.verified).toEqual(false);

      // Check if password was created for account
      const oldPasswordForAccount = await passwordRepository.findOne({
        relations: {
          account: true,
        },
        where: {
          account: {
            emailAddress: account.emailAddress,
          },
        },
      });
      expect(oldPasswordForAccount).not.toBeNull();

      const newPassword = faker.internet.password();

      const resetPasswordPayload: ResetPasswordDTO = {
        emailAddress,
        password: newPassword,
        confirmPassword: newPassword,
      };

      await service.resetPassword(resetPasswordPayload);

      const newPasswordForAccount = await passwordRepository.findOne({
        relations: {
          account: true,
        },
        where: {
          account: {
            emailAddress: account.emailAddress,
          },
        },
      });

      // Check if passwords hashes aren't the same
      expect(oldPasswordForAccount.passwordHash).not.toEqual(
        newPasswordForAccount.passwordHash,
      );
    });

    it('should successfully reset password when resetPassword() is called with the correct email address.', async () => {
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

      await service.createAccount(createAccountParams);

      // Check if the account exists in the DB
      let account = await service.findAccount(emailAddress);
      expect(account).not.toBeNull();

      // Generate new password
      const newPassword = faker.internet.password();

      const resetPasswordPayload: ResetPasswordDTO = {
        emailAddress,
        password: newPassword,
        confirmPassword: newPassword,
      };

      try {
        await service.resetPassword(resetPasswordPayload);
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toBe(ACCOUNT_NOT_FOUND_ERROR_MESSAGE);
      }
    });
  });
});
