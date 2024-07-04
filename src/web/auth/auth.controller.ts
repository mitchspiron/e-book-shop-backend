import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, SignUpUserDto } from './dto';
import { GlobalResponseType } from '../../utils/type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signUp')
  async signUpUser(@Body() dto: SignUpUserDto): GlobalResponseType {
    return await this.authService.signUpUser(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): GlobalResponseType {
    return this.authService.login(dto);
  }
}
