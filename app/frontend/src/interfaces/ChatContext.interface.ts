import React from 'react';
import { IConversation } from './Conversation';
import { IMessage } from './Message';
import { IChannelUser } from './ChatUser.interface';

export interface IChatContext {
  channelList: IConversation[];
  setChannelList: React.Dispatch<React.SetStateAction<IConversation[]>>;
  dmList: IConversation[];
  setDmList: React.Dispatch<React.SetStateAction<IConversation[]>>;
  selectedId: number;
  setSelectedId: React.Dispatch<React.SetStateAction<number>>;
  messages: IMessage[];
  setMessages: React.Dispatch<React.SetStateAction<IMessage[]>>;
  users: IChannelUser[];
  setUsers: React.Dispatch<React.SetStateAction<IChannelUser[]>>;
}
