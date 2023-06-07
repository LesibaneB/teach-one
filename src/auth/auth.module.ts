import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy, LocalStrategy } from './strategies';
import { AccountService } from '@accounts/account.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account, OTP, Password } from '@accounts/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Password, OTP]), PassportModule],
  providers: [AuthService, LocalStrategy, JwtStrategy, AccountService],
  controllers: [AuthController],
})
export class AuthModule {}
