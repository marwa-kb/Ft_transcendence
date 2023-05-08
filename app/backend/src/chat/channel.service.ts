import {
  Injectable,
} from '@nestjs/common';
import { CreateChannelDto } from './dto/createChannel.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JoinChannelDto } from './dto/joinChannel.dto';
import { Channel, ChannelUser, RoleType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

interface IChannelJoined {
  id: number;
  name: string;
  type: string;
  ownerId: number;
}
@Injectable()
export class ChannelService {
  constructor(private prisma: PrismaService) { }

  async joinGeneral(userId: number) {
    // check if channel already exists
    let channel: Channel = await this.getChannelByName('general');
    if (channel) {
      // check if user is already in channel
      let user: ChannelUser = await this.findUserInChannel(channel.id, userId);
      if (!user) {
        // add user in channel
        user = await this.prisma.channelUser.create({
          data: {
            channelId: channel.id,
            userId: userId,
          }
        })
      }
      else {
        return channel;
      }
    }
    else {
      // if channel does not exist yet, create channel and add user
      channel = await this.prisma.channel.create({
        data: {
          name: 'general',
          type: 'PUBLIC',
          users: {
            create: {
              userId: userId,
            }
          }
        }
      })
    }
    return channel;
  }

  async create(dto: CreateChannelDto) {
    if (!dto.name) {
      return 'No name provided';
    }
    // check if channel name is already taken
    const taken: Channel = await this.getChannelByName(dto.name);
    if (taken) {
      return 'Channel name already taken';
    }
    // create channel, set owner and add user
    let newChannel: Channel = await this.prisma.channel.create({
      data: {
        ...dto,
        users: {
          create: {
            user: {
              connect: {
                id: dto.ownerId,
              }
            },
            role: 'OWNER',
          },
        },
      }
    })
    if (dto.password) {
      // hash password before storing in db
      dto.password = await bcrypt.hash(dto.password, 10);
      newChannel = await this.setPassword(newChannel.id, dto.password);
    }
    return null;
  }

  async join(dto: JoinChannelDto) {
    // check if channel exists
    const channel: Channel = await this.getChannelByName(dto.channelName);
    if (!channel) {
      return { status: 1, response: 'No such channel' };
    }
    if (channel.type === 'DM') {
      return { status: 1, response: 'Cannot join this channel' };
    }
    // check if user is already registered in channel
    let user: ChannelUser = await this.findUserInChannel(channel.id, dto.userId);
    if (user) {
      // check if user is still in channel
      if (!user.hasLeft) {
        return { status: 2, response: null };
      }
    }
    // check if channel is protected by password
    if (channel.password) {
      if (!dto.password) {
        return { status: 1, response: 'Password required' };
      }
      else {
        const match: boolean = await bcrypt.compare(dto.password, channel.password);
        if (!match) {
          return { status: 1, response: 'Wrong password' };
        }
      }
    }
    if (user) {
      // check if user is banned
      if (user.banEnd > new Date()) {
        return { status: 1, response: 'You are banned from this channel' };
      }
      user = await this.setHasLeft(channel.id, dto.userId, false);
    }
    else {
      user = await this.prisma.channelUser.create({
        data: {
          channelId: channel.id,
          userId: dto.userId,
        },
      })
    }
    return { status: 3, response: null };
  }

  async leave(channelId: number, userId: number) {
    let user: ChannelUser = await this.findUserInChannel(channelId, userId);
    if (!user || (user && user.hasLeft)) {
      return { status: 1, response: null };
    }
    let res: number = 0;
    res = await this.checkOwnership(channelId, userId);
    // if user is not banned nor muted, delete it
    if (!user.hasLeft && user.banEnd < new Date() && user.muteEnd < new Date()) {
      user = await this.prisma.channelUser.delete({
        where: {
          channelId_userId: {
            channelId: channelId,
            userId: userId,
          },
        },
      })
    }
    else {
      // else just set hasLeft to true but keep track of the user
      user = await this.setHasLeft(channelId, userId, true);
    }
    await this.updateChannel(channelId);
    if (res) {
      return { status: 2, response: 'You are the new owner of this channel' };
    }
    return { status: 3, response: null };
  }

  // if user leaving is owner, give ownership before leaving
  async checkOwnership(channelId: number, userId: number) {
    const channel: Channel = await this.prisma.channel.findUnique({
      where: { id: channelId, },
    })
    if (channel.ownerId === userId) {
      let substitutes: ChannelUser[] = [];
      substitutes = await this.getChannelUsersByRole(channelId, 'ADMIN');
      if (substitutes.length === 0) {
        substitutes = await this.getChannelUsersByRole(channelId, 'USER');
      }
      if (substitutes.length === 0) {
        return 0;
      }

      let newOwner: ChannelUser = substitutes[0];
      substitutes.forEach(async sub => {
        if (sub.createdAt < newOwner.createdAt) {
          newOwner = sub;
        }
      })
      const update: Channel = await this.prisma.channel.update({
        where: {
          id: channelId,
        },
        data: {
          ownerId: newOwner.userId,
        },
      })
      newOwner = await this.setRole(channelId, newOwner.userId, 'OWNER');
      return 1;
    }
  }

  // if there is no user left in channel, delete it
  async updateChannel(channelId: number) {
    let usersLeft: ChannelUser[] = [];
    usersLeft = await this.prisma.channelUser.findMany({
      where: {
        channelId: channelId,
      },
    })
    let empty: boolean = true;
    if (usersLeft.length > 0) {
      usersLeft.forEach(async user => {
        if (!user.hasLeft) {
          empty = false;
        }
      })
    }
    if (empty) {
      const channel: Channel = await this.prisma.channel.delete({
        where: {
          id: channelId,
        }
      })
    }
  }

  async handlePassword(userId: number, channelId: number, password: string) {
    let channel: Channel = await this.getChannelById(channelId);
    if (!channel) {
      return 'No such channel';
    }
    const user: ChannelUser = await this.findUserInChannel(channelId, userId);
    if (!user) {
      return 'User not in channel';
    }
    if (user.role === 'OWNER') {
      // if there is a password set already, unset it
      if (channel.password && !password) {
        channel = await this.setPassword(channelId, null);
        return 'Password unset';
      }
      // if front sends a password, either set a password or update the old one
      if (password) {
        // hash new password before storing in db
        password = await bcrypt.hash(password, 10);
        channel = await this.setPassword(channelId, password);
        return 'Password set';
      }
      if (!channel.password && !password) {
        return 'No password set'
      }
    }
    return 'You are not allowed to configure password';
  }

  async handleAdmin(ownerId: number, channelId: number, userId: number) {
    let channel: Channel = await this.getChannelById(channelId);
    if (!channel) {
      return { status: 1, response: 'No such channel' };
    }
    if (channel.ownerId === ownerId) {
      let user: ChannelUser = await this.findUserInChannel(channelId, userId);
      if (!user) {
        return { status: 1, response: 'User not in channel' };
      }
      // if already admin, change role to user
      if (user.role === 'ADMIN') {
        user = await this.setRole(channelId, userId, 'USER');
        return { status: 2, response: 'Administrator rights revoked' };
      }
      // else give admin role
      user = await this.setRole(channelId, userId, 'ADMIN');
      return { status: 2, response: 'Administrator rights granted' };
    }
    return { status: 1, response: 'You are not the owner of this channel' };
  }

  async kickUser(userId: number, channelId: number, toKickId: number) {
    // check both users are in the same channel (needed or not?)
    const user: ChannelUser = await this.findUserInChannel(channelId, userId);
    let toKick: ChannelUser = await this.findUserInChannel(channelId, toKickId);
    if (!user || !toKick) {
      return null;
    }
    if (user.role === 'USER') {
      return 'You do not have the rights to kick a user';
    }
    if (user.role === 'ADMIN' && toKick.role === 'ADMIN') {
      return 'You cannot kick another admin';
    }
    if (user.role === 'OWNER' || user.role === 'ADMIN') {
      if (toKick.role === 'OWNER') {
        return 'You cannot kick the channel owner';
      }
      // check if user is banned or muted
      // ban check should not be needed, if user is banned, he is not in channel
      if (toKick.banEnd < new Date() && toKick.muteEnd < new Date()) {
        toKick = await this.prisma.channelUser.delete({
          where: {
            channelId_userId: {
              channelId: channelId,
              userId: toKickId,
            },
          },
        })
      }
      else {
        // if user is banned or muted, set hasLeft to true but keep track of the user
        toKick = await this.setHasLeft(channelId, toKickId, true);
      }
    }
    return null;
  }

  async banUser(userId: number, channelId: number, toBanId: number) {
    // check both users are in the same channel (needed or not?)
    const user: ChannelUser = await this.findUserInChannel(channelId, userId);
    let toBan: ChannelUser = await this.findUserInChannel(channelId, toBanId);
    if (!user || !toBan) {
      return null;
    }
    if (user.role === 'USER') {
      return 'You do not have the rights to ban a user';
    }
    if (user.role === 'ADMIN' && toBan.role === 'ADMIN') {
      return 'You cannot ban another admin';
    }
    if (user.role === 'OWNER' || user.role === 'ADMIN') {
      if (toBan.role === 'OWNER') {
        return 'You cannot ban the channel owner';
      }
      // update ban end
      let banUpdate = new Date();
      banUpdate.setTime(banUpdate.getTime() + 2 * 60000);
      toBan = await this.prisma.channelUser.update({
        where: {
          channelId_userId: {
            channelId: channelId,
            userId: toBanId,
          },
        },
        data: {
          hasLeft: true,
          banEnd: banUpdate,
        }
      })
    }
    return null;
  }

  async muteUser(userId: number, channelId: number, toMuteId: number) {
    // check both users are in the same channel (needed or not?)
    const user: ChannelUser = await this.findUserInChannel(channelId, userId);
    let toMute: ChannelUser = await this.findUserInChannel(channelId, toMuteId);
    if (!user || !toMute) {
      return; // check what to send
    }
    if (user.role === 'USER') {
      return 'You do not have the rights to mute a user';
    }
    if (user.role === 'ADMIN' && toMute.role === 'ADMIN') {
      return 'You cannot mute another admin';
    }
    if (user.role === 'OWNER' || user.role === 'ADMIN') {
      if (toMute.role === 'OWNER') {
        return 'You cannot mute the channel owner';
      }
      // update mute end
      let muteUpdate = new Date();
      muteUpdate.setTime(muteUpdate.getTime() + 2 * 60000);
      toMute = await this.prisma.channelUser.update({
        where: {
          channelId_userId: {
            channelId: channelId,
            userId: toMuteId,
          },
        },
        data: {
          muteEnd: muteUpdate,
        }
      })
    }
    return null; // maybe send message to user who got muted
  }

  async setPassword(channelId: number, password: string) {
    const channel: Channel = await this.prisma.channel.update({
      where: {
        id: channelId,
      },
      data: {
        password: password,
      },
    })
    return channel;
  }

  async setHasLeft(channelId: number, userId: number, value: boolean) {
    const user: ChannelUser = await this.prisma.channelUser.update({
      where: {
        channelId_userId: {
          channelId: channelId,
          userId: userId,
        },
      },
      data: {
        hasLeft: value,
      },
    })
    return user;
  }

  async setRole(channelId: number, userId: number, role: RoleType) {
    const user: ChannelUser = await this.prisma.channelUser.update({
      where: {
        channelId_userId: {
          channelId: channelId,
          userId: userId,
        },
      },
      data: {
        role: role,
      },
    })
    return user;
  }

  async getChannelByName(name: string) {
    const channel: Channel = await this.prisma.channel.findUnique({
      where: { name: name },
    })
    return channel;
  }

  async getChannelById(id: number) {
    const channel: Channel = await this.prisma.channel.findUnique({
      where: { id: id, },
    })
    return channel;
  }

  async getPublicChannels() {
    const channels: { id: number, name: string }[] = await this.prisma.channel.findMany({
      where: {
        type: 'PUBLIC',
      },
      select: {
        id: true,
        name: true,
        password: false,
      },
    });
    return channels;
  }

  // get all channels the user has joined
  async getChannelsJoined(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        channelsJoined: {
          include: {
            channel: {
              select: {
                id: true,
                name: true,
                type: true,
                password: false,
                ownerId: true,
              },
            },
          },
          where: {
            hasLeft: false,
          }
        },
      },
    })
    if (!user) {
      return;
    }
    const userChannels = user.channelsJoined;
    let channelsJoined: IChannelJoined[] = [];
    userChannels.forEach(async user => {
      if (!user.hasLeft && user.channel.type !== 'DM') {
        channelsJoined.push(user.channel);
      }
    })
    if (channelsJoined.length > 0) {
      return channelsJoined;
    }
  }

  async findUserInChannel(channelId: number, userId: number) {
    const user: ChannelUser = await this.prisma.channelUser.findUnique({
      where: {
        channelId_userId: {
          channelId: channelId,
          userId: userId,
        },
      },
    })
    return user;
  }

  async getChannelUsersByRole(channelId: number, role: RoleType) {
    const users: ChannelUser[] = await this.prisma.channelUser.findMany({
      where: {
        channelId: channelId,
        role: role,
      },
    })
    return users;
  }

  async getChannelUsers(userId: number, channelId: number) {
    const users = await this.prisma.channelUser.findMany({
      where: {
        channelId: channelId,
        hasLeft: false,
        user: {
          status: {
            not: 'OFFLINE',
          },
        },
      },
      select: {
        userId: true,
        role: true,
        user: {
          select: {
            status: true,
            username: true,
            usersBlocked: true,
          },
        },
      },
    })
    const channelUsers = users;
    return this.filterUsersBlocked(channelUsers, userId);
  }

  filterUsersBlocked(channelUsers: any[], userId: number) {
    const updatedChannelUsers: any[] = [];
    channelUsers.forEach(user => {
      let isBlocked: boolean = false;
      for (let value of user.user.usersBlocked) {
        if (value === userId) {
          isBlocked = true;
          break;
        }
      }
      if (isBlocked === false) {
        updatedChannelUsers.push(user);
      }
    })
    updatedChannelUsers.sort((user1, user2) =>
      user1.user.username.toLowerCase() > user2.user.username.toLowerCase() ? 1 : -1);
    return updatedChannelUsers;
  }

  async startPrivateConvo(userId1: number, userId2: number) {
    const name = '#dm' + userId1 + userId2;
    const convo = await this.prisma.channel.create({
      data: {
        name: name,
        type: 'DM',
        users: {
          createMany: {
            data: [{ userId: userId1, }, { userId: userId2, },],
          },
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        password: false,
        ownerId: false,
        users: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                status: true,
              },
            },
          },
        },
      },
    })
    return convo;
  }

  async findPrivateConvo(userId1: number, userId2: number) {
    const convo = await this.prisma.channel.findFirst({
      where: {
        type: 'DM',
        users: {
          every: {
            userId: {
              in: [userId1, userId2],
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        password: false,
        ownerId: false,
        users: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                status: true,
              },
            },
          },
        },
      },
    })
    return convo;
  }

  async findPrivateConvoById(id: number) {
    const convo = await this.prisma.channel.findFirst({
      where: {
        id: id,
        type: 'DM',
      },
      select: {
        id: true,
        name: true,
        type: true,
        password: false,
        ownerId: false,
        users: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                status: true,
              },
            },
          },
        },
      },
    })
    return convo;
  }

  async getPrivateConvo(userId1: number) {
    const convo = await this.prisma.channel.findMany({
      where: {
        type: 'DM',
        users: {
          some: {
            userId: {
              in: [userId1],
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        password: false,
        ownerId: false,
        users: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                status: true,
              },
            },
          },
        },
      },
    })
    return convo;
  }
}
