import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class SwitchUserDto {
  @IsString()
  userId: string;
}

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  getMe(@Query('userId') userId?: string) {
    return this.authService.getMe(userId);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all available operator accounts for fast switching' })
  getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user by email' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('signup')
  @ApiOperation({ summary: 'Create new user operator profile' })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.name, dto.email, dto.password, dto.title);
  }

  @Post('switch')
  @ApiOperation({ summary: 'Switch active user session' })
  switchUser(@Body() dto: SwitchUserDto) {
    return this.authService.switchActiveUser(dto.userId);
  }
}
