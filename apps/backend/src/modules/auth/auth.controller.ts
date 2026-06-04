import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Req,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { Public } from '../../common/public.decorator';
import { CurrentUser } from '../../common/current-user.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Controller('v1/auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    return this.auth.login(body.email, body.password, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const cookies = (req as unknown as Record<string, unknown>)['cookies'] as
      | Record<string, string>
      | undefined;
    const token = cookies?.['refresh_token'];
    if (!token) throw new UnauthorizedException('No refresh token');
    return this.auth.refresh(token, res);
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: FastifyReply) {
    return this.auth.logout(res);
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.getMe(user.sub);
  }
}
