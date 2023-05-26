import { render } from '@react-email/render';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccountVerificationEvent } from '@mail-sender/events';
import { ACCOUNT_VERIFICATION_MAIL_EVENT } from '@mail-sender/utils';
import { AccountVerificationEmail } from '@mail-sender/templates';

@Injectable()
export class AccountVerificationMailListener {
  /**
   * Creates a logger for the service
   */
  private readonly logger = new Logger(AccountVerificationMailListener.name);

  /**
   * Event triggered when an account is successfully created
   * @param payload
   */
  @OnEvent(ACCOUNT_VERIFICATION_MAIL_EVENT)
  handleOrderCreatedEvent(payload: AccountVerificationEvent) {
    const { firstName, otp } = payload;
    this.logger.log('Event payload : ', payload);
    const emailHTML = render(AccountVerificationEmail({ firstName, otp }));

    this.logger.log('Email HTML : ', emailHTML);
  }
}
