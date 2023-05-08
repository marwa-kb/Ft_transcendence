import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { GameService } from './game/game.service';
import { GameModule } from './game/game.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MulterModule } from '@nestjs/platform-express';
import { ChatModule } from './chat/chat.module';
import { ChatService } from './chat/chat.service';
import { ChannelService } from './chat/channel.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      serveRoot: '/images',
      rootPath: join(__dirname, '..', 'images'),
    }),
    MulterModule.register({ dest: './images' }),
    AuthModule,
    UserModule,
    PrismaModule,
    GameModule,
    ChatModule
  ],
  controllers: [AppController],
  providers: [AppService, GameService, ChatService, ChannelService, ConfigService],
})
export class AppModule { }
