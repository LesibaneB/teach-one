import { render } from '@react-email/render';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AccountVerificationEvent } from '@mail-sender/events';
import { ACCOUNT_VERIFICATION_MAIL_EVENT } from '@mail-sender/utils';
import { AccountVerificationEmail } from '@mail-sender/templates';
import { ConfigService } from '@nestjs/config';
import { MailDataRequired, MailService } from '@sendgrid/mail';

@Injectable()
export class AccountVerificationMailListener {
  /**
   * Creates a logger for the service
   */
  private readonly logger = new Logger(AccountVerificationMailListener.name);

  /**
   * Creates the mailer service instance
   */
  private sendGridMailer = new MailService();

  constructor(private configService: ConfigService) {
    // initialize API key from config value
    this.sendGridMailer.setApiKey(
      this.configService.get<string>('SENDGRID_API_KEY'),
    );
  }

  /**
   * Event triggered when an account is successfully created
   * @param payload
   */
  @OnEvent(ACCOUNT_VERIFICATION_MAIL_EVENT)
  public async handleOrderCreatedEvent(
    payload: AccountVerificationEvent,
  ): Promise<void> {
    const { firstName, otp, emailAddress } = payload;
    const emailHTMLTemplate = render(
      AccountVerificationEmail({ firstName, otp }),
    );

    const environment = this.configService.get<string>('NODE_ENV');

    if (environment.includes('development') || environment.includes('test')) {
      this.logger.log(
        `Account verification email with payload : email ${emailAddress}, name: ${firstName}, otp: , ${otp}`,
      );
      return;
    }

    // Verification email payload
    const msg: MailDataRequired = {
      to: emailAddress,
      from: 'bonakele.lesibane@gmail.com',
      subject: '',
      html: emailHTMLTemplate,
    };

    try {
      await this.sendGridMailer.send(msg);
      this.logger.log(
        `Sent verification mail to ${emailAddress} with otp ${otp}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to send verification email to address ${emailAddress} with error ${error.message} and status ${error.status}.`,
      );
    }
  }
}
