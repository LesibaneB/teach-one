import {
  EMAIL_ADDRESS_INVALID,
  OTP_VERIFICATION_OTP_NOT_NUMERIC,
  OTP_VERIFICATION_OTP_TOO_SHORT,
} from '@accounts/utils';
import { IsNumberLength } from '@lib/validators';
import { IsEmail, IsNumber } from 'class-validator';

export class VerifyAccountDTO {
  @IsNumber({}, { message: OTP_VERIFICATION_OTP_NOT_NUMERIC })
  @IsNumberLength(6, { message: OTP_VERIFICATION_OTP_TOO_SHORT })
  readonly otp: number;

  @IsEmail({}, { message: EMAIL_ADDRESS_INVALID })
  readonly emailAddress: string;
}
