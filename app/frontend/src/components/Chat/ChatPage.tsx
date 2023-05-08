import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import {
  MainContainer,
  ChatContainer,
  MessageList,
  Message,
  MessageInput,
  Sidebar,
  ConversationHeader,
} from '@chatscope/chat-ui-kit-react';
import './ChatPage.css';
import { AuthContext } from '../../contexts/AuthContext';
import { ChatContext, Update } from '../../contexts/ChatContext';
import Section, { PublicChannels } from './Conversations/Section';
import UserList from './UserSidebar/UserList';
import { ChatActions } from './ChatActions/ChatActions';
import { IConversation } from '../../interfaces/Conversation';
import { AddConversation } from './Conversations/AddConversation';
import { IChatUser } from '../../interfaces/ChatUser.interface';
import { srv } from '../../interfaces/Server.interface';
import { IMessage } from '../../interfaces/Message';
import { useContext, useEffect, useState } from 'react';
import socket from '../../Socket';
import moment from 'moment';

export default function ChatPage() {
	const { user } = useContext(AuthContext);
	const {
    channelList,
    setChannelList,
    dmList,
    setDmList,
    selectedId,
    setSelectedId,
    messages,
    setMessages,
    setUsers,
  } = useContext(ChatContext);
  const [publicChannels, setPublicChannels] = useState<IConversation[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<IChatUser[]>([]);
  const selectedConvo =
  selectedId > 0
  ? channelList.find((c) => c.id === selectedId)
  : dmList.find((d) => d.id === selectedId);
  
  useEffect(() => {
	  document.title = "Chat - Pong";
  }, []);
  
  function sendMessage(content: string, isDm: boolean) {
    socket.emit('sendMessage', {
      fromId: user?.id,
      toId: Math.abs(selectedId),
      fromUsername: user?.username,
      dm: isDm,
      content: content,
    });
  }

  function getStatus(s: string) {
    switch (s) {
      case 'ONLINE':
        return 'available';
      case 'OFFLINE':
        return 'invisible';
      case 'INQUEUE':
        return 'eager';
      case 'INGAME':
        return 'dnd';
    }
  }

  function update(response: srv.Update) {
    if (response.toUpdate & Update.channels) {
      socket.emit('getChannelsJoined', user?.id, (response: IConversation[]) => {
        setChannelList(response);
        if (
          selectedId > 0 &&
          !response.find((c) => {
            return c.id === selectedId;
          })
        )
          setSelectedId(0);
      });
    }
    if (response.toUpdate & Update.publicChannels) {
      socket.emit('getPublicChannels', (response: IConversation[]) => {
        setPublicChannels(response);
      });
    }
    if (response.toUpdate & Update.dm) {
      socket.emit('getPrivateConvo', user?.id, (response: srv.Dm[]) => {
        setDmList(
          response.map((d: srv.Dm) => {
            return {
              id: d.id * -1,
              name: d.users.find((u) => u.user.id !== user?.id)!.user.username,
              ownerId: d.users.find((u) => u.user.id !== user?.id)!.user.id,
              status: getStatus(d.users.find((u) => u.user.id !== user?.id)!.user.status),
              type: d.type,
            };
          })
        );
      });
    }
    if (response.toUpdate & Update.channelUsers) {
      if (!response.channelId || response.channelId === selectedId)
        socket.emit(
          'getChannelUsers',
          { userId: user?.id, channelId: selectedId },
          (response: srv.ChannelUser[]) => {
            setUsers(
              response.map((u: srv.ChannelUser) => {
                return {
                  id: u.userId,
                  name: u.user.username,
                  role: u.role,
                  status: getStatus(u.user.status)!,
                };
              })
            );
          }
        );
    }
    if (response.toUpdate & Update.onlineUsers) {
      socket.emit('getOnlineUsers', user?.id, (response: srv.ChatUser[]) => {
        setOnlineUsers(
          response.map((u: srv.ChatUser) => {
            return { id: u.id, name: u.username, status: getStatus(u.status)! };
          })
        );
      });
    }
  }
  useEffect(() => {
    socket.on('update', update);

    return () => {
      socket.off('update', update);
    };
  }, [update]);

  useEffect(() => {
    update({ toUpdate: 31 });
  }, []);

  function updateMessages(id: number) {
    socket.emit('getMessages', Math.abs(id), (response: IMessage[]) => {
      setMessages(response);
    });
  }
  useEffect(() => {
    updateMessages(selectedId);
  }, [selectedId]);

  function recvMessage(response: IMessage) {
    // console.log('message recv: ', response);
    switch (response.dm) {
      case true:
        update({ toUpdate: Update.dm });
        if (response.toId === Math.abs(selectedId)) {
          updateMessages(selectedId);
        }
        break;
      case false:
        if (response.toId === selectedId) {
          updateMessages(selectedId);
        }
    }
  }
  useEffect(() => {
    socket.on('newMessage', recvMessage);

    return () => {
      socket.off('newMessage', recvMessage);
    };
  }, [recvMessage]);

  function handleAnnounce(response: { announcement: string; channelId: number }) {
    if (selectedId === response.channelId)
      setMessages((messages) => [
        ...messages,
        {
          id: messages.length == 0 ? 0 : messages[messages.length - 1].id + 1,
          content: response.announcement,
          dm: false,
          fromId: -1,
          fromUsername: 'Server',
          toId: response.channelId,
          users: [],
          createdAt: '',
        },
      ]);
  }
  useEffect(() => {
    socket.on('announcement', handleAnnounce);

    return () => {
      socket.off('announcement', handleAnnounce);
    };
  }, [handleAnnounce]);

  function handleAlert(response: string) {
    alert(response);
  }
  useEffect(() => {
    socket.on('alert', handleAlert);

    return () => {
      socket.off('alert', handleAlert);
    };
  }, [handleAlert]);

  return (
    <MainContainer className='chat-main-container' style={{minWidth:'800px'}}>
      <Sidebar
        className='chat-left-sidebar'
        position='left'
        scrollable={true}
        style={{ minWidth: '190px', minHeight: '450px' }}
      >
        <AddConversation />
        <Section title='Channels' convos={channelList} />
        <Section title='Private Messages' convos={dmList} />
        <PublicChannels channels={publicChannels} />
      </Sidebar>

      {selectedConvo ? (
        <ChatContainer style={{ minWidth: '370px', minHeight: '450px' }}>
          <ConversationHeader>
            <ConversationHeader.Back onClick={() => setSelectedId(0)} />
            <ConversationHeader.Content userName={selectedConvo.name} />
            <ConversationHeader.Actions>
              <ChatActions selectedConvo={selectedConvo} />
            </ConversationHeader.Actions>
          </ConversationHeader>

          <MessageList>
            {messages
              .filter((m) => !user?.usersBlocked.includes(m.fromId))
              .map((message) => (
                <Message
                  key={message.id}
                  model={{
                    message: message.content,
                    sender: message.fromId.toString(),
                    direction: 'incoming',
                    position: message.fromId === -1 ? 'last' : 'single',
                  }}
                >
                  <Message.Header
                    sender={message.fromUsername}
                    sentTime={moment(message.createdAt).format('YYYY-MM-DD H:mm')}
                  />
                </Message>
              ))}
          </MessageList>

          <MessageInput
            placeholder='Type message here'
            attachButton={false}
            onSend={(s) => sendMessage(s, selectedId < 0)}
          />
        </ChatContainer>
      ) : (
        <ChatContainer />
      )}

      <Sidebar
        className='chat-right-sidebar'
        position='right'
        scrollable={true}
        style={{ minWidth: '240px', minHeight: '450px' }}
      >
        <UserList onlineUsers={onlineUsers} update={update} />
      </Sidebar>
    </MainContainer>
  );
}
