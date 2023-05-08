import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { GameService } from './game.service';

@Module({
  controllers: [GameController],
  providers: [
    GameGateway,
    UserService,
    PrismaService,
    GameService,
  ],
})
export class GameModule {}
