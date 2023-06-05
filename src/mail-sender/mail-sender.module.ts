import { Module } from '@nestjs/common';
import { AccountVerificationMailListener } from '@mail-sender/listeners/account-verification-mail.listener';

@Module({
  providers: [AccountVerificationMailListener],
})
export class MailSenderModule {}
