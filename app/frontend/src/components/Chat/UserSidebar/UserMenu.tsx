import { MenuItem } from '@mui/material';
import { IChannelUser, IChatUser } from '../../../interfaces/ChatUser.interface';
import socket from '../../../Socket';
import { useContext } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { ChatContext } from '../../../contexts/ChatContext';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { appHostUrl, backendPort } from '../../../config';
import { useNavigate } from 'react-router';

interface ChannelProps {
  sessionUser: IChannelUser | null | undefined;
  channelId: number;
  target: IChannelUser;
}
interface UserProps {
  sessionUser?: IChannelUser | IChatUser | null;
  target: IChannelUser | IChatUser;
}

export function Admin({ sessionUser, channelId, target }: ChannelProps) {
  const handleAdmin = () => {
    socket.emit('handleAdmin', {
      ownerId: sessionUser?.id,
      channelId: channelId,
      userId: target.id,
    });
  };

  return sessionUser?.role === 'OWNER' && sessionUser?.id !== target.id ? (
    <MenuItem onClick={() => handleAdmin()}>
      {target.role !== 'ADMIN' ? 'Set as Admin' : 'Remove Admin'}
    </MenuItem>
  ) : null;
}

export function Kick({ sessionUser, channelId, target }: ChannelProps) {
  const handleKick = () => {
    socket.emit('kickUser', {
      userId: sessionUser?.id,
      channelId: channelId,
      toKickId: target.id,
    });
  };
  return sessionUser?.role !== 'USER' &&
    sessionUser?.role !== target.role &&
    target.role !== 'OWNER' &&
    sessionUser?.id !== target.id ? (
    <MenuItem onClick={() => handleKick()}>Kick</MenuItem>
  ) : null;
}

export function Ban({ sessionUser, channelId, target }: ChannelProps) {
  const handleBan = () => {
    socket.emit('banUser', {
      userId: sessionUser?.id,
      channelId: channelId,
      toBanId: target.id,
    });
  };
  return sessionUser?.role !== 'USER' &&
    sessionUser?.role !== target.role &&
    target.role !== 'OWNER' &&
    sessionUser?.id !== target.id ? (
    <MenuItem onClick={() => handleBan()}>Ban</MenuItem>
  ) : null;
}

export function Mute({ sessionUser, channelId, target }: ChannelProps) {
  const handleMute = () => {
    socket.emit('muteUser', {
      userId: sessionUser?.id,
      channelId: channelId,
      toMuteId: target.id,
    });
  };
  return sessionUser?.role !== 'USER' &&
    sessionUser?.role !== target.role &&
    target.role !== 'OWNER' &&
    sessionUser?.id !== target.id ? (
    <MenuItem onClick={() => handleMute()}>Mute</MenuItem>
  ) : null;
}

export function DirectMessage({ sessionUser, target }: UserProps) {
  const { user } = useContext(AuthContext);
  const { setSelectedId } = useContext(ChatContext);
  const handleMessage = () => {
    socket.emit(
      'startPrivateConvo',
      { fromId: sessionUser?.id, toId: target.id },
      (response: any) => {
        setSelectedId(response.id * -1);
      }
    );
  };
  return sessionUser?.id !== target.id ? (
    <MenuItem
      disabled={user?.usersBlocked.includes(target.id)}
      onClick={() => handleMessage()}
    >
      Send Message
    </MenuItem>
  ) : null;
}

export function Invite({
  sessionUser,
  target,
}: {
  sessionUser?: IChannelUser | IChatUser | null;
  target: { id: number; status: string };
}) {
  const { user } = useContext(AuthContext);
  const handleInvite = () => {
    socket.emit('inviteInit', target.id);
  };
  return sessionUser?.id !== target.id ? (
    <MenuItem
      disabled={user?.usersBlocked.includes(target.id) || target.status != 'available'}
      onClick={() => handleInvite()}
    >
      Invite to Game
    </MenuItem>
  ) : null;
}

export function Block({ target }: UserProps) {
  const { user, setUser } = useContext(AuthContext);

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
  return user?.id !== target.id ? (
    <MenuItem onClick={() => handleBlock()}>
      {user?.usersBlocked.find((i) => i === target.id) ? 'Unblock' : 'Block'}
    </MenuItem>
  ) : null;
}

export function Profile({ targetId }: { targetId: number }) {
  const navigate = useNavigate();

  const handleProfile = () => {
    navigate(`/user/profile/${targetId}`);
  };
  return <MenuItem onClick={() => handleProfile()}>View Profile</MenuItem>;
}

export function Friend({ targetId }: { targetId: number }) {
  const { user } = useContext(AuthContext);
  const handleFriend = () => {
    axios
      .post(`http://${appHostUrl}:${backendPort}/users/${user?.id}/add-friend`, {
        friendId: targetId,
      })
      .then((res: AxiosResponse) => {
        // console.log('Friend added');
      })
      .catch((err: AxiosError) => {
        console.log(err);
      });
  };
  return user?.id !== targetId ? (
    <MenuItem disabled={user?.usersBlocked.includes(targetId)} onClick={() => handleFriend()}>Add Friend</MenuItem>
  ) : null;
}