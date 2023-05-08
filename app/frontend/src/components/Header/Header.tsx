import { NavLink } from 'react-router-dom';
import { useContext, useState } from 'react';
import axios, { AxiosError, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';

import { backendPort, appHostUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';
import { IUser } from '../../interfaces/User';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import { faGamepad } from '@fortawesome/free-solid-svg-icons';
import { faMessage } from '@fortawesome/free-solid-svg-icons';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';

import './Header.css';


interface NavBtnProps {
	address: string;
	iconName: any;
}

interface LogoutBtnProps {
	handleLogout: () => void;
	user: IUser;
}

interface LogoutData {
	text: string;
	image: JSX.Element;
}

function LogoutBtn({ handleLogout, user }: LogoutBtnProps) {
	const imgEl = <img className='logout-img' src={user.avatar} />;
	const iconEl = <FontAwesomeIcon className='logout-icon' icon={faRightFromBracket} />;
	const [image, setImage] = useState<JSX.Element>(imgEl);

	function putLogin() {
		setImage(imgEl);
	}

	function putLogout() {
		setImage(iconEl);
	}

	return (
		<button
			className='logout-btn'
			onClick={handleLogout}
			onMouseEnter={putLogout}
			onMouseLeave={putLogin}
		>
			<h3 className='logout-username'>{user.username}</h3>
			{image}
		</button>
	);
}

function NavBtn({ address, iconName }: NavBtnProps) {
	return (
		<div className='nav-btn'>
			<NavLink to={address} replace>
				<button className='shadow'>
					<FontAwesomeIcon icon={iconName} className='header-icons' />
				</button>
			</NavLink>
		</div>
	);
}

export default function Header() {
	const { user } = useContext(AuthContext);

	const handleLogout = () => {
		axios
			.post(`http://${appHostUrl}:${backendPort}/auth/42/logout`, { data: { id: user?.id } })
			.then((res: AxiosResponse) => {
				if (res.data === 'OK') {
					Cookies.remove('tokenJwt');
					window.location.href = '/';
				}
			})
			.catch((error: AxiosError) => {
				console.log(error);
			});
	};

	return (
		<header className='header'>
			<div className='header-background'>
				<h1 className='header-title'>· pong ·</h1>

				<nav className='header-nav'>
					<NavBtn address={'/'} iconName={faHouse} />
					<NavBtn address={'/game'} iconName={faGamepad} />
					<NavBtn address={'/chat'} iconName={faMessage} />
					<NavBtn address={'/user'} iconName={faUser} />
				</nav>

				<LogoutBtn handleLogout={handleLogout} user={user!} />
			</div>
		</header>
	);
}
