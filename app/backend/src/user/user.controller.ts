import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Req,
  UseGuards,
  Post,
  UploadedFile,
  UseInterceptors,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JwtGuard } from '../auth/guard';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';
import { AuthDto, RequestWithUser } from '../auth/dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { Game, User } from '@prisma/client';
import { GameService } from '../game/game.service';
import { ConfigService } from '@nestjs/config';

// @UseGuards(JwtGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly gameService: GameService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('me')
  async getMe(@Req() req: RequestWithUser) {
    return req.user;
  }

  @UseGuards(JwtGuard)
  @Get('/id/:id')
  async getUserById(@Param('id') id: string) {
    const user: User = await this.userService.getUserById(
      Number(id),
    );

    return user;
  }

  @UseGuards(JwtGuard)
  @Get('/authid/:authId')
  async getUserByAuthId(@Param('authId') authId: string) {
    const user: User = await this.userService.getUserByAuthId(
      Number(authId),
    );
    return user;
  }

  //change username
  @UseGuards(JwtGuard)
  @Get('check-username/:username')
  async checkUsernameExists(
    @Param('username') username: string,
  ): Promise<{ usernameExists: boolean }> {
    const user = await this.userService.userAlreadyExists(username);
    return { usernameExists: user };
  }

  @UseGuards(JwtGuard)
  @Put(':id')
  async updateUsername(@Param('id') id: string, @Body() body: any) {
    const stringToNumberData = id;
    const number_id = Number(stringToNumberData);
    await this.userService.changeName(number_id, body.username);
  }

  //change avatar
  @UseGuards(JwtGuard)
  @Post('upload-avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './images',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(
            null,
            `${randomName}${extname(file.originalname)}`,
          );
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
          return cb(
            new BadRequestException(
              'Only JPEG and PNG files are allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: any,
    @Req() req: RequestWithUser,
  ) {
    const image_url = `http://${this.configService.get<string>(
      'APP_HOSTNAME_URL',
    )}:${this.configService.get<string>('BACKEND_PORT')}/images/${file.filename
      }`;
    await this.userService.uploadAvatar(req.user.id, image_url);
    return { url: image_url };
  }

  //For profile showing stats, match history, etc
  @UseGuards(JwtGuard)
  @Get(':id/profile')
  async getUserProfileAndMatches(
    @Param('id') id: string,
  ): Promise<{
    user: User[];
    games: Game[];
    stats: any;
    mutualFriends: User[];
    onewayFriends: User[];
  }> {
	try {
		const { user, games, stats, mutualFriends, onewayFriends } =
		await this.userService.getUserProfileInformation(parseInt(id));
		return { user, games, stats, mutualFriends, onewayFriends };
	} catch(err) {
		console.log("Error in getUserProfileAndMatches");
	}
  }

  //Showing top users and recent games in homepage
  @UseGuards(JwtGuard)
  @Get('general-information')
  async getGeneralInformation(@Req() req: RequestWithUser): Promise<{
    ranking: User[];
    games: Game[];
    usersStatus: User[];
    friends: User[];
  }> {
    const { ranking, games, usersStatus, friends } =
      await this.userService.getGeneralInformation(
        req.user.authId,
        req.user.id,
      );
    return { ranking, games, usersStatus, friends };
  }

  @Post(':userId/add-friend')
  async addFriend(
    @Param('userId') userId: string,
    @Body('friendId') friendId: string,
  ) {
    return this.userService.addFriend(
      parseInt(userId),
      parseInt(friendId),
    );
  }
}
