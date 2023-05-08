import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { GameService } from './game.service';
import { GameDto } from './dto';
import { UserDto } from '../user/dto';
import { Status } from '@prisma/client';

export interface IUser {
  id: number;
  authId: number;
  username: string;
  status: Status;
  socketId: string;
}

export interface IInvite {
  inviter: IUser;
  invited: IUser;
}

enum GameStatus {
  MAP = 0,
  INIT = 1,
  PLAY = 2,
  WIN = 3,
  LOSE = 4,
  LEAVE = 5,
  FINISHED = 6,
}

@WebSocketGateway({
  // cors: 'http://localhost:3003',
  cors: {
    origin: `http://${process.env.APP_HOSTNAME_URL}:${process.env.FRONTEND_PORT}`,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
    private readonly gameService: GameService,
  ) {}

  @WebSocketServer() server: Server;

  private waitingQueue: IUser[] = [];
  private invitations: IInvite[] = [];
  private players = new Map<string, number>();
  private readonly logger: Logger = new Logger('GameGateway');

  /**
   *
   * CONNEXION SOCKET - SAVE PLAYERS IN MAP[]
   * ON DISCONNECT -> UPDATE USER DATABASE
   *
   */

  async handleConnection(client: Socket) {
    this.logger.log('Client connected with id ' + client.id);
    const userAuthId = client.handshake.auth.authId;
    if (!userAuthId) return;

    this.players.set(client.id, userAuthId);

    const index = this.waitingQueue.findIndex((user) => user.authId === userAuthId);
    if (index !== -1) {
      const { socketId } = this.waitingQueue[index];
      if (socketId !== client.id) return;
    } else if (await this.userService.checkStatus(userAuthId) === 'INGAME') {
      return;
    }

    await this.userService.setStatusWithauthId(userAuthId, 'ONLINE');
    this.server.emit('update', { toUpdate: 28 });
  }

  async handleDisconnect(client: Socket) {
    const userAuthId = client.handshake.auth.authId;
    if (!userAuthId) {
      return;
    }
    this.logger.log('Client disconnected with id ' + client.id);

    // if user received/sent invites and disconnect by refreshing the page -> erase all invitations.

    this.invitations = this.invitations.filter(
      (invitation) =>
        invitation.inviter.authId !== userAuthId && invitation.invited.authId !== userAuthId,
    );
    const game = await this.gameService.findLastGame(userAuthId);

    // if user in queue
    const index = this.waitingQueue.findIndex((user) => user.socketId === client.id);
    if (index !== -1) {
      const { socketId } = this.waitingQueue[index];
      if (socketId === client.id) {
        this.waitingQueue.splice(index, 1);
      }
    }

    const checkUser = await this.gameService.checkDuplicateUser(this.players, userAuthId);
    if (!checkUser) {
      await this.userService.setStatusWithauthId(userAuthId, 'OFFLINE');
      this.server.emit('update', { toUpdate: 28 });
    }

    // if user in game
    if (game[0] === undefined) {
      this.players.delete(client.id);
      return;
    } else if (
      game[0].isFinished ||
      (client.id !== game[0].leftPlayerSocket && client.id !== game[0].rightPlayerSocket)
    ) {
      this.players.delete(client.id);
      const roomName = '#game' + game[0].id;
      client.leave(roomName);
      this.players.delete(client.id);
      return;
    }
    if (game[0].winnerId === null && game[0].loserId === null) {
      if (userAuthId === game[0].leftPlayerId) {
        game[0].winnerId = game[0].rightPlayerId;
        game[0].loserId = game[0].leftPlayerId;
      } else {
        game[0].winnerId = game[0].leftPlayerId;
        game[0].loserId = game[0].rightPlayerId;
      }
      await this.userService.addWin(game[0].winnerId);
      await this.userService.addLose(game[0].loserId);

      try {
        await this.prisma.game.update({
          where: {
            id: game[0].id,
          },
          data: {
            winnerId: game[0].winnerId,
            loserId: game[0].loserId,
            isFinished: true,
            hasLeft: true,
          },
        });
      } catch (err) {
        console.log('Prisma err: ' + err);
      }
    }

    // has to be emitted to the one who didn't leave

    let socketWinner: string;

    const room = this.server.sockets.adapter.rooms.get('#game' + game[0].id);

    if (room) {
      room.forEach((socketId: string) => {
        socketWinner = socketId;
      });
    }

    const winner = await this.userService.getUserByAuthId(this.players.get(socketWinner));

    this.server.to('#user' + winner.id).emit('gameStatus', GameStatus.LEAVE);
    this.server.to('#user' + winner.id).emit('gameStatusSelect', GameStatus.LEAVE);

    const roomName = '#game' + game[0].id;
    client.leave(roomName);
    this.players.delete(client.id);
  }

  @SubscribeMessage('initGame')
  async initGame(client: Socket, payload: { userAuthId: number; gameId: string }) {
    const game = await this.gameService.getGameById(Number(payload.gameId));

    if (!game) {
      console.log('error init game, returning..');
      return;
    }
    const userLeft: UserDto = await this.userService.getUserByAuthId(game.leftPlayerId);

    const userRight: UserDto = await this.userService.getUserByAuthId(game.rightPlayerId);

    if (
      !game ||
      (game && game.isFinished) ||
      (game &&
        payload.userAuthId !== game.rightPlayerId &&
        payload.userAuthId !== game.leftPlayerId)
    ) {
      this.server.to(client.id).emit('initGame', { payload: -1 });
      return;
    }

    const newData = {
      gameId: game.id,
      leftPlayerId: game.leftPlayerId,
      rightPlayerId: game.rightPlayerId,
      scoreLeftPlayer: game.scoreLeftPlayer,
      scoreRightPlayer: game.scoreRightPlayer,
      nameLeftPlayer: userLeft.username,
      nameRightPlayer: userRight.username,
      winnerId: game.winnerId,
      loserId: game.loserId,
      isFinished: game.isFinished,
      hasLeft: game.hasLeft,
    };

    client.join('#game' + payload.gameId);
    // console.log(client.rooms);
    await this.userService.setStatus(userLeft.id, 'INGAME');
    await this.userService.setStatus(userRight.id, 'INGAME');
    this.server.emit('update', { toUpdate: 28 });
    this.server.to('#game' + payload.gameId).emit('initGame', newData);
  }

  @SubscribeMessage('checkGame')
  async checkGame(client: Socket, payload: { userAuthId: number; gameId: string }) {
    const game = await this.gameService.getGameById(Number(payload.gameId));

    const newData = {
      hasLeft: game.hasLeft,
      isFinished: game.isFinished,
      gameMode: game.gameMode,
    };

    this.server.to('#game' + payload.gameId).emit('checkGame', newData);
  }

  @SubscribeMessage('leaveGame')
  async leaveGame(
    client: Socket,
    payload: {
      userAuthId: number;
      gameId: string;
      gameStatus: number;
    },
  ) {
    const roomName = '#game' + payload.gameId;
    client.leave(roomName);

    const game: GameDto = await this.gameService.getGameById(Number(payload.gameId));
    if (!game) {
      return;
    } else if (game.isFinished) {
      try {
        await this.userService.setStatusWithauthId(payload.userAuthId, 'ONLINE');
      } catch (err) {
        console.log("Couldn't update user status to ONLINE in leaveGame");
      }
      this.server.emit('update', { toUpdate: 28 });
      return;
    }

    await this.gameService.handleLeave(game, payload);

    if (payload.gameStatus !== GameStatus.FINISHED) {
      try {
        await this.userService.setStatusWithauthId(payload.userAuthId, 'ONLINE');
        this.server.emit('update', { toUpdate: 28 });
      } catch (err) {
        console.log("Couldn't update user status to ONLINE in leaveGame");
      }
    }

    const room = this.server.sockets.adapter.rooms.get('#game' + game.id);

    let socketWinner: string;
    if (room) {
      room.forEach((socketId: string) => {
        socketWinner = socketId;
      });
    }

    // if (payload.userAuthId === game.leftPlayerId) {
    //   socketWinner = getKeyByValue(this.players, game.rightPlayerId);
    // } else if (payload.userAuthId === game.rightPlayerId) {
    //   socketWinner = getKeyByValue(this.players, game.leftPlayerId);
    // }

    this.server.to(socketWinner).emit('gameStatus', GameStatus.LEAVE);
    this.server.to(socketWinner).emit('gameStatusSelect', GameStatus.LEAVE);
  }

  @SubscribeMessage('leaveQueue')
  async leaveQueue(client: Socket, payload: { userAuthId: number }) {
    const { userAuthId } = payload;
    const index = this.waitingQueue.findIndex((user) => user.socketId === client.id);

    if (index !== -1) {
      const { socketId } = this.waitingQueue[index];

      if (socketId === client.id) {
        await this.userService.setStatusWithauthId(userAuthId, 'ONLINE');
        this.server.emit('update', { toUpdate: 28 });
        this.waitingQueue.splice(index, 1);
      }
    }
  }

  @SubscribeMessage('mapSelect')
  async mapSelect(
    client: Socket,
    payload: {
      userAuthId: number;
      gameId: string;
    },
  ) {
    let game: GameDto = await this.gameService.getGameById(Number(payload.gameId));
    if (!game) return;

    if (payload.userAuthId === game.leftPlayerId) {
      try {
        game = await this.prisma.game.update({
          where: {
            id: Number(payload.gameId),
          },
          data: {
            leftPlayerMap: true,
          },
        });
      } catch (err) {
        console.log("Prisma couldn't update user leftPlayerMap, returning..");
      }
    } else if (payload.userAuthId === game.rightPlayerId) {
      try {
        game = await this.prisma.game.update({
          where: {
            id: Number(payload.gameId),
          },
          data: {
            rightPlayerMap: true,
          },
        });
      } catch (err) {
        console.log("Prisma couldn't update user rightPlayerMap, returning..");
      }
    }

    let socketWinner: string;

    if (payload.userAuthId === game.leftPlayerId) {
      socketWinner = getKeyByValue(this.players, game.rightPlayerId);
    } else if (payload.userAuthId === game.rightPlayerId) {
      socketWinner = getKeyByValue(this.players, game.leftPlayerId);
    }
    if (game.hasLeft === true) {
      this.server.to(socketWinner).emit('gameStatus', GameStatus.LEAVE);
    }

    if (game.leftPlayerMap === true && game.rightPlayerMap === true) {
      this.server.to('#game' + payload.gameId).emit('mapSelected', true);
    }
  }

  @SubscribeMessage('gameMode')
  async gameModeSelect(
    client: Socket,
    payload: {
      userAuthId: number;
      gameId: string;
      gameMode: string;
    },
  ) {
    let game: GameDto = await this.gameService.getGameById(Number(payload.gameId));
    if (!game) return;
    if (payload.userAuthId === game.leftPlayerId) {
      try {
        game = await this.prisma.game.update({
          where: {
            id: Number(payload.gameId),
          },
          data: {
            leftPlayerMode: payload.gameMode,
          },
        });
      } catch (err) {
        console.log("Prisma couldn't update user leftPlayerMode, returning..");
      }
    } else if (payload.userAuthId === game.rightPlayerId) {
      try {
        game = await this.prisma.game.update({
          where: {
            id: Number(payload.gameId),
          },
          data: {
            rightPlayerMode: payload.gameMode,
          },
        });
      } catch (err) {
        console.log("Prisma couldn't update user rightPlayerMode, returning..");
      }
    }

    let socketWinner: string;

    if (payload.userAuthId === game.leftPlayerId) {
      socketWinner = getKeyByValue(this.players, game.rightPlayerId);
    } else if (payload.userAuthId === game.rightPlayerId) {
      socketWinner = getKeyByValue(this.players, game.leftPlayerId);
    }
    if (game.hasLeft === true) {
      this.server.to(socketWinner).emit('gameStatus', GameStatus.LEAVE);
    }

    if (game.leftPlayerMode === game.rightPlayerMode) game.gameMode = game.leftPlayerMode;
    else {
      const gameModes = ['normal', 'hard'];
      game.gameMode = gameModes[Math.floor(Math.random() * gameModes.length)];
    }

    if (game.gameMode === 'normal') game.initialBallSpeed = 40;
    else game.initialBallSpeed = 50;

    await this.gameService.updateGameDB(Number(payload.gameId), game);

    const newData: any = {
      readyCheck: true,
      gameMode: game.gameMode,
    };
    if (game.leftPlayerMode && game.rightPlayerMode) {
      this.server.to('#game' + payload.gameId).emit('modeSelected', newData);
    }
  }

  @SubscribeMessage('updateUser')
  async updateUser(
    client: Socket,
    payload: {
      userAuthId: number;
      gameId: string;
      gameStatus: number;
    },
  ) {
    const game = await this.gameService.getGameById(Number(payload.gameId));
    if (!game) {
      // console.log('bug');
      return;
    }

    if (game.hasLeft === false && payload.gameStatus !== GameStatus.INIT) {
      if (game.winnerId === payload.userAuthId) {
        await this.userService.addWin(game.winnerId);
      } else if (game.loserId === payload.userAuthId) {
        await this.userService.addLose(game.loserId);
      }
    }
  }

  /**
   *
   * GAME LOGIC WITH BALL, PADDLE
   *
   */

  @SubscribeMessage('paddleMove')
  async handlePaddleMovement(client: Socket, payload: any) {
    const paddleData: any = payload[0];
    const player: any = payload[1];
    // paddle up
    if (
      paddleData.key === 'ArrowUp' ||
      paddleData.key === 'w' ||
      paddleData.key === 'W' ||
      paddleData.key === 'z' ||
      paddleData.key === 'Z'
    ) {
      if (player === paddleData.leftPlayerId) {
        paddleData.leftPaddleY -= 10;
      } else {
        paddleData.rightPaddleY -= 10;
      }
      if (paddleData.leftPaddleY < 0) {
        paddleData.leftPaddleY = 0;
      } else if (paddleData.rightPaddleY < 0) {
        paddleData.rightPaddleY = 0;
      }
    }

    //paddle down
    if (paddleData.key === 'ArrowDown' || paddleData.key === 's' || paddleData.key === 'S') {
      if (player === paddleData.leftPlayerId) {
        paddleData.leftPaddleY += 10;
      } else {
        paddleData.rightPaddleY += 10;
      }
      if (paddleData.paddleH + paddleData.leftPaddleY > paddleData.height) {
        paddleData.leftPaddleY = paddleData.height - paddleData.paddleH;
      } else if (paddleData.paddleH + paddleData.rightPaddleY > paddleData.height) {
        paddleData.rightPaddleY = paddleData.height - paddleData.paddleH;
      }
    }

    this.server.to('#game' + paddleData.gameId.toString()).emit('paddleUpdate', paddleData);
  }

  @SubscribeMessage('ballMove')
  async ballMove(client: Socket, payload: any) {
    const game: GameDto = await this.gameService.getGameById(payload[0].gameId);

    const gameData: any = payload[0];

    // collision ball with top/bot border
    if (
      gameData.ballY - gameData.ballRadius < 0 ||
      gameData.ballY + gameData.ballRadius > gameData.height
    )
      gameData.ballDirection.y *= -1;
    // collision left paddle
    else if (
      gameData.ballX - gameData.ballRadius < gameData.leftPaddleX + gameData.paddleW &&
      gameData.ballY + gameData.ballRadius > gameData.leftPaddleY &&
      gameData.ballY - gameData.ballRadius < gameData.leftPaddleY + gameData.paddleH &&
      gameData.ballDirection.x < 0
    ) {
      if (gameData.ballY < gameData.leftPaddleY + 5 && gameData.ballDirection.y > 0) {
        gameData.ballDirection.y *= -1;
      } else if (
        gameData.ballY > gameData.leftPaddleY + gameData.paddleH - 5 &&
        gameData.ballDirection.y < 0
      ) {
        gameData.ballDirection.y *= -1;
      }
      gameData.ballDirection.x *= -1;
      gameData.ballSpeed += 15 * Math.round(Math.sqrt(gameData.ballSpeed / 40));
    }

    // collision ball with right paddle
    else if (
      gameData.ballX + gameData.ballRadius > gameData.rightPaddleX &&
      gameData.ballY + gameData.ballRadius > gameData.rightPaddleY &&
      gameData.ballY - gameData.ballRadius < gameData.rightPaddleY + gameData.paddleH &&
      gameData.ballDirection.x > 0
    ) {
      if (gameData.ballY < gameData.rightPaddleY + 5 && gameData.ballDirection.y > 0) {
        gameData.ballDirection.y *= -1;
      } else if (
        gameData.ballY > gameData.rightPaddleY + gameData.paddleH - 5 &&
        gameData.ballDirection.y < 0
      ) {
        gameData.ballDirection.y *= -1;
      }
      gameData.ballDirection.x *= -1;
      gameData.ballSpeed += 15 * Math.round(Math.sqrt(gameData.ballSpeed / 40));
    }

    // gameFinished
    if (
      gameData.scoreLeftPlayer === gameData.scoreLimit ||
      gameData.scoreRightPlayer === gameData.scoreLimit
    ) {
      const game = await this.gameService.endMatchByScore(
        gameData.gameId,
        gameData.scoreLeftPlayer,
        gameData.scoreRightPlayer,
        gameData.scoreLimit,
      );

      const winner = await this.userService.getUserByAuthId(game.winnerId);
      // console.log('winnerID : ' + winner.id);
      const loser = await this.userService.getUserByAuthId(game.loserId);
      // console.log('loserID : ' + loser.id);

      this.server.to('#user' + winner.id).emit('gameStatus', GameStatus.WIN);
      this.server.to('#user' + loser.id).emit('gameStatus', GameStatus.LOSE);
    }

    if (
      gameData.ballX + gameData.ballRadius > gameData.width ||
      gameData.ballX - gameData.ballRadius < 0
    ) {
      if (gameData.ballX + gameData.ballRadius > gameData.width) {
        // player left scores
        gameData.scoreLeftPlayer += 1;
      } else if (gameData.ballX - gameData.ballRadius < 0) {
        // player right scores
        gameData.scoreRightPlayer += 1;
      }
      gameData.ballSpeed = game.initialBallSpeed;
      reset(gameData);
      if (
        gameData.scoreRightPlayer !== gameData.scoreLimit ||
        gameData.scoreLeftPlayer !== gameData.scoreLimit
      ) {
        this.server.to('#game' + gameData.gameId.toString()).emit('gameStatus', GameStatus.INIT);
      }
      setTimeout(async () => {
        await this.gameService.updateScore(
          Number(gameData.gameId),
          gameData.scoreLeftPlayer,
          gameData.scoreRightPlayer,
          gameData.scoreLimit,
        );
      }, 100);
      this.server.to('#game' + gameData.gameId.toString()).emit('ballUpdate', gameData);
      this.server.to('#game' + gameData.gameId.toString()).emit('scoreUpdate', gameData);
      return;
    }
    // ball new positions for client every frames
    gameData.ballVelocity = 0.125 * gameData.ballSpeed;
    gameData.ballX += gameData.ballDirection.x * gameData.ballVelocity;
    gameData.ballY += gameData.ballDirection.y * gameData.ballVelocity;

    this.server.to('#game' + gameData.gameId.toString()).emit('ballUpdate', gameData);
  }

  @SubscribeMessage('gameStart')
  gameStart(client: Socket, payload: any) {
    if (payload[0].gameStatus === GameStatus.INIT) {
      const ballDirection = generateRandomBallDirection();
      payload[0].ballDirection = ballDirection;
      payload[0].gameStatus = GameStatus.PLAY;

      this.server.to('#game' + payload[0].gameId.toString()).emit('gameStart', payload[0]);

      this.server.to('#game' + payload[0].gameId.toString()).emit('gameStatus', GameStatus.PLAY);
    }
  }

  /**
   * MATCHMAKING LOGIC
   */
  @SubscribeMessage('join-room')
  async joinRoom(client: Socket, payload: { userId: number; userAuthId: number }) {
    const user: IUser = {
      id: payload.userId,
      authId: payload.userAuthId,
      username: await this.userService.getUserNameByAuthId(payload.userAuthId),
      status: await this.userService.checkStatus(payload.userAuthId),
      socketId: client.id,
    };

    if (
      (await this.userService.checkStatus(user.authId)) === 'INGAME' ||
      (await this.userService.checkStatus(user.authId)) === 'INQUEUE'
    ) {
      // console.log('This player is already in game or in queue');
      this.server.to(client.id).emit('error');
      return;
    }

    await this.userService.setStatus(payload.userId, 'INQUEUE');
    this.server.emit('update', { toUpdate: 28 });
    if (this.waitingQueue.some((inQueue) => inQueue.authId === payload.userAuthId)) {
      // console.log('User already in waitingQueue');
      return;
    }

    this.waitingQueue.push(user);

    // Try to find a match
    if (this.waitingQueue.length < 2) {
      return;
    }

    // Remove the first two users from the waiting queue
    const [user1, user2] = this.waitingQueue.splice(0, 2);

    // Create a game in the database
    // await this.prisma.game
    //   .create({
    //     data: {
    //       leftPlayerName: user1.username,
    //       rightPlayerName: user2.username,
    //       leftPlayerId: user1.authId,
    //       rightPlayerId: user2.authId,
    //     },
    //   })
    await this.gameService
      .createGame(
        user1.username,
        user2.username,
        user1.socketId,
        user2.socketId,
        user1.authId,
        user2.authId,
      )
      .then(async (game) => {
        // console.log(`msg: '@joinRoom:  : Game ${game.id} created`);

        // await this.userService.setStatus(user1.id, 'INGAME');
        // await this.userService.setStatus(user2.id, 'INGAME');
        // this.server.emit('update', { toUpdate: 28 });

        this.server.to(user1.socketId).to(user2.socketId).emit('match-found', {
          gameId: game.id,
        });
      });
  }

  @SubscribeMessage('gameFinished')
  async gameFinished(client: Socket, payload: { gameId: number }) {
    await this.gameService.gameFinished(payload.gameId);
  }

  /**
          INVITE
   */

  @SubscribeMessage('inviteInit')
  async inviteInit(client: Socket, payload: any) {
    // console.log({
    //   Msg: 'event received',
    //   payload: payload,
    // });

    const inviterTmp = await this.userService.getUserByAuthId(this.players.get(client.id));

    const invitedTmp = await this.userService.getUserById(Number(payload));

    if (!invitedTmp || !inviterTmp) return;

    const inviter: IUser = {
      id: inviterTmp.id,
      authId: inviterTmp.authId,
      username: inviterTmp.username,
      status: await this.userService.checkStatus(inviterTmp.authId),
      socketId: client.id,
    };

    const invited: IUser = {
      id: invitedTmp.id,
      authId: invitedTmp.authId,
      username: invitedTmp.username,
      status: await this.userService.checkStatus(invitedTmp.authId),
      socketId: getKeyByValue(this.players, invitedTmp.authId),
    };

    // console.log({ invited: invited });
    // console.log({ inviter: inviter });

    let invitedBlockList;
    try {
      invitedBlockList = await this.prisma.user.findUnique({
        where: {
          authId: invited.authId,
        },
        select: {
          usersBlocked: true,
        },
      });
    } catch (err) {
      console.log('Prisma err ' + err);
    }

    // check status of the one who received the invite
    const statusInvited = await this.userService.checkStatus(invited.authId);

    const invitationTmp: IInvite = { inviter, invited };

    // if invited not found
    // if invited in game/inqueue/off
    // if invited already received invite from inviter
    // if invited player invites himself
    // if inviterId is in invitedBlockList[]
    if (
      !invited.username ||
      statusInvited !== 'ONLINE' ||
      this.invitations.some(
        (invite) =>
          invite.invited.authId === invited.authId && invite.inviter.authId === inviter.authId,
      ) ||
      inviter.authId === invited.authId ||
      invitedBlockList.usersBlocked.includes(inviter.id)
    ) {
      // console.log('User busy, spammed, same user, not found, user blocked');
      return;
    } else {
      // if all good, save in invit[] + send ok to invited client
      this.invitations.push(invitationTmp);
      this.server.to(invited.socketId).emit('invitation', {
        inviterId: inviter.id,
        inviterName: inviter.username,
      });
    }
  }

  @SubscribeMessage('inviteAccepted')
  async inviteAccepted(client: Socket, payload: { invitedId: number; inviterId: number }) {
    // console.log('in invitedAccepted : ', payload);
    //
    // console.log(typeof payload.invitedId);
    // console.log(typeof payload.inviterId);

    // check which invitations[] cause invited can have many differents inviters + inviter can have many invited
    let goodInvitation: [IUser, IUser] | null = null;

    // console.log(this.invitations);

    for (const invite of this.invitations) {
      const inviter = invite.inviter;
      const invited = invite.invited;
      if (invited.id === payload.invitedId && inviter.id === payload.inviterId) {
        goodInvitation = [inviter, invited];
        break;
      }
    }

    // create game database : LP = inviter, RP = invited [x]
    if (goodInvitation) {
      // remove all pair containing the key: inviter
      this.invitations = this.invitations.filter(
        (invitation) => invitation.inviter.id !== payload.inviterId,
      );

      const game = await this.gameService.createGame(
        goodInvitation[0].username,
        goodInvitation[1].username,
        goodInvitation[0].socketId,
        goodInvitation[1].socketId,
        goodInvitation[0].authId,
        goodInvitation[1].authId,
      );

      // send back gameId -> client navigate to gameId url

      // console.log(goodInvitation[0], goodInvitation[1]);
      await this.userService.setStatus(goodInvitation[0].id, 'INGAME');
      await this.userService.setStatus(goodInvitation[1].id, 'INGAME');
      this.server.emit('update', { toUpdate: 28 });
      this.server
        .to(goodInvitation[0].socketId)
        .emit('inviteAccepted', { user: goodInvitation[0], gameId: game.id });
      this.server
        .to(goodInvitation[1].socketId)
        .emit('inviteAccepted', { user: goodInvitation[1], gameId: game.id });
    } else return;
  }

  @SubscribeMessage('inviteDeclined')
  async inviteDeclined(client: Socket, payload: { invitedId: number; inviterId: number }) {
    let goodInvitation: [IUser, IUser] | null = null;

    for (const invite of this.invitations) {
      const inviter = invite.inviter;
      const invited = invite.invited;
      goodInvitation = [inviter, invited];
      break;
    }

    if (goodInvitation) {
      this.invitations = this.invitations.filter((invitation) => {
        const { inviter, invited } = invitation;
        return inviter.id !== goodInvitation[0].id || invited.id !== goodInvitation[1].id;
      });
    }
    // no need to emit anything except if we want to show a notification to inviter that the invite got declined
    // i prefer to leave him pending
  }
}

function randomNumberBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function reset(gameData: any) {
  gameData.ballX = gameData.width / 2;
  gameData.ballY = gameData.height / 2;
  gameData.ballDirection = { x: 0, y: 0 };
}

function getKeyByValue(map: Map<string, number>, value: number): string | undefined {
  for (const [key, val] of map.entries()) {
    if (val === value) return key;
  }
  return undefined;
}
function generateRandomBallDirection(): { x: number; y: number } {
  let ballDirection = { x: 0, y: 0 };
  while (Math.abs(ballDirection.x) <= 0.2 || Math.abs(ballDirection.x) >= 0.9) {
    const ballVector = randomNumberBetween(0, 2 * Math.PI);
    ballDirection = {
      x: Math.cos(ballVector),
      y: Math.sin(ballVector),
    };
  }
  return ballDirection;
}
