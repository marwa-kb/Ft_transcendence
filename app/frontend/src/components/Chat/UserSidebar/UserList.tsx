import { useContext, useEffect, useState } from 'react';
import { ChatContext, Update } from '../../../contexts/ChatContext';
import { Avatar, Conversation, ExpansionPanel } from '@chatscope/chat-ui-kit-react';
import emptyLogo from '/src/assets/empty.png';
import { Menu } from '@mui/material';
import { IChannelUser, IChatUser } from '../../../interfaces/ChatUser.interface';
import { AuthContext } from '../../../contexts/AuthContext';
import { Profile, Admin, Ban, Block, DirectMessage, Invite, Kick, Mute, Friend } from './UserMenu';
import { srv } from '../../../interfaces/Server.interface';
import menuStyle from '../menuStyle';

function ChannelUser({
  sessionUser,
  selectedUser,
}: {
  sessionUser: IChannelUser | null | undefined;
  selectedUser: IChannelUser;
}) {
  const { selectedId } = useContext(ChatContext);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Conversation
        name={selectedUser.name}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          handleClick(e);
        }}
      />
      <Menu sx={menuStyle} anchorEl={anchorEl} open={open} onClose={handleClose} onClick={handleClose}>
        <Admin sessionUser={sessionUser} channelId={selectedId} target={selectedUser} />
        <Kick sessionUser={sessionUser} channelId={selectedId} target={selectedUser} />
        <Ban sessionUser={sessionUser} channelId={selectedId} target={selectedUser} />
        <Mute sessionUser={sessionUser} channelId={selectedId} target={selectedUser} />
        <DirectMessage sessionUser={sessionUser} target={selectedUser} />
        <Invite sessionUser={sessionUser} target={selectedUser} />
        <Block target={selectedUser} />
        <Profile targetId={selectedUser.id} />
        <Friend targetId={selectedUser.id} />
      </Menu>
    </>
  );
}

function ChatUser({
  sessionUser,
  selectedUser,
}: {
  sessionUser: IChatUser | null | undefined;
  selectedUser: IChatUser;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Conversation
        name={selectedUser.name}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
          handleClick(e);
        }}
      >
        <Avatar
          src={emptyLogo}
          style={{
            width: '21px',
            height: '21px',
            minWidth: '21px',
            minHeight: '21px',
            marginLeft: '-15px',
          }}
          status={selectedUser.status}
        />
      </Conversation>
      <Menu sx={menuStyle} anchorEl={anchorEl} open={open} onClose={handleClose} onClick={handleClose}>
        <DirectMessage sessionUser={sessionUser} target={selectedUser} />
        <Invite sessionUser={sessionUser} target={selectedUser} />
        <Block target={selectedUser} />
        <Profile targetId={selectedUser.id} />
        <Friend targetId={selectedUser.id} />
      </Menu>
    </>
  );
}

export default function UserList({
  onlineUsers,
  update,
}: {
  onlineUsers: IChatUser[];
  update: (response: srv.Update) => void;
}) {
  const { user } = useContext(AuthContext);
  const { selectedId, users } = useContext(ChatContext);

  useEffect(() => {
    if (selectedId > 0) {
      update({ toUpdate: Update.channelUsers, channelId: selectedId });
    }
  }, [selectedId]);

  return (
    <>
      {selectedId > 0 && (
        <ExpansionPanel title='Channel members'>
          {users.map((u) => (
            <ChannelUser
              key={u.id}
              sessionUser={users.find((u) => u.id === user?.id)}
              selectedUser={u}
            />
          ))}
        </ExpansionPanel>
      )}
      <ExpansionPanel title='Online Users'>
        {onlineUsers.map((c) => (
          <ChatUser
            key={c.id}
            sessionUser={onlineUsers.find((u) => u.id === user?.id)}
            selectedUser={c}
          />
        ))}
      </ExpansionPanel>
    </>
  );
}
