import { createContext, useMemo, useState } from 'react';
import { IConversation } from '../interfaces/Conversation';
import { IMessage } from '../interfaces/Message';
import { IChatContext } from '../interfaces/ChatContext.interface';
import { IChannelUser } from '../interfaces/ChatUser.interface';

export const Update = {
  none: 0,
  channels: 1,
  publicChannels: 2,
  dm: 4,
  channelUsers: 8,
  onlineUsers: 16,
};

export const ChatContext = createContext({} as IChatContext);
export default function ChatContextProvider(props: any) {
  const [channelList, setChannelList] = useState<IConversation[]>([]);
  const [dmList, setDmList] = useState<IConversation[]>([]);
  const [selectedId, setSelectedId] = useState(0);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [users, setUsers] = useState<IChannelUser[]>([]);

  const data = useMemo(
    () => ({
      channelList,
      setChannelList,
      dmList,
      setDmList,
      selectedId,
      setSelectedId,
      messages,
      setMessages,
      users,
      setUsers,
    }),
    [channelList, dmList, selectedId, messages, users]
  );

  return <ChatContext.Provider value={data}>{props.children}</ChatContext.Provider>;
}
