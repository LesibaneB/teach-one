import { Test, TestingModule } from '@nestjs/testing';
import { AccountVerificationMailListener } from './account-verification-mail.listener';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { ACCOUNT_VERIFICATION_MAIL_EVENT } from '@mail-sender/utils';
import { AccountVerificationEvent } from '@mail-sender/events';
import { faker } from '@faker-js/faker';
import { generateOTP } from '@accounts/utils';

describe('AccountVerificationMailListener', () => {
  let provider: AccountVerificationMailListener;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        EventEmitter2,
        ConfigService,
        AccountVerificationMailListener,
      ],
    }).compile();

    provider = module.get<AccountVerificationMailListener>(
      AccountVerificationMailListener,
    );

    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should trigger account verification event with correct payload.', () => {
    // Create spy instance
    const verificationMailListenerSpy = jest
      .spyOn(provider, 'handleOrderCreatedEvent')
      .mockImplementation(() => null);

    // Account verification email payload
    const accountVerificationMailEventPayload: AccountVerificationEvent = {
      firstName: faker.person.firstName(),
      otp: generateOTP(),
      emailAddress: faker.internet.email(),
    };

    // Setup event emitter to listen for the event trigger
    eventEmitter.on(
      ACCOUNT_VERIFICATION_MAIL_EVENT,
      provider.handleOrderCreatedEvent,
    );

    // Check if listener is setup correctly for event
    expect(eventEmitter.hasListeners(ACCOUNT_VERIFICATION_MAIL_EVENT)).toBe(
      true,
    );

    // Emit email verification event
    eventEmitter.emitAsync(
      ACCOUNT_VERIFICATION_MAIL_EVENT,
      accountVerificationMailEventPayload,
    );

    // Check that email gets sent only once
    expect(verificationMailListenerSpy).toBeCalledTimes(1);

    // Check that email gets sent with correct payload
    expect(verificationMailListenerSpy).toBeCalledWith(
      accountVerificationMailEventPayload,
    );
  });
});
