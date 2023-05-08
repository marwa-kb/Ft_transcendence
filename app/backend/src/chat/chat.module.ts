import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ChannelService } from './channel.service';
// import { ChannelController } from './channel.controller';
import { UserService } from 'src/user/user.service';

@Module({
  // controllers: [ChannelController],
  providers: [ChatGateway, ChatService, ChannelService, UserService]
})
export class ChatModule { }
