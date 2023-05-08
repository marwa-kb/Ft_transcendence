import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from '../auth/dto';
import { Status } from '@prisma/client';
import { User } from '@prisma/client';
import { UserDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { GameService } from 'src/game/game.service';
import { standardFormats } from '@angular-devkit/schematics/src/formats';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,

    private configService: ConfigService,
  ) { }

  async getUserById(id: number): Promise<User> {
    try {
      const user: User = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
      });
      return user;
    } catch (err) {
      console.log("Prisma couldn't find User %d by its id, returning..", id);
    }
  }

  async getUserByAuthId(authId: number): Promise<User> {
    try {
      const user: User = await this.prisma.user.findUnique({
        where: {
          authId: authId,
        },
      });
      return user;
    } catch (err) {
      console.log("Prisma couldn't get the User by %d its authId, returning..,", authId);
    }
  }

  async getUserNameByAuthId(authId: number): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          authId: authId,
        },
        select: {
          username: true,
        },
      });
      return user.username;
    } catch (err) {
      console.log("Prisma couldn't find the User %d by its id, returning..", authId);
    }
  }

  async userAlreadyExists(new_username: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: {
        username: new_username,
      },
    });
    if (!user)
      return false;
    else
      return true;
  }

  async changeName(input_id: number, new_username: string) {
    const user = await this.getUserById(input_id);
    try {
      await this.prisma.user.update({
        where: {
          id: input_id,
        },
        data: {
          username: new_username,
        },
      });

      await this.prisma.game.updateMany({
        where: {
          leftPlayerId: user.authId,
        },
        data: {
          leftPlayerName: new_username,
        },
      });

      await this.prisma.game.updateMany({
        where: {
          rightPlayerId: user.authId,
        },
        data: {
          rightPlayerName: new_username,
        },
      });

      await this.prisma.message.updateMany({
        where: {
          fromId: user.id,
        },
        data: {
          fromUsername: new_username,
        },
      });
    } catch (err) {
      console.log("Prisma couldn't update the user's username, returning..");
    }
  }

  async uploadAvatar(input_id: number, avatarURL: string) {
    try {
      await this.prisma.user.update({
        where: {
          id: input_id,
        },
        data: {
          avatar: avatarURL,
        },
      });
    } catch (err) {
      console.log("Avatar couldn't have been uploaded, returning..");
    }
  }

  async setStatus(userId: number, status: Status) {
    try {
      const user = await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          status: status,
        },
      });
      return user;
    } catch (error) {
      console.log("Prisma couldn't update the user %d status, returning..", userId);
    }
  }

  async setStatusWithauthId(authId: number, status: Status) {
    try {
      await this.prisma.user.update({
        where: {
          authId: authId,
        },
        data: {
          status: status,
        },
      });
    } catch (err) {
      console.log("Prisma couldn't update the user %d status, returning..", authId);
    }
  }

  async blockUser(userId: number, toBlockId: number) {
    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        usersBlocked: {
          push: toBlockId,
        },
      },
    });
    return user;
  }

  async unblockUser(userId: number, updatedUsersBlocked: number[]) {
    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        usersBlocked: updatedUsersBlocked,
      },
    });
    return user;
  }

  async isBlocked(userId: number, toCheckId: number) {
    const user = await this.prisma.user.findMany({
      where: {
        id: userId,
        usersBlocked: {
          has: toCheckId,
        },
      },
    });
    if (user.length > 0) {
      return true;
    }
    return false;
  }

  async addWin(authId: number): Promise<void> {
    try {
      const user: User = await this.getUserByAuthId(authId);
      user.wins += 1;

      await this.prisma.user.update({
        where: {
          authId: authId,
        },
        data: {
          wins: user.wins,
        },
      });
    } catch (err) {
      console.log("Prisma couldn't add 1 win to the user %d, returning..", authId);
    }
  }

  async addLose(authId: number): Promise<void> {
    try {
      const user: User = await this.getUserByAuthId(authId);
      user.loses += 1;

      await this.prisma.user.update({
        where: {
          authId: authId,
        },
        data: {
          loses: user.loses,
        },
      });
    } catch (err) {
      console.log("Prisma couldn't add 1 lose to the user %d, returning..", authId);
    }
  }
  //For profile showing stats, match history, etc
  async getUserProfileInformation(userId: number): Promise<any> {
    try {
      const user = await this.getUserById(userId);
      if (!user)
        throw new NotFoundException('User Not Found')
      const games = await this.prisma.game.findMany({
        where: {
          OR: [{ leftPlayerId: user.authId }, { rightPlayerId: user.authId }],
        },
        include: {
          leftPlayer: true,
          rightPlayer: true,
        },
        orderBy: {
          id: 'desc',
        },
      });

      const totalScore = games.reduce((acc, game) => {
        const userScore =
          game.leftPlayerId === user.authId ? game.scoreLeftPlayer : game.scoreRightPlayer;
        return acc + userScore;
      }, 0);

      const stats = {
        wins: user.wins,
        losses: user.loses,
        score: totalScore,
      };

      //Mutual friends
      const mutualFriends: User[] = [];
      const usersWhoHaveFriends = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          friends: true,
          friendsRelation: true,
        },
      });

      const friendsIAdded = usersWhoHaveFriends.friends;
      const friendsAddedMe = usersWhoHaveFriends.friendsRelation;

      for (const friend1 of friendsIAdded) {
        for (const friend2 of friendsAddedMe) {
          if (friend1.id === friend2.id) {
            mutualFriends.push(friend1);
            break;
          }
        }
      }

      // Oneway friends
      const onewayFriends: User[] = [];
      const userWhoHasOnewayFriends = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          friends: true,
        },
      });

      const onewayFriendsUsers = userWhoHasOnewayFriends.friends;
      for (const friend1 of onewayFriendsUsers) {
        let isMutualFriend = false;
        for (const friend2 of mutualFriends) {
          if (friend1.id === friend2.id) {
            isMutualFriend = true;
            break;
          }
        }
        if (!isMutualFriend) {
          onewayFriends.push(friend1);
        }
      }

      return { user, games, stats, mutualFriends, onewayFriends };
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('An error occurred while fetching user matches.');
    }
  }

  //For showing top 3 users in homepage
  async getGeneralInformation(authId: number, userId: number): Promise<any> {
    const users = await this.prisma.user.findMany();
    const ranking = users.sort((a, b) => {
      const ratioA = a.loses === 0 ? a.wins : a.wins / a.loses;
      const ratioB = b.loses === 0 ? b.wins : b.wins / b.loses;
      return ratioB - ratioA;
    });
    const games = await this.prisma.game.findMany({
      orderBy: {
        id: 'desc',
      },
    });
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        friends: true,
      },
    });
    const friendIds = user.friends.map((friend: any) => friend.id);
    const friends = user.friends;
    const usersStatus = await this.prisma.user.findMany({
      where: {
        id: { notIn: [...friendIds, userId] },
      },
    });

    // console.log("my friends are: ", friends);
    return { ranking, games, usersStatus, friends };
  }

  // Add as a friend, add to friends list in db
  async addFriend(userId: number, friendId: number) {
    try {
      // Check if the friend already exists
      let user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          friends: {
            select: {
              id: true,
            },
            where: {
              id: friendId,
            },
          },
        },
      });
      if (user.friends.length > 0) {
        console.log(`${friendId} is already a friend of ${userId}`);
        return user;
      } else {
        console.log(`${friendId} is not yet a friend of ${userId}`);
        // Otherwise, create a new Friend record
        user = await this.prisma.user.update({
          where: {
            id: userId,
          },
          data: {
            friends: {
              connect: {
                id: friendId,
              },
            },
          },
          include: {
            friends: true,
          },
        });
        console.log(`${friendId} is added a friend of ${userId}`);
      }
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('An error occurred while fetching user matches.');
    }
  }
  //Update user status
  async checkStatus(authId: number): Promise<Status> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          authId: authId,
        },
        select: {
          status: true,
        },
      });
      return user.status;
    } catch (err) {
      console.log("Prisma couldn't check the status of the user %d, returning..", authId);
    }
  }
}
