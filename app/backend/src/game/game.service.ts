import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { GameDto } from './dto';

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService, private readonly userService: UserService) {}

  async createGame(
    nameLP: string,
    nameRP: string,
    socketLP: string,
    socketRP: string,
    authIdLP: number,
    authIdRP: number,
  ) {
    try {
      const game: GameDto = await this.prisma.game.create({
        data: {
          leftPlayerName: nameLP,
          rightPlayerName: nameRP,
          leftPlayerSocket: socketLP,
          rightPlayerSocket: socketRP,
          leftPlayerId: authIdLP,
          rightPlayerId: authIdRP,
        },
      });
      return game;
    } catch (err) {
      console.log("Prisma couldn't create a game, returning..");
    }
  }

  async getGameById(id: number): Promise<GameDto> {
    try {
      const game: GameDto = await this.prisma.game.findUnique({
        where: {
          id: id,
        },
      });
      return game;
    } catch (error) {
      console.log("Prisma couldn't get Game by id %d, returning..", id);
    }
  }

  async findLastGame(authId: number) {
    try {
      const game = await this.prisma.game.findMany({
        where: {
          OR: [{ leftPlayerId: authId }, { rightPlayerId: authId }],
        },
        orderBy: { createAt: 'desc' },
        take: 1,
      });
      return game;
    } catch (err) {
      console.log("Prisma couldn't find last game of user %d, returning..", authId);
    }
  }

  async updateGameDB(gameId: number, game: GameDto): Promise<GameDto> {
    try {
      game = await this.prisma.game.update({
        where: { id: gameId },
        data: game,
      });
      return game;
    } catch (err) {
      console.log("Prisma couldn't update game %d, returning..", gameId);
    }
  }

  async updateScore(gameId: number, scoreLP: number, scoreRP: number, limit: number) {
    if (scoreRP > limit || scoreLP > limit) return;
    const game: GameDto = await this.getGameById(gameId);
    if (!game) return;

    // console.log({
    //   scoreLP: scoreLP,
    //   scoreRP: scoreRP,
    //   gameLP: game.scoreLeftPlayer,
    //   gameRP: game.scoreRightPlayer,
    // });
    game.scoreLeftPlayer = scoreLP;
    game.scoreRightPlayer = scoreRP;
    await this.updateGameDB(gameId, game);
    return game;
  }

  async endMatchByScore(
    gameId: number,
    scoreLP: number,
    scoreRP: number,
    scoreLimit: number,
  ): Promise<GameDto> {
    const game: GameDto = await this.getGameById(gameId);
    if (!game) return;
    if (scoreLP === scoreLimit) {
      game.winnerId = game.leftPlayerId;
      game.loserId = game.rightPlayerId;
      game.isFinished = true;
      await this.updateGameDB(gameId, game);
    } else if (scoreRP === scoreLimit) {
      game.winnerId = game.rightPlayerId;
      game.loserId = game.leftPlayerId;
      game.isFinished = true;
      await this.updateGameDB(gameId, game);
    }
    return game;
  }
  async endMatchWinner(winnerId: number, gameId: number): Promise<void> {
    const game: GameDto = await this.getGameById(gameId);
    if (!game) return;
    game.winnerId = winnerId;
    game.hasLeft = true;
    game.isFinished = true;
    await this.userService.addWin(game.winnerId);
    await this.updateGameDB(gameId, game);
  }

  async endMatchLoser(loserId: number, gameId: number): Promise<void> {
    const game: GameDto = await this.getGameById(gameId);
    if (!game) return;
    game.loserId = loserId;
    game.hasLeft = true;
    game.isFinished = true;
    await this.userService.addLose(game.loserId);
    await this.updateGameDB(gameId, game);
  }

  async handleLeave(
    game: GameDto,
    payload: {
      userAuthId: number;
      gameId: string;
    },
  ) {
    if (game.winnerId === null && game.loserId === null) {
      if (game.leftPlayerId === payload.userAuthId) {
        // console.log({
          // msg: '@handleLeave() : LeftPlayer quit',
          // leftPlayer: payload.userAuthId,
          // rightPlayer: game.rightPlayerId,
          // gameId: payload.gameId,
        // });
        await this.endMatchWinner(game.rightPlayerId, Number(payload.gameId));
        await this.endMatchLoser(payload.userAuthId, Number(payload.gameId));
      } else if (game.rightPlayerId === payload.userAuthId) {
        // console.log({
          // msg: '@handleLeave() : RightPlayer quit',
          // leftPlayer: game.leftPlayerId,
          // rightPlayer: payload.userAuthId,
          // gameId: payload.gameId,
        // });
        await this.endMatchWinner(game.leftPlayerId, Number(payload.gameId));
        await this.endMatchLoser(payload.userAuthId, Number(payload.gameId));
      }
    }
  }

  async gameFinished(gameId: number) {
    try {
      await this.prisma.game.update({
        where: {
          id: gameId,
        },
        data: {
          isFinished: true,
        },
      });
    } catch (err) {
      console.log("Prisma couldn't change Game id %d field isFinished, returning..", gameId);
    }
  }

  async checkDuplicateUser(players: Map<string, number>, userAuthId: number) {
    // console.log(players);
    const authIdArray = Array.from(players.values());
    const count = authIdArray.filter((value) => value === userAuthId).length;
    return count >= 2;
  }
}
