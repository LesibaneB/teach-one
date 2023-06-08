import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  CreateAccountDto,
  ResetPasswordDTO,
  SendAccountVerificationDTO,
  VerifyAccountDTO,
} from '@accounts/dto';
import {
  ACCOUNT_EXISTS_ERROR_MESSAGE,
  ACCOUNT_NOT_FOUND_ERROR_MESSAGE,
  OTP_VERIFICATION_OTP_EXPIRED,
  OTP_VERIFICATION_OTP_INVALID,
} from '@accounts/utils/messages';
import { Account, OTP, Password } from '@accounts/entities';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  checkOTPExpired,
  generateOTP,
  generateOTPExpiry,
  otpMatches,
} from '@accounts/utils';
import { AccountStatus } from '@accounts/models';
import { ACCOUNT_VERIFICATION_MAIL_EVENT } from '@mail-sender/utils';
import { AccountVerificationEvent } from '@mail-sender/events';

const SALT_ROUNDS = 10;

/**
 * AccountService
 * Service for accounts operations
 */
@Injectable()
export class AccountService {
  /**
   * Creates a logger for the service
   */
  private readonly logger = new Logger(AccountService.name);

  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @InjectRepository(Password)
    private passwordRepository: Repository<Password>,
    @InjectRepository(OTP)
    private otpRepository: Repository<OTP>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create an account and its' corresponding password
   * @param CreateAccountDto
   */
  public async createAccount({
    firstName,
    lastName,
    emailAddress,
    userType,
    password,
  }: CreateAccountDto): Promise<void> {
    const accountWithIdenticalEmailExists = await this.accountExists(
      emailAddress,
    );
    if (accountWithIdenticalEmailExists) {
      this.logger.error(
        `Account with email address ${emailAddress} already exists`,
      );
      throw new Error(ACCOUNT_EXISTS_ERROR_MESSAGE);
    }

    // Create an account entity
    const account = new Account();
    account.firstName = firstName;
    account.lastName = lastName;
    account.emailAddress = emailAddress;
    account.userType = userType;
    account.createdDate = new Date();

    // Store the entity
    await this.accountRepository.save(account);

    this.logger.log(
      `Account with email address ${emailAddress} created successfully.`,
    );

    // Create a password
    await this.createPasswordForAccount(password, account);

    await this.sendVerification(account);
  }

  /**
   * Verifies an account using the generated OTP code
   * @param payload
   */
  public async verifyAccount(payload: VerifyAccountDTO): Promise<Account> {
    const { emailAddress, otp } = payload;

    // Find the account.
    const account = await this.findAccount(emailAddress);

    if (!account) {
      this.logger.error(`Account for email ${emailAddress} not found.`);
      throw new Error(ACCOUNT_NOT_FOUND_ERROR_MESSAGE);
    }

    const otpVerification = await this.otpRepository.findOne({
      relations: {
        account: true,
      },
      where: {
        account: {
          emailAddress,
        },
      },
    });

    if (!otpVerification) {
      this.logger.error(`OTP for user with email ${emailAddress} not found.`);
      throw new Error(OTP_VERIFICATION_OTP_INVALID);
    }

    if (checkOTPExpired(otpVerification.expiry)) {
      this.logger.error(`OTP for user with email ${emailAddress} has expired.`);
      throw new Error(OTP_VERIFICATION_OTP_EXPIRED);
    }

    if (!otpMatches(otp, otpVerification.otp)) {
      this.logger.error(
        `OTP for user with email ${emailAddress} does not match.`,
      );
      throw new Error(OTP_VERIFICATION_OTP_INVALID);
    }

    if (!otpVerification.isValid) {
      this.logger.error(`OTP for user with email ${emailAddress} is invalid.`);
      throw new Error(OTP_VERIFICATION_OTP_INVALID);
    }

    // Invalidate and save otp
    otpVerification.isValid = false;
    await this.otpRepository.save(otpVerification);

    // Verify and activate account
    account.verified = true;
    account.status = AccountStatus.ACTIVE;
    await this.accountRepository.save(account);

    this.logger.log(
      `OTP for Account with email address ${emailAddress} verified successfully.`,
    );
    return account;
  }

