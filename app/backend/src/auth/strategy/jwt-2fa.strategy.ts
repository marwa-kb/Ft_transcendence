import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { validate } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthDto, RequestWithUser } from '../dto';


@Injectable()
export class Jwt2faStrategy extends PassportStrategy(
  Strategy,
  'jwt-2fa',
) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  // async validate(payload: {
  //   sub: number;
  //   email: string;
  //   isTwoFactorEnabled: boolean;
  //   isTwoFactorAuthenticated: boolean;
  // }) {
  // console.log({
  //   payload,
  // });

  async validate(payload: any) {
    // const user = await this.userService.findOne(payload.email);
    const user: AuthDto =
      await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
      });
    // console.log("jwt2fa: " + user.id);
    return user;
  }
  // if (payload.isTwoFactorAuthenticated) {
  //   return user;
  // }
}
