import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { AccountController } from '@accounts/account.controller';
import { AccountService } from '@accounts/account.service';
import { Account, OTP, Password } from '@accounts/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Password, OTP])],
  providers: [AccountService],
  controllers: [AccountController],
})
export class AccountsModule {}
