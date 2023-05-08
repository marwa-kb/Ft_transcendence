import { Injectable, Redirect } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthDto } from './dto';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private configService: ConfigService,
  ) {}

  async createToken(
    userId: number,
    email: string,
    isTwoFactorEnabled: boolean,
    isTwoFactorAuthenticated: boolean,
  ): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
      isTwoFactorEnabled,
      isTwoFactorAuthenticated,
    };
    // console.log(payload.sub, payload.email);
    const secret = this.configService.get<string>('JWT_SECRET');

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '2h',
      secret: secret,
    });

    return {
      access_token: token,
    };
  }

  //2fa
  async loginWith2fa(userWithoutPsw: Partial<User>) {
    const payload = {
      email: userWithoutPsw.email,
      isTwoFactorEnabled: !!userWithoutPsw.isTwoFactorEnabled,
      isTwoFactorAuthenticated: true,
    };

    // console.log(payload.email);
    // console.log(payload.isTwoFactorEnabled);
    // console.log(payload.isTwoFactorAuthenticated);

    return {
      email: payload.email,
      access_token: this.createToken(
        userWithoutPsw.id,
        userWithoutPsw.email,
        userWithoutPsw.isTwoFactorEnabled,
        true,
      ),
    };
  }

  async generateTwoFactorAuthenticationSecret(
    userId: number,
    email: string,
  ) {
    const secret = authenticator.generateSecret();

    const otpAuthUrl = authenticator.keyuri(
      email,
      this.configService.get<string>('APP_NAME_FOR_2FA'),
      secret,
    );

    // update the user with the secret
    // console.log(userId);
    const user: AuthDto = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        twoFactorSecret: secret,
      },
    });

    return {
      secret,
      otpAuthUrl,
    };
  }

  //2fa generate QRcode
  async generateQrCodeDataURL(otpAuthUrl: string) {
    return toDataURL(otpAuthUrl);
  }

  //check if 2fa code valid
  isTwoFactorAuthenticationCodeValid(
    twoFactorAuthenticationCode: string,
    user: AuthDto,
  ) {
    console.log(twoFactorAuthenticationCode);

    return authenticator.verify({
      token: twoFactorAuthenticationCode,
      secret: user.twoFactorSecret,
    });
  }
}
