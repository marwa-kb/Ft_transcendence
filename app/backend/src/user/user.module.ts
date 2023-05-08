import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { AppService } from '../app.service';
import { UserService } from './user.service';
import { GameService } from 'src/game/game.service';
// import { UserGateway } from './user.gateway';

@Module({
  controllers: [UserController],
  // providers: [UserService, UserGateway],
  providers: [UserService, GameService],
  exports: [UserService],
})
export class UserModule { }
