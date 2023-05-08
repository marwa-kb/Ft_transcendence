import { Button } from '@chatscope/chat-ui-kit-react';
import { ChangeEvent, useContext, useState } from 'react';
import { isAlphanumeric } from '../../../functions/isAlphanumeric';
import { AuthContext } from '../../../contexts/AuthContext';
import socket from '../../../Socket';
import { Box, Popover } from '@mui/material';
import AddIcon from '../../../assets/icons/add-channel.svg';
import { ChatContext } from '../../../contexts/ChatContext';
import '../ChatPage.css';

export function AddConversation() {
  const [task, setTask] = useState('joinChannel');
  const [name, setName] = useState('');
  const [type, setType] = useState('PUBLIC');
  const [password, setPassword] = useState('');
  const [chanNameSpecialChar, setChanNameSpecialChar] = useState(true);

  const { user } = useContext(AuthContext);
  const { setSelectedId } = useContext(ChatContext);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
    reset();
  };

  function reset() {
    setName('');
    setPassword('');
  }

  function addChannel(task: string, name: string, type: string, password: string | null) {
    let newChannel: any;
    switch (task) {
      case 'createChannel':
        newChannel = {
          name: name,
          type: type,
          password: password,
          ownerId: user?.id,
        };
        break;
      case 'joinChannel':
        newChannel = {
          channelName: name,
          userId: user?.id,
          password: password,
        };
        break;
      default:
        return;
    }

    socket.emit(task, newChannel, (response: any) => {
      handleClose();
      setSelectedId(response.id);
    });
  }

  function checkChanName(e: ChangeEvent<HTMLInputElement>) {
	//Check if channel name has any special characters or not
	setName(e.target.value);
	if (e.target.value.length > 0 && !isAlphanumeric(e.target.value))
		setChanNameSpecialChar(false);
	else
		setChanNameSpecialChar(true);
  }

  const popoverStyle = {
	borderRadius: '10px',
	border: '1px solid whitesmoke',
  }

  return (
    <>
      <Button border style={{ margin: '12px' }} onClick={handleClick}>
        Add channel
        <img className='add-chan-icon' src={AddIcon} />
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
		sx={{'& .MuiPopover-paper': {
			boxShadow: '0px 0px 2px rgb(143, 241, 154)',
			borderRadius: '10px',
		}}}
      >
        <Box className='add-chan-popover' sx={popoverStyle}>
          <div className='popover-btns-container'>
            <button onClick={() => setTask('joinChannel')} disabled={task === 'joinChannel'}>
              Join
            </button>
            <button
              onClick={() => setTask('createChannel')}
              disabled={task === 'createChannel'}
            >
              Create
            </button>
          </div>
          <div className='add-popover-inputs'>
            {task === 'createChannel' && (
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value='PUBLIC'>Public</option>
                <option value='PRIVATE'>Private</option>
              </select>
            )}
            {task && (
              <input
                placeholder={'Channel name'}
                value={name}
                onChange={checkChanName}
				className={!chanNameSpecialChar ? "shake-input" : ""}
				style={!chanNameSpecialChar ? { color: '#FD4040' } : {}}
              ></input>
            )}
            <input
              type='password'
              value={password}
              placeholder={
                task === 'joinChannel' ? 'Password (if required)' : 'Password (optional)'
              }
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {
              !chanNameSpecialChar &&
              <div className='channelName-error'>
                Sorry, the channel name must:
				<ul>
					<li>only contain letters, numbers, and hyphens.</li>
					<li>be less than 12 characters in length.</li>
				</ul>
              </div>
          }
          <button
            className='add-btn-popover'
            onClick={() => addChannel(task, name, type, password === '' ? null : password)}
		  	disabled={name.length < 1 || !chanNameSpecialChar}
		  >
            submit
          </button>
        </Box>
      </Popover >
    </>
  );
}
