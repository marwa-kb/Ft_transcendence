import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, RequestWithUser } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/guard';
import { Jwt2faGuard } from '../auth/guard';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) { }

  @Get('42')
  @UseGuards(AuthGuard('42'))
  async fortyTwoAuth() { }

  @Get('42/callback')
  @UseGuards(AuthGuard('42'))
  async fortyTwoCallBack(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const frontendUrl = `http://${this.configService.get<string>(
      'APP_HOSTNAME_URL',
    )}:${this.configService.get<string>('FRONTEND_PORT')}`;
    // create token
    const token = await this.authService.createToken(
      req.user.id,
      req.user.email,
      req.user.isTwoFactorEnabled,
      false,
    );
    // console.log('jwt token : ' + token.access_token);
    // if (!token) console.log('Token problem');

    // sending in form of cookies
    res.cookie('tokenJwt', token.access_token, {
      httpOnly: false,
      expires: new Date(Date.now() + 2 * 3600000),
    });

    if (!req.user.isTwoFactorEnabled) {
      const user: AuthDto = await this.prisma.user.update({
        where: {
          id: req.user.id,
        },
        data: {
          status: 'ONLINE',
        },
      });

      // Redirect to game index page
      res.redirect(`${frontendUrl}`);
      // console.log(req.user);
      return user;
    } else {
      if (!req.user.twoFactorSecret) {
        //2fa
        res.redirect(`${frontendUrl}/2fa/reg`);
        return req.user;
      } else {
        res.redirect(`${frontendUrl}/2fa/ver`);
        return req.user;
      }
    }
  }

  //2fa
  @Post('2fa/generate')
  @UseGuards(JwtGuard)
  // @UseGuards(AuthGuard('42'))
  async register(@Req() req: RequestWithUser, @Res() res: Response) {
    const { otpAuthUrl } =
      await this.authService.generateTwoFactorAuthenticationSecret(
        req.user.id,
        req.user.email,
      );

    // response.setHeader('Content-type', 'image/png');
    return res.json(
      await this.authService.generateQrCodeDataURL(otpAuthUrl),
    );
  }

  @Post('2fa/turnoff')
  @UseGuards(JwtGuard)
  async turnOffTwoFactorAuthentication(
    @Req() req: RequestWithUser,
    @Body() body: any,
  ) {
    const user: AuthDto = await this.prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
  }

  @Post('2fa/authenticate')
  @HttpCode(200)
  @UseGuards(Jwt2faGuard)
  async authenticate(
    @Req() req: RequestWithUser,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const isCodeValid =
      this.authService.isTwoFactorAuthenticationCodeValid(
        body.twoFactorAuthenticationCode,
        req.user,
      );

    // console.log(isCodeValid);
    if (!isCodeValid) {
      throw new UnauthorizedException('Wrong authentication code');
    }
    const token = (await this.authService.loginWith2fa(req.user))
      .access_token;
    // console.log("2fa token" + (await token).access_token);
    // sending in form of cookies
    res.cookie('tokenJwt', token, {
      httpOnly: false,
      expires: new Date(Date.now() + 2 * 3600000),
    });
    const user: AuthDto = await this.prisma.user.update({
      where: {
        id: req.user.id,
      },
      data: {
        isTwoFactorEnabled: true,
        status: 'ONLINE',
      },
    });
    return res.json((await token).access_token);
  }

  @Post('42/logout')
  async logOut(@Req() req: Request, @Res() res: Response) {
    // Which user?
    // console.log(req.body.data.id);
    try {
      await this.prisma.user.update({
        where: {
          id: req.body.data.id,
        },
        data: {
          status: 'OFFLINE',
        },
      });
    } catch (err) {
      console.log("Prisma couldn't LOGOUT");
    }
    

    // Success
    // console.log('Logged out successfully + user offline in database');
    res.sendStatus(200);
  }

  // to delete in prod

  @Get('42/guest/:name')
  async guestUser(@Param('name') name: string, @Res() res: Response) {
    const frontendUrl = `http://${this.configService.get<string>(
      'APP_HOSTNAME_URL',
    )}:${this.configService.get<string>('FRONTEND_PORT')}`;

    //for user status showing
    const uuid = uuidv4();
    const guestUser: AuthDto = await this.prisma.user.create({
      data: {
        authId: this.generateAuthId(),
        username: name,
        email: `${uuid}@gmail.com`,
        status: 'ONLINE',
      },
    });
    // console.log(guestUser);

    const token = await this.authService.createToken(
      guestUser.id,
      guestUser.email,
      guestUser.isTwoFactorEnabled,
      false,
    );
    // console.log(token);
    if (!token) console.log('Token problem');

    // sending in form of cookies

    res.cookie('tokenJwt', token.access_token, {
      httpOnly: false,
      expires: new Date(Date.now() + 2 * 3600000),
    });
    res.redirect(`${frontendUrl}`);
    return guestUser;
  }
  private generateAuthId(): number {
    const min = 100000;
    const max = 999999;
    return Math.floor(Math.random() * (max - min) + min);
  }
}
