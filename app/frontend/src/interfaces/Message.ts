export interface IMessage {
  id: number;
  content: string;
  dm: boolean;
  fromId: number;
  fromUsername: string;
  toId: number;
  users: number[];
  createdAt: string;
}
