import { useContext } from 'react';
import { ChatContext } from '../../../contexts/ChatContext';
import {
  ConversationList,
  Conversation,
  ExpansionPanel,
} from '@chatscope/chat-ui-kit-react';
import { IConversation } from '../../../interfaces/Conversation';
import socket from '../../../Socket';
import { AuthContext } from '../../../contexts/AuthContext';

export function PublicChannels({ channels }: { channels: IConversation[] }) {
  const { user } = useContext(AuthContext);
  const { channelList, setSelectedId } = useContext(ChatContext);

  const handleClick = (channel: IConversation) => {
    socket.emit(
      'joinChannel',
      {
        channelName: channel.name,
        userId: user?.id,
        password: '',
      },
      (response: any) => {
        setSelectedId(response.id);
      }
    );
  };
  return (
    <ExpansionPanel title='Public Channels'>
      <ConversationList>
        {channels
          .filter(
            (c: IConversation) =>
              !channelList.find((ch: IConversation) => {
                return ch.id === c.id;
              })
          )
          .map((channel: IConversation) => (
            <Conversation
              key={channel.id}
              name={channel.name}
              onClick={() => handleClick(channel)}
            />
          ))}
      </ConversationList>
    </ExpansionPanel>
  );
}

export default function Section({
  title,
  convos,
}: {
  title: string;
  convos: IConversation[];
}) {
  const { selectedId, setSelectedId } = useContext(ChatContext);

  return (
    <ExpansionPanel title={title}>
      <ConversationList>
        {convos.map((c: IConversation) => (
          <Conversation
            key={c.id}
            name={c.name}
            active={c.id === selectedId}
            onClick={() => setSelectedId(c.id)}
          />
        ))}
      </ConversationList>
    </ExpansionPanel>
  );
}
