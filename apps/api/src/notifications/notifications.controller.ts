import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUserId } from '../auth/user.decorator';
import { IsNotEmpty, IsString } from 'class-validator';

export class SetTelegramConfigDto {
  @IsString()
  @IsNotEmpty()
  botToken: string;

  @IsString()
  @IsNotEmpty()
  chatId: string;
}

@ApiTags('notifications')
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get Telegram notification bridge status' })
  getStatus() {
    return this.notificationsService.getStatus();
  }

  @Post('config')
  @ApiOperation({ summary: 'Configure Telegram bot token and optional chat ID' })
  async setConfig(
    @CurrentUserId() _userId: string,
    @Body() dto: SetTelegramConfigDto,
  ) {
    const success = await this.notificationsService.setConfig(dto.botToken, dto.chatId);
    return {
      success,
      message: success
        ? 'Telegram bot token verified and linked.'
        : 'Failed to verify bot token. Check your token from @BotFather.',
      status: this.notificationsService.getStatus(),
    };
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a live test notification to Telegram' })
  async testNotification(@CurrentUserId() _userId: string) {
    const ok = await this.notificationsService.sendNotification(
      '🔔 <b>PersonalOS Test Alert</b>\nLive push notifications are working smoothly from your local server.',
    );
    return {
      success: ok,
      message: ok
        ? 'Test alert sent successfully to Telegram.'
        : 'Could not send test message. Ensure your bot is configured and you ran /start.',
    };
  }
}
