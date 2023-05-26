import { Test, TestingModule } from '@nestjs/testing';
import { AccountVerificationMailListener } from './account-verification-mail.listener';
import { EventEmitterModule } from '@nestjs/event-emitter';

describe('AccountVerificationMailListener', () => {
  let provider: AccountVerificationMailListener;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [AccountVerificationMailListener],
    }).compile();

    provider = module.get<AccountVerificationMailListener>(
      AccountVerificationMailListener,
    );
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
