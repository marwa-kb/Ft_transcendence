import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MessageDto } from './dto/message.dto';
import { UserService } from 'src/user/user.service';
import { Message, Status, User } from '@prisma/client';

interface IUser {
  id: number;
  username: string;
  status: Status;
  usersBlocked: number[];
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService
  ) { }

  // async sendDirectMessage(dto: MessageDto) {
  //   const newMessage: Message = await this.prisma.message.create({
  //     data: {
  //       ...dto,
  //       users: [dto.fromId, dto.toId],
  //     },
  //   });
  //   const sender = await this.userService.updateDm(dto.fromId, dto.toId);
  //   const receiver = await this.userService.updateDm(dto.toId, dto.fromId);
  //   return newMessage;
  // }

  async sendMessage(dto: MessageDto) {
    const newMessage: Message = await this.prisma.message.create({
      data: {
        ...dto,
      }
    });
    return newMessage;
  }

  // async getDirectMessages(userId1: number, userId2: number) {
  //   const messages: Message[] = await this.prisma.message.findMany({
  //     where: {
  //       dm: true,
  //       users: {
  //         hasEvery: [userId1, userId2],
  //       },
  //     },
  //   })
  //   return messages;
  // }

  async getMessages(channelId: number) {
    const messages: Message[] = await this.prisma.message.findMany({
      where: {
        toId: channelId,
        // dm: false,
      },
      orderBy: {
        id: 'asc',
      },
    })
    return messages;
  }

  async updateUsername(userId: number) {
    const user = await this.userService.getUserById(userId);
    const messages = await this.prisma.message.updateMany({
      where: {
        fromId: userId,
      },
      data: {
        fromUsername: user.username,
      },
    })
  }

  // async getPrivateConvo(userId: number) {
  //   console.log('in private convo, userId: ' + userId);
  //   const user = await this.prisma.user.findUnique({
  //     where: {
  //       id: userId,
  //     },
  //     select: {
  //       dm: {
  //         select: {
  //           id: true,
  //           username: true,
  //         },
  //       },
  //     },
  //   })
  //   console.log('private convo: ' + user.dm);
  //   return user.dm;
  // }

  // block/unblock (maybe implement toggle button in front?)
  async blockUser(userId: number, toBlockId: number) {
    let user: User = await this.userService.getUserById(userId);
    const toBlock = this.userService.getUserById(toBlockId);
    if (!user || !toBlock) { // !user should not be possible
      return 'Cannot block user';
    }
    // check if user is already blocked
    const isBlocked: boolean = await this.userService.isBlocked(userId, toBlockId);
    if (isBlocked) {
      const usersBlocked: number[] = user.usersBlocked;
      // create new array without toBlockId
      let updatedUsersBlocked: number[] = usersBlocked.filter(function (x) { return x !== toBlockId });
      // replace userBlocked array with new array
      user = await this.userService.unblockUser(userId, updatedUsersBlocked);
      return 'User blocked';
    }
    else {
      // else just push toBlockId to add it to list of blocked users
      user = await this.userService.blockUser(userId, toBlockId);
      return 'User unblocked';
    }
  }

  async getOnlineUsers(userId: number) {
    const users: IUser[] = await this.prisma.user.findMany({
      where: {
        status: {
          not: 'OFFLINE',
        },
      },
      select: {
        id: true,
        username: true,
        status: true,
        usersBlocked: true,
      },
      orderBy: {
        username: 'asc',
      }
    })
    let updatedOnlineUsers: IUser[] = [];
    users.forEach(async user => {
      let isBlocked: boolean = false;
      for (let value of user.usersBlocked) {
        if (value === userId) {
          isBlocked = true;
          break;
        }
      }
      if (isBlocked === false) {
        updatedOnlineUsers.push(user);
      }
    })
    return updatedOnlineUsers;
  }
}
