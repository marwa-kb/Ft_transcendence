import { IUser } from "./User";

export interface IGame {
  id: number;
  gameMode: string;
  createAt: string;
  leftPlayerId: number;
  leftPlayer: IUser;
  rightPlayerId: number;
  rightPlayer: IUser;
  winnerId?: number;
  loserId?: number;
  scoreLeftPlayer: number;
  scoreRightPlayer: number;
}