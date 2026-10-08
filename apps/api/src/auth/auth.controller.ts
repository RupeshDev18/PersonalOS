import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUserId } from './user.decorator';
import { Public } from './auth.guard';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

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

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Public — login returns a session token.
   * The client stores this token and sends it as:
   *   Authorization: Bearer <token>
   * on every subsequent request.
   */
  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Authenticate user by email, receive session token' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /** Public — signup; also returns a session token. */
  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Create new user account, receive session token' })
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.name, dto.email, dto.password, dto.title);
  }

  /** Public — list all seeded users for fast dev switching in local UI. */
  @Public()
  @Get('users')
  @ApiOperation({ summary: 'List all operator accounts (dev convenience)' })
  getAllUsers() {
    return this.authService.getAllUsers();
  }

  /** Protected — returns the profile of whoever owns the current token. */
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  getMe(@CurrentUserId() userId: string) {
    return this.authService.getMe(userId);
  }

  /** Protected — invalidate the current session. */
  @Post('logout')
  @ApiOperation({ summary: 'Invalidate the current session token' })
  logout(@Headers('authorization') auth: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : auth?.trim();
    if (token) this.authService.logout(token);
    return { success: true };
  }
}
