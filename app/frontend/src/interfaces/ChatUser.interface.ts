export interface IChannelUser {
  id: number;
  name: string;
  role: string;
  status: 'available' | 'eager' | 'dnd' | 'invisible';
}

export interface IChatUser {
  id: number;
  name: string;
  status: 'available' | 'eager' | 'dnd' | 'invisible';
}
