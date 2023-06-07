import { Account } from '@accounts/entities';
import { Injectable, Logger } from '@nestjs/common';
import { JwtTokenDto } from './dto/jwt-token.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AccountService } from '@accounts/account.service';

/**
 * AuthService
 * Service to handle authentication
 */
@Injectable()
export class AuthService {
  /**
   * Creates a logger for the service
   */
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
  ) {}

  /**
   * Generates a JWT token for the account
   * @param account
   * @returns JwtTokenDto
   */
  public signIn(account: Account): JwtTokenDto {
    return {
      access_token: this.jwtService.sign({
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        emailAddress: account.emailAddress,
        verified: account.verified,
        userType: account.userType,
        status: account.status,
      }),
      expires: this.configService.get<number>('JWT_EXPIRY_PERIOD_IN_SECONDS'),
    };
  }

  /**
   * Validates an account
   * @param emailAddress
   * @param password
   * @returns Promise<Account>
   */
  public async validateAccount(
    emailAddress: string,
    password: string,
  ): Promise<Account> {
    const account = await this.accountService.findAccount(emailAddress);
    if (!account) {
      this.logger.error(`Account for email ${emailAddress} not found.`);
      return null;
    }

    if (
      await this.accountService.passwordMatches(account.emailAddress, password)
    ) {
      this.logger.log(
        `Password matches for account with email ${account.emailAddress}, continue....`,
      );
      return account;
    }

    return null;
  }
}
