import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { ACCOUNT_NOT_VERIFIED_ERROR_MESSAGE } from '@accounts/utils/messages';
import { AuthService } from '@auth/auth.service';
import { LOGIN_UNAUTHORIZED_MESSAGE } from '@auth/utils';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'emailAddress' });
  }

  async validate(emailAddress: string, password: string): Promise<any> {
    const account = await this.authService.validateAccount(
      emailAddress,
      password,
    );

    if (!account) {
      throw new UnauthorizedException(LOGIN_UNAUTHORIZED_MESSAGE);
    }

    if (!account.verified) {
      throw new UnauthorizedException(ACCOUNT_NOT_VERIFIED_ERROR_MESSAGE);
    }

    return account;
  }
}
