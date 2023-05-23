import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Put,
} from '@nestjs/common';
import { AccountService } from '@accounts/account.service';
import {
  CreateAccountDto,
  ResetPasswordDTO,
  VerifyAccountDTO,
} from '@accounts/dto';

/**
 * Controller for account operations
 */
@Controller('account')
export class AccountController {
  constructor(private accountService: AccountService) {}

  /**
   * Creates an account
   * @param payload
   */
  @Post('/')
  public async createAccount(@Body() payload: CreateAccountDto): Promise<void> {
    try {
      await this.accountService.createAccount(payload);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  /**
   * Verifies an account using OTP
   * @param payload
   */
  @Post('/verify')
  public async verifyAccount(@Body() payload: VerifyAccountDTO): Promise<void> {
    try {
      await this.accountService.verifyAccount(payload);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  } 

  @Put('/reset-password')
  public async resetPassword(@Body() payload: ResetPasswordDTO): Promise<void> {
    try {
      await this.accountService.resetPassword(payload);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }
}
