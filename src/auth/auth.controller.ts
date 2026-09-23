import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto/loginUserDto.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  Register(
    @Body() createUserDto: CreateUserDto
  ) {
    return this.authService.create(createUserDto)
  }

  @Post('login')
  Login(
    @Body() loginUserDto: LoginUserDto
  ) {
    return this.authService.login(loginUserDto)
  }

  @Post('private2')
  @UseGuards(AuthGuard())
  testingPrivateRoute(
    @Req() request: any) {
    return {
      ok: true,
      message: '¡Acceso concedido! El token es válido.',
      user: request.user,
    };
  }
}
