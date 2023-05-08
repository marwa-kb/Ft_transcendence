import FtLogo from '/src/assets/42Logo.svg';
import { backendPort, appHostUrl } from '../../config';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightToBracket } from '@fortawesome/free-solid-svg-icons';
import './LoginPage.css';


export default function LoginBtn({ setMove }: any) {
	const imgEl = <img src={FtLogo}/>;
	const iconEl = <FontAwesomeIcon className='login-icon' icon={faRightToBracket} />;
	const [content, setContent] = useState<JSX.Element>(imgEl);

	function putIcon() {
		setContent(iconEl);
	};

	function putRegular() {
		setContent(imgEl);
	};

	let handleClick = () => {
		setMove(true);
		setTimeout(() => {
			window.location.href = `http://${appHostUrl}:${backendPort}/auth/42`;
		}, 800);
	};

	return (
		<button
			className='login-button'
			onMouseEnter={putIcon}
			onMouseLeave={putRegular}
			onClick={() => {
				handleClick();
				handleClick = () => {};
			}}
		>
			{content}
			<span className='login-text'>login</span>
		</button>
	);
}

export function TmpLoginBtn() {
	const [show, setShow] = useState(false);
	const [name, setName] = useState('');

	function handleGuestLogin() {
		setShow((prevShow) => !prevShow);
	}

	function handleNameInput(e: any) {
		const inputValue = e.target.value;
		setName(inputValue);
	}

	function handleSubmit() {
		const tmpLoginURL = `http://${appHostUrl}:${backendPort}/auth/42/guest/${name}`;
		window.location.href = tmpLoginURL;
	}

	const inputEl = (
		<div style={{ width: '300px', display: 'flex', margin: 'auto' }}>
			<input
				name='name'
				value={name}
				type='text'
				placeholder='name: '
				onChange={handleNameInput}
				style={{ margin: 'auto', display: 'block' }}
			/>
			<button onClick={handleSubmit}>Submit</button>
		</div>
	);

	return (
		<div className='tmp-login'>
			<button className='login-button' onClick={handleGuestLogin}>
				<span className='login-text'>login as guest</span>
			</button>
			{show && inputEl}
		</div>
	);
}
