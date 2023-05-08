import { Button } from '@chatscope/chat-ui-kit-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faDoorOpen, faGear, faBars } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../../../contexts/AuthContext';
import { useContext, useState } from 'react';
import socket from '../../../Socket';
import { ChatContext } from '../../../contexts/ChatContext';
import { Menu, Popover } from '@mui/material';
import { Friend, Invite, Profile } from '../UserSidebar/UserMenu';
import Box from '@mui/material/Box';
import { IConversation } from '../../../interfaces/Conversation';
import menuStyle from '../menuStyle';


export function ChatActions({ selectedConvo }: { selectedConvo: IConversation }) {
  const { user, setUser } = useContext(AuthContext);
  const { channelList, setChannelList, selectedId, setSelectedId, users } =
    useContext(ChatContext);
  const chatUser = users.find((u) => u.id === user?.id);

  const [password, setPassword] = useState('');
  const target = {
    id: selectedConvo.ownerId,
    name: selectedConvo.name,
    status: selectedConvo.status,
  };

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => {
    setPassword('');
    setAnchorEl(null);
  };
  const handlePassword = (password: string | null) => {
    socket.emit('handlePassword', {
      userId: user?.id,
      channelId: selectedId,
      password: password,
    });
    handleClose();
  };
  const handleLeave = () => {
    socket.emit('leaveChannel', { channelId: selectedId, userId: user?.id });
    setChannelList(channelList.filter((c) => c.id !== selectedId));
    setSelectedId(0);
  };
  const handleBlock = () => {
    let newBlockList = user?.usersBlocked;
    socket.emit('blockUser', {
      userId: user?.id,
      toBlockId: target.id,
    });
    if (!newBlockList?.includes(target.id)) {
      newBlockList?.push(target.id);
    } else {
      newBlockList.splice(newBlockList.indexOf(target.id), 1);
    }
    setUser({ ...user!, usersBlocked: newBlockList! });
  };

  const popoverStyle = {
	borderRadius: '10px',
	border: '1px solid whitesmoke',
  }

  return selectedId > 0 ? (
    <>
      <Button
        icon={<FontAwesomeIcon icon={faGear} size='lg' />}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleClick(e)}
        disabled={chatUser?.role !== 'OWNER'}
      >
        Settings
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
		sx={{'& .MuiPopover-paper': {
			boxShadow: '0px 0px 2px rgb(143, 241, 154)',
			borderRadius: '10px',
		}}}
      >
        <Box className='settings-popover' sx={popoverStyle}>
          <h3>Update Password</h3>
          <input
            type='password'
            placeholder='New password'
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
          <button onClick={() => handlePassword(password === '' ? null : password)}>
            {password ? 'Set new password' : 'Remove password'}
          </button>
        </Box>
      </Popover>
      <span style={{ width: '8px' }} />

      <Button
        icon={<FontAwesomeIcon icon={faDoorOpen} size='lg' />}
        onClick={() => handleLeave()}
        disabled={selectedId === 1}
      >
        Leave
      </Button>
    </>
  ) : (
    <>
      <Button
        icon={<FontAwesomeIcon icon={faBars} size='lg' />}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleClick(e)}
        disabled={user?.usersBlocked.includes(Math.abs(selectedId))}
      >
        Options
      </Button>
      <Menu sx={menuStyle} anchorEl={anchorEl} open={open} onClose={handleClose} onClick={handleClose}>
        <Friend targetId={target.id} />
        <Invite
          sessionUser={chatUser}
          target={{
            id: target.id,
            status: target.status === undefined ? 'invisible' : target.status,
          }}
        />
        <Profile targetId={target.id} />
      </Menu>
      <span style={{ width: '8px' }} />
      <Button
        icon={<FontAwesomeIcon icon={faBan} size='lg' />}
        onClick={() => handleBlock()}
      >
        {user?.usersBlocked.includes(target.id) ? 'Unblock' : 'Block'}
      </Button>
    </>
  );
}
