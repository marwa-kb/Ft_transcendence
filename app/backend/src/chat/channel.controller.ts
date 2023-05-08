// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Patch,
//   Param,
//   Delete
// } from '@nestjs/common';
// import { ChannelService } from './channel.service';
// import { CreateChannelDto } from './dto/createChannel.dto';
// import { UpdateChannelDto } from './dto/updateChannel.dto';
// import { JoinChannelDto } from './dto/joinChannel.dto';

// interface IChannelJoined {
//   id: number;
//   name: string;
//   type: string;
//   ownerId: number;
// }
// @Controller('/chat/channels')
// export class ChannelController {
//   constructor(private readonly channelService: ChannelService) { }

//   @Post()
//   async create(@Body() dto: CreateChannelDto) {
//     const channel = await this.channelService.create(dto);
//     return channel;
//   }

//   @Get(':userId')
//   async findAll(@Param('userId') userId: string): Promise<IChannelJoined[]> {
//     const channels = await this.channelService.getChannelsJoined(+userId);
//     return channels;
//   }

//   // @Get(':id')
//   // async findOne(@Param('id') id: string) {
//   //   const channel = this.channelService.findOne(+id);
//   //   return channel;
//   // }

//   // @Get(':name')
//   // async findOneByName(@Param('name') name: string) {
//   //   const channel = await this.channelService.getChannelByName(name);
//   //   return channel;
//   // }


//   @Patch('/join')
//   async join(@Body() dto: JoinChannelDto) {
//     const channel = await this.channelService.join(dto);
//     return channel;
//   }

//   @Patch(':id')
//   update(@Param('id') id: string, @Body() updateChannelDto: UpdateChannelDto) {
//     return this.channelService.update(+id, updateChannelDto);
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.channelService.remove(+id);
//   }
// }
