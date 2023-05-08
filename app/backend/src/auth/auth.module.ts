import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  JwtStrategy,
  Jwt2faStrategy,
} from './strategy';
import { FortyTwoStrategy } from './strategy/ft.strategy';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    JwtModule.register({}),
    PassportModule.register({
      defaultStrategy: '42',
      strategies: [FortyTwoStrategy],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    FortyTwoStrategy,
    JwtStrategy,
    Jwt2faStrategy,
  ],
})
export class AuthModule {}
