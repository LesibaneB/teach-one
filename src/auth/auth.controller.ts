import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from '@auth/auth.service';
import { LocalAuthGuard } from '@auth/guards';
import { JwtTokenDto } from '@auth/dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('/sign-in')
  public async signIn(@Request() req): Promise<JwtTokenDto> {
    return this.authService.signIn(req.user);
  }
}
