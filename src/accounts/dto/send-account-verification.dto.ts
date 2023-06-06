import { IsEmail } from 'class-validator';
import { EMAIL_ADDRESS_INVALID } from '@accounts/utils';

export class SendAccountVerificationDTO {
  @IsEmail({}, { message: EMAIL_ADDRESS_INVALID })
  emailAddress: string;
}
