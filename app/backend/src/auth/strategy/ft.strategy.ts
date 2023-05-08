import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, VerifyCallback } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import { AuthDto } from '../dto';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(
  Strategy,
  '42',
) {
  constructor(
    private readonly configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      authorizationURL: configService.get<string>(
        'FORTYTWO_APP_AUTHORIZATION_URL',
      ),
      tokenURL: configService.get<string>('FORTYTWO_APP_TOKEN_URL'),
      clientID: configService.get<string>('FORTYTWO_CLIENT_ID'),
      clientSecret: configService.get<string>(
        'FORTYTWO_CLIENT_SECRET_ID',
      ),
      callbackURL: configService.get<string>(
        'FORTYTWO_CALL_BACK_URL',
      ),
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    done: VerifyCallback,
  ): Promise<AuthDto> {
    // This function is called after the user grants permission to your application.
    // Here, you can use the access token to make API requests to the 42 API,
    // or save the user profile to your database and return the user object.

    // console.log(
    //   'Hello from STRATEGY',
    // accessToken,
    // refreshToken,
    // );

    // API call to 42 to get the User info with axios.get
    const profile = await axios.get('https://api.intra.42.fr/v2/me', {
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    });

    try {
    // Check if the user already exists in the database
    const existingUser: AuthDto = await this.prisma.user.findUnique({
      where: {
        authId: profile.data.id,
      },
    });

    // If the user already exists, return the user object
    if (existingUser) {
      // console.log('User already exists');
      await this.prisma.user.update({
        where: {
          authId: profile.data.id,
        },
        data: {
          isKnown: true,
        },
      });
      return existingUser;
    }

    // If the user does not exist, create a new user in the database
    const newUser: AuthDto = await this.prisma.user.create({
      data: {
        authId: profile.data.id,
        username: profile.data.login,
        email: profile.data.email,
        avatar: profile.data.image.versions.small,
        status: 'ONLINE',
        isKnown: false,
      },
    });
    //
    // Return the newly created user object
    // console.log('User created');

    return newUser;
    } catch (err) {
      console.log("Error in strategy");
    }
  }
}
