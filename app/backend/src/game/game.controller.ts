import {
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Controller('game')
export class GameController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // @Post()
  // async createGame() {}
  // @Get(':login')
  // async getGameByLogin() {}

  // @Get(':id')
  // async getGameById() {}
}
