import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  Matches,
  MinLength,
} from 'class-validator';
import { AccountTypes } from '@accounts/models/enums';
import {
  AUTH_ACCOUNT_ERROR_MESSAGES,
  EMAIL_ADDRESS_INVALID,
  PASSWORD_PATTERN,
  PASSWORD_MIN_LENGTH,
} from '@accounts/utils';
import { IsSameAs } from '@lib/validators';

export class CreateAccountDto {
  @IsNotEmpty({ message: AUTH_ACCOUNT_ERROR_MESSAGES.firstNameEmpty })
  readonly firstName: string;

  @IsNotEmpty({ message: AUTH_ACCOUNT_ERROR_MESSAGES.lastNameEmpty })
  readonly lastName: string;

  @IsEmail({}, { message: EMAIL_ADDRESS_INVALID })
  readonly emailAddress: string;

  @IsEnum(AccountTypes)
  userType: AccountTypes;

  @MinLength(PASSWORD_MIN_LENGTH, {
    message: AUTH_ACCOUNT_ERROR_MESSAGES.passwordShort,
  })
  @Matches(PASSWORD_PATTERN, {
    message: AUTH_ACCOUNT_ERROR_MESSAGES.passwordWeak,
  })
  readonly password: string;

  @MinLength(PASSWORD_MIN_LENGTH, {
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
