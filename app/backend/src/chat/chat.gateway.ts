import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { ChatService } from './chat.service';
import { ChannelService } from './channel.service';
import { CreateChannelDto } from './dto/createChannel.dto';
import { MessageDto } from './dto/message.dto';
import { JoinChannelDto } from './dto/joinChannel.dto';
import { Channel, ChannelType, ChannelUser, Message, Status, User } from '@prisma/client';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';

interface IUser {
  id: number;
  username: string;
  status: Status;
  usersBlocked: number[];
}

interface IPrivateConvo {
  id: number;
  name: string;
  type: ChannelType;
  users: {
    user: {
      id: number;
      username: string;
      status: Status;
    };
  }[];
}

interface IResult {
  status: number;
  response: string;
}

@WebSocketGateway({
  cors: {
    origin: `http://${process.env.APP_HOSTNAME_URL}:${process.env.FRONTEND_PORT}`,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly userService: UserService,
    private readonly chatService: ChatService,
    private readonly channelService: ChannelService,
  ) { }

  private readonly logger: Logger = new Logger('ChatGateway');

  private readonly update = {
    channels: 1,
    publicChannels: 2,
    dm: 4,
    channelUsers: 8,
    onlineUsers: 16,
  };

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.logger.log('Initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      // check auth and disconnect client if needed
      const userAuthId = client.handshake.auth.authId;
      const user = await this.userService.getUserByAuthId(userAuthId);
      if (!user) {
        client.disconnect(true);
        return;
      }
      // user = await this.userService.setStatus(user.id, 'ONLINE');
      // this.logger.log(`Client ${client.id} connected`);
      client.data.user = user;

      // create room with user id to send them messages directly
      let roomName: string = '#user' + user.id;
      client.join(roomName);

      // add client to channel general if first connection
      const channelGeneral: Channel = await this.channelService.joinGeneral(user.id);

      // add user to all rooms joined (since user left all rooms on disconnection)
      const channels = await this.channelService.getChannelsJoined(user.id);
      channels.forEach(async channel => {
        roomName = '#channel' + channel.id;
        client.join(roomName);
        // this.logger.log(`Client ${client.id} joined ${roomName}`);
      });
      const convo = await this.channelService.getPrivateConvo(user.id);
      convo.forEach(async conv => {
        roomName = conv.name;
        client.join(roomName);
      });

      // emit event to let all users know they need to update users online
      this.server.emit('update', {
        toUpdate: this.update.onlineUsers | this.update.channelUsers | this.update.dm,
      });
    }
    catch (error) {
      // console.log('error in handleConnection: ' + error);
      this.logger.log('Error when handling connection');
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('disconnecting')
  async disconnecting(@ConnectedSocket() client: Socket) {
    try {
      if (client.data.user && client.data.user.id) {
        // client.data.user = await this.userService.setStatus(client.data.user.id, 'OFFLINE');
        // emit event to let all users know they need to update users online
        this.server.emit('update', {
          toUpdate: this.update.onlineUsers | this.update.channelUsers,
        });
      }
    }
    catch (error) {
      // console.log('error in disconnecting: ' + error);
      this.logger.log('Error when disconnecting');
    }
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(@ConnectedSocket() client: Socket, @MessageBody() dto: MessageDto) {
    try {
      let newMessage: Message = null;
      let isBlocked = false;

      if (dto.dm) {
        const privateConvo = await this.channelService.findPrivateConvoById(dto.toId);
        privateConvo.users.forEach(async user => {
          this.server.to('#user' + user.user.id).emit('update', { toUpdate: this.update.dm });
        });
        let toId = 0;
        if (privateConvo.users[0].user.id === dto.fromId) {
          toId = privateConvo.users[1].user.id;
        }
        else {
          toId = privateConvo.users[0].user.id;
        }
        // check if receiver is blocked by sender
        isBlocked = await this.userService.isBlocked(dto.fromId, toId);
        if (isBlocked) {
          client.emit('alert', 'You cannot send messages to that user: you blocked the user');
          return;
        }
        // check if sender is blocked by receiver
        isBlocked = await this.userService.isBlocked(toId, dto.fromId);
        if (isBlocked) {
          client.emit('alert', 'You cannot send messages to that user: you are blocked');
          return;
        }
        newMessage = await this.chatService.sendMessage(dto);
        this.server.to(privateConvo.name).emit('newMessage', newMessage);
      }
      else {
        const user: ChannelUser = await this.channelService.findUserInChannel(dto.toId, dto.fromId);
        if (!user) {
          client.emit('alert', 'You cannot send messages in that channel');
          return;
        }
        // define roomName and join room
        const roomName = '#channel' + dto.toId;
        client.join(roomName);
        // check if user is muted or not
        if (user.muteEnd > new Date()) {
          client.emit('alert', 'You cannot send messages in that channel: you are muted');
          return;
        }
        // if not muted, create message in db and send
        newMessage = await this.chatService.sendMessage(dto);
        this.server.to(roomName).emit('newMessage', newMessage);
      }
    }
    catch (error) {
      // console.log('error in sendMessage: ' + error);
      this.logger.log('Error: could not send message');
    }
  }

  @SubscribeMessage('getMessages')
  async getChannelMessage(@ConnectedSocket() client: Socket, @MessageBody() channelId: number) {
    try {
      const messages = await this.chatService.getMessages(channelId);
      return messages;
    }
    catch (error) {
      // console.log('error in getMessage: ' + error);
      this.logger.log('Error: could not retrieve messages');
    }
  }

  @SubscribeMessage('createChannel')
  async createChannel(@ConnectedSocket() client: Socket, @MessageBody() dto: CreateChannelDto) {
    try {
      const response: string = await this.channelService.create(dto);
      if (response) {
        client.emit('alert', response);
        return;
      }

      // define roomName and join room
      const newChannel = await this.channelService.getChannelByName(dto.name);
      const roomName: string = '#channel' + newChannel.id;
      client.join(roomName);

      // send event to let users know they need to update channels
      this.server.emit('update', {
        toUpdate: this.update.channels | this.update.publicChannels,
      });
      this.logger.log(`Client ${client.id} joined ${roomName}`);
      return newChannel;
    }
    catch (error) {
      // console.log('error in createChannel: ' + error);
      this.logger.log('Error: could not create channel');
    }
  }

  @SubscribeMessage('joinChannel')
  async joinChannel(@ConnectedSocket() client: Socket, @MessageBody() dto: JoinChannelDto) {
    try {
      // join channel (if possible)
      const response: IResult = await this.channelService.join(dto);
      if (response.status === 1) {
        client.emit('alert', response.response);
        return;
      }

      const channel: Channel = await this.channelService.getChannelByName(dto.channelName);
      if (response.status === 2) {
        return channel;
      }

      // define roomName
      const roomName: string = '#channel' + channel.id;

      // send event to user who joined to update their channels and channel members
      const user: User = await this.userService.getUserById(dto.userId);
      this.server.to('#user' + user.id).emit('update', {
        toUpdate: this.update.channelUsers | this.update.channels | this.update.publicChannels,
        channelId: channel.id,
      });

      // emit event to let users know they have to update channel users
      this.server.to(roomName).emit('update', {
        toUpdate: this.update.channelUsers | this.update.channels | this.update.publicChannels,
        channelId: channel.id,
      });
      client.join(roomName);
      this.server.to(roomName).emit('announcement', {
        announcement: `${user.username} joined this channel`,
        channelId: channel.id,
      });
      // this.logger.log(`Client ${client.id} joined ${roomName}`);
      return channel;
    }
    catch (error) {
      // console.log('error in joinChannel: ' + error);
      this.logger.log('Error: could not add user to channel');
    }
  }

  @SubscribeMessage('leaveChannel')
  async leaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { channelId: number; userId: number },
  ) {
    try {
      const result: IResult = await this.channelService.leave(dto.channelId, dto.userId);
      if (result.status === 1) {
        return;
      }

      let roomName = '#channel' + dto.channelId;
      client.leave(roomName);

      const user = await this.userService.getUserById(dto.userId);
      // emit event to let users know they have to update channel
      this.server.emit('update', {
        toUpdate: this.update.channelUsers | this.update.publicChannels | this.update.channels,
        channelId: dto.channelId,
      });

      this.server.to(roomName).emit('announcement', {
        announcement: `${user.username} left this channel`,
        channelId: dto.channelId,
      });

      // send announcement to new owner if owner changed
      if (result.status === 2) {
        const channel = await this.channelService.getChannelById(dto.channelId);
        roomName = '#user' + channel.ownerId;
        this.server.to(roomName).emit('announcement', {
          announcement: result.response,
          channelId: dto.channelId,
        });
      }
      // this.logger.log(`Client ${client.id} left ${roomName}`);
    }
    catch (error) {
      // console.log('error in leaveChannel: ' + error);
      this.logger.log('Error: could not remove user from channel');
    }
  }

  @SubscribeMessage('startPrivateConvo')
  async startPrivateConvo(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { fromId: number; toId: number },
  ) {
    try {
      let newConvo: IPrivateConvo = await this.channelService.findPrivateConvo(
        dto.fromId,
        dto.toId,
      );
      if (!newConvo) {
        newConvo = await this.channelService.startPrivateConvo(dto.fromId, dto.toId);
      }
      this.server.to('#user' + dto.fromId).emit('update', { toUpdate: this.update.dm });
      return newConvo;
    }
    catch (error) {
      // console.log('error in startPrivateConvo: ' + error);
      this.logger.log('Error: could not start private convo');
    }
  }

  @SubscribeMessage('getOnlineUsers')
  async getOnlineUsers(@ConnectedSocket() client: Socket, @MessageBody() userId: number) {
    try {
      const users: IUser[] = await this.chatService.getOnlineUsers(userId);
      return users;
    }
    catch (error) {
      // console.log('error in getOnlineUsers: ' + error);
      this.logger.log('Error: could not retrieve online users');
    }
  }

  @SubscribeMessage('getChannelUsers')
  async getChannelUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { userId: number; channelId: number },
  ) {
    try {
      const users = await this.channelService.getChannelUsers(dto.userId, dto.channelId);
      return users;
    }
    catch (error) {
      // console.log('error in getChannelUsers: ' + error);
      this.logger.log('Error: could not retrieve channel users');
    }
  }

  @SubscribeMessage('getChannelsJoined')
  async getChannelsJoined(@ConnectedSocket() client: Socket, @MessageBody() userId: number) {
    try {
      const channels: any[] = await this.channelService.getChannelsJoined(userId);
      return channels;
    }
    catch (error) {
      // console.log('error in getChannelsJoined: ' + error);
      this.logger.log('Error: could not retrieve channels joined');
    }
  }

  @SubscribeMessage('getPublicChannels')
  async getPublicChannels(@ConnectedSocket() client: Socket) {
    try {
      const channels = await this.channelService.getPublicChannels();
      return channels;
    }
    catch (error) {
      // console.log('error in getPublicChannels: ' + error);
      this.logger.log('Error: could not retrieve public channels');
    }
  }

  @SubscribeMessage('getPrivateConvo')
  async getPrivateConvo(@ConnectedSocket() client: Socket, @MessageBody() userId: number) {
    try {
      // get user's private convo and join corresponding rooms if not joined yet
      let roomName: string = null;
      const convo: IPrivateConvo[] = await this.channelService.getPrivateConvo(userId);
      convo.forEach(async conv => {
        roomName = conv.name;
        if (!client.rooms.has(roomName)) {
          client.join(roomName);
        }
      });
      return convo;
    }
    catch (error) {
      // console.log('error in getPrivateConvo: ' + error);
      this.logger.log('Error: could not retrieve private convo');
    }
  }

  @SubscribeMessage('handlePassword')
  async handlePassword(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { userId: number; channelId: number; password: string },
  ) {
    try {
      const response: string = await this.channelService.handlePassword(
        dto.userId,
        dto.channelId,
        dto.password,
      );
      client.emit('alert', response);
    }
    catch (error) {
      // console.log('error in handlePassword: ' + error);
      this.logger.log('Error: could not modify password');
    }
  }

  @SubscribeMessage('handleAdmin')
  async handleAdmin(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { ownerId: number; channelId: number; userId: number },
  ) {
    try {
      if (dto.ownerId === dto.userId) {
        return;
      }

      const result: IResult = await this.channelService.handleAdmin(
        dto.ownerId,
        dto.channelId,
        dto.userId,
      );
      if (result.status === 1) {
        client.emit('alert', result.response);
        return;
      }

      let roomName: string = '#channel' + dto.channelId;
      this.server.to(roomName).emit('update', {
        toUpdate: this.update.channelUsers,
        channelId: dto.channelId,
      });
      roomName = '#user' + dto.userId;
      this.server.to(roomName).emit('announcement', {
        announcement: result.response,
        channelId: dto.channelId,
      });
    }
    catch (error) {
      // console.log('error in handleAdmin: ' + error);
      this.logger.log('Error: could not modify administrators');
    }
  }

  @SubscribeMessage('kickUser')
  async kickUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { userId: number; channelId: number; toKickId: number },
  ) {
    try {
      if (dto.userId === dto.toKickId) {
        return;
      }
      const response: string = await this.channelService.kickUser(
        dto.userId,
        dto.channelId,
        dto.toKickId,
      );
      if (response) {
        client.emit('alert', response);
      }

      const channel: Channel = await this.channelService.getChannelById(dto.channelId);
      const kickedUser: User = await this.userService.getUserById(dto.toKickId);

      // user kicked needs to update channels joined
      let roomName: string = '#user' + dto.toKickId;
      this.server.to(roomName).emit('update', {
        toUpdate: this.update.channels,
      });
      this.server.to(roomName).emit('alert', `You got kicked out of channel ${channel.name}`);

      // emit event to let users know they have to update channel users
      roomName = '#channel' + dto.channelId;
      this.server.to(roomName).emit('update', {
        toUpdate: this.update.channelUsers,
        channelId: dto.channelId,
      });
      this.server.to(roomName).emit('announcement', {
        announcement: `${kickedUser.username} got kicked out of this channel`,
        channelId: dto.channelId,
      });
    }
    catch (error) {
      // console.log('error in kickUser: ' + error);
      this.logger.log('Error: could not kick user');
    }
  }

  @SubscribeMessage('banUser')
  async banUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { userId: number; channelId: number; toBanId: number },
  ) {
    try {
      if (dto.userId === dto.toBanId) {
        return;
      }
      const response: string = await this.channelService.banUser(
        dto.userId,
        dto.channelId,
        dto.toBanId,
      );
      if (response) {
        client.emit('alert', response);
      }

      const channel: Channel = await this.channelService.getChannelById(dto.channelId);
      const kickedUser: User = await this.userService.getUserById(dto.toBanId);

      // user banned needs to update channels joined
      let roomName: string = '#user' + dto.toBanId;
      this.server.to(roomName).emit('update', {
        toUpdate: this.update.channels,
      });
      this.server.to(roomName).emit('alert', `You are banned from channel ${channel.name}`);

      // emit event to let users know they have to update channel users
      roomName = '#channel' + dto.channelId;
      this.server.to(roomName).emit('update', {
        toUpdate: this.update.channelUsers,
        channelId: dto.channelId,
      });
      this.server.to(roomName).emit('announcement', {
        announcement: `${kickedUser.username} is banned from this channel`,
        channelId: dto.channelId,
      });
    }
    catch (error) {
      // console.log('error in banUser: ' + error);
      this.logger.log('Error: could not ban user');
    }
  }

  @SubscribeMessage('muteUser')
  async muteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { userId: number; channelId: number; toMuteId: number },
  ) {
    try {
      if (dto.userId === dto.toMuteId) {
        return;
      }
      const response: string = await this.channelService.muteUser(
        dto.userId,
        dto.channelId,
        dto.toMuteId,
      );
      if (response) {
        client.emit('alert', response);
      }
    }
    catch (error) {
      // console.log('error in muteUser: ' + error);
      this.logger.log('Error: could not mute user');
    }
  }

  @SubscribeMessage('blockUser')
  async blockUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { userId: number; toBlockId: number },
  ) {
    try {
      const response: string = await this.chatService.blockUser(dto.userId, dto.toBlockId);

      // emit event to update blocked user's lists
      const roomName: string = '#user' + dto.toBlockId;
      this.server.to(roomName).emit('update', {
        toUpdate: this.update.onlineUsers | this.update.channelUsers,
      });
    }
    catch (error) {
      // console.log('error in blockUser: ' + error);
      this.logger.log("Error: could not update users's blocked status");
    }
  }
}