  /**
   * Resets a password fro an account
   * @param payload
   */
  public async resetPassword(payload: ResetPasswordDTO): Promise<void> {
    const { emailAddress, password } = payload;

    // Find the account
    const account = await this.findAccount(emailAddress);

    if (!account) {
      this.logger.error(`Account for email ${emailAddress} not found.`);
      throw new Error(ACCOUNT_NOT_FOUND_ERROR_MESSAGE);
    }

    // Create new hash
    const newPasswordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const currentPassword = await this.passwordRepository.findOne({
      relations: {
        account: true,
      },
      where: {
        account: {
          emailAddress,
        },
      },
    });

    // Set new hash ans save
    currentPassword.passwordHash = newPasswordHash;
    currentPassword.updatedDate = new Date();
    await this.passwordRepository.save(currentPassword);

    this.logger.log(
      `Password for Account with email address ${emailAddress} reset successfully.`,
    );

    // TODO: Send password update email
  }

  /**
   * Retrieves all Accounts from the database
   * @returns Returns an array of accounts
   */
  public async findAll(): Promise<Array<Account>> {
    return this.accountRepository.find();
  }

  /**
   * Finds an account using the email address
   * @param emailAddress
   * @returns Account
   */
  public async findAccount(emailAddress: string): Promise<Account> {
    return this.accountRepository.findOneBy({ emailAddress });
  }

  /**
   * Sends a verification email for an account
   * @param payload
   */
  public async sendAccountVerification(
    payload: SendAccountVerificationDTO,
  ): Promise<void> {
    const { emailAddress } = payload;

    // Find the account.
    const account = await this.findAccount(emailAddress);

    if (!account) {
      this.logger.error(`Account for email ${emailAddress} not found.`);
      throw new Error(ACCOUNT_NOT_FOUND_ERROR_MESSAGE);
    }

    // Create otp and send verification email
    await this.sendVerification(account);
  }

  /**
   * Checks if password matches that of an account
   * @param accountId
   * @param password
   * @returns Promise<boolean>
   */
  public async passwordMatches(
    emailAddress: string,
    password: string,
  ): Promise<boolean> {
    const savedPassword = await this.passwordRepository.findOne({
      relations: { account: true },
      where: {
        account: {
          emailAddress,
        },
      },
    });

    if (!savedPassword) {
      this.logger.error(
        `Password for account with email ${emailAddress} not found.`,
      );
      return false;
    }

    return bcrypt.compare(password, savedPassword.passwordHash);
  }

  /**
   * Creates an OTP and sends a verification email
   * @param account
   */
  private async sendVerification(account: Account): Promise<void> {
    // Create and return otp code
    const generatedOTPCode = await this.createOTPForAccount(account);

    // Account verification email payload
    const accountVerificationMailEventPayload: AccountVerificationEvent = {
      firstName: account.firstName,
      otp: generatedOTPCode,
      emailAddress: account.emailAddress,
    };

    // Emit email verification event
    this.eventEmitter.emit(
      ACCOUNT_VERIFICATION_MAIL_EVENT,
      accountVerificationMailEventPayload,
    );
  }

  /**
   * Checks if an account with the email address exists
   * @param emailAddress
   * @returns Returns a boolean value true if the account exists and false if it does'nt
   */
  private async accountExists(emailAddress: string): Promise<boolean> {
    const accountWithIdenticalEmail = await this.accountRepository.findOneBy({
      emailAddress,
    });
    return !!accountWithIdenticalEmail;
  }

  /**
   * Creates a password for an account
   * @param password
   * @param account
   */
  private async createPasswordForAccount(
    password: string,
    account: Account,
  ): Promise<void> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const newPassword = new Password();
    newPassword.passwordHash = passwordHash;
    newPassword.createdDate = new Date();
    newPassword.account = account;

    await this.passwordRepository.save(newPassword);

    this.logger.log(
      `Password for Account with email address ${account.emailAddress} created successfully.`,
    );
  }

  /**
   * Creates an otp for the account which is used for verification
   * @param account
   * @returns Returns the generated OTP code
   */
  private async createOTPForAccount(account: Account): Promise<number> {
    const otpCode = generateOTP();
    const otp = new OTP();
    otp.otp = otpCode;
    otp.expiry = generateOTPExpiry();
    otp.account = account;

    await this.otpRepository.save(otp);

    this.logger.log(
      `OTP for Account with email address ${account.emailAddress} created successfully.`,
    );

    return otpCode;
  }
}
