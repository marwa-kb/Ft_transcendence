import { IsNumber } from 'class-validator';

export class GameDto {
  @IsNumber()
  id: number;
  gameMode?: string;
  leftPlayerId: number;
  rightPlayerId: number;
  scoreLeftPlayer?: number;
  scoreRightPlayer?: number;
  winnerId?: number;
  loserId?: number;
  state?: number;
  map?: number;
  scoreLimit?: number;
  isFinished?: boolean = false;
  hasLeft?: boolean = false;
  leftPlayerMap = false;
  rightPlayerMap = false;
  leftPlayerMode: string;
  rightPlayerMode: string;
  initialBallSpeed?: number;
}
