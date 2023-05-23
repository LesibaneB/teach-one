import {
  AUTH_ACCOUNT_ERROR_MESSAGES,
  EMAIL_ADDRESS_INVALID,
  PASSWORD_PATTERN,
} from '@accounts/utils';
import { IsSameAs } from '@lib/validators';
import { IsEmail, Matches, MinLength } from 'class-validator';

export class ResetPasswordDTO {
  @IsEmail({}, { message: EMAIL_ADDRESS_INVALID })
  readonly emailAddress: string;

  @MinLength(8, {
    message: AUTH_ACCOUNT_ERROR_MESSAGES.passwordShort,
  })
  @Matches(PASSWORD_PATTERN, {
    message: AUTH_ACCOUNT_ERROR_MESSAGES.passwordWeak,
  })
  readonly password: string;

  @MinLength(8, {
    message: AUTH_ACCOUNT_ERROR_MESSAGES.passwordShort,
  })
  @IsSameAs('password', {
    message: AUTH_ACCOUNT_ERROR_MESSAGES.confirmPasswordNotMatch,
  })
  @Matches(PASSWORD_PATTERN, {
    message: AUTH_ACCOUNT_ERROR_MESSAGES.passwordWeak,
  })
  readonly confirmPassword: string;
}
