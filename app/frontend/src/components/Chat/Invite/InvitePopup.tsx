import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { useContext, useEffect, useState } from 'react';
import socket from '../../../Socket';
import { useNavigate } from 'react-router';
import { AuthContext } from '../../../contexts/AuthContext';
import { srv } from '../../../interfaces/Server.interface';
import { IInvite } from '../../../interfaces/Invite';
import './InvitePopup.css';

const defaultStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 450,
  background: 'linear-gradient(white, whitesmoke)',
  borderRadius: '10px',
  boxShadow: '0px 0px 6px rgb(143, 241, 154)',
  p: 4,
};

export default function InvitePopup() {
  const { user, setUser } = useContext(AuthContext);
  const [invites, setInvites] = useState<IInvite[]>([]);
  const selectedInvite = invites.find((i) => i.id)?.id;
  const navigate = useNavigate();

  const handleYes = () => {
    socket.emit('inviteAccepted', { invitedId: user?.id, inviterId: selectedInvite });
    setInvites(invites.filter((i) => i.id != i.id));
  };
  const handleNo = () => {
    socket.emit('inviteDeclined', { invitedId: user?.id, inviterId: selectedInvite });
    setInvites(invites.filter((i) => i.id != selectedInvite));
  };
  const handleBlock = () => {
    let newBlockList = user?.usersBlocked;

    socket.emit('inviteDeclined', { invitedId: user?.id, inviterId: selectedInvite });
    setInvites(invites.filter((i) => i.id != selectedInvite));

    socket.emit('blockUser', { userId: user?.id, toBlockId: selectedInvite });
    if (!newBlockList?.includes(selectedInvite!)) {
      newBlockList?.push(selectedInvite!);
    } else {
      newBlockList.splice(newBlockList.indexOf(selectedInvite!), 1);
    }
    setUser({ ...user!, usersBlocked: newBlockList! });
  };

  useEffect(() => {
    return () => {
      for (let i = 0; i < invites.length; i++) {
        socket.emit('inviteDeclined', { invitedId: user?.id, inviterId: invites[i].id });
      }
    };
  }, []);

  function recvInvite(response: srv.Invite) {
    setInvites([...invites, { id: response.inviterId, username: response.inviterName }]);
  }
  useEffect(() => {
    socket.on('invitation', recvInvite);

    return () => {
      socket.off('invitation', recvInvite);
    };
  }, [recvInvite]);

  function acceptInvite(response: { gameId: number }) {
    navigate('/game/');
    setTimeout(() => {
      navigate(`/game/${response.gameId}`)}, 10);

  }
  useEffect(() => {
    socket.on('inviteAccepted', acceptInvite);

    return () => {
      socket.off('inviteAccepted', acceptInvite);
    };
  }, [acceptInvite]);

  return (
    <>
      <Modal open={invites.length > 0} onClose={handleNo}>
        <Box className='popup' sx={defaultStyle}>
          <h3 className='popup-txt'>
            <strong>{invites.find((i) => i.id === selectedInvite)?.username} </strong>
            invited you to a game
          </h3>
          <div className='btns-container'>
            <Button onClick={handleYes}>accept</Button>
            <Button onClick={handleNo}>decline</Button>
          </div>
          <div className='popup-content' style={{ textAlign: 'center' }}>
            <Button className='popup-block-btn' onClick={handleBlock}>
              Block
            </Button>
          </div>
        </Box>
      </Modal>
    </>
  );
}
