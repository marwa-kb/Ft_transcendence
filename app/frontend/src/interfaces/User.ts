import { IGame } from "./Game";

export interface IUser {
  id: number;
  authId: number;
  username: string;
  email: string;
  avatar: string;
  twoFactorSecret: any;
  isTwoFactorEnabled: boolean;
  isKnown: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  usersBlocked:number[]
  wins: number;
  loses: number;
  gamesLeftPlayer?: IGame[];
  gamesRightPlayer?: IGame[];
}
