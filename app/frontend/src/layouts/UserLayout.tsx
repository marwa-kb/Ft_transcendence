import { useContext } from 'react';
import { Outlet, NavLink, useParams, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import UserIcon from '../assets/icons/icon_user.svg';
import SettingsIcon from '../assets/icons/icon_config.svg';


function Sidebar() {
	return (
		<section className='user-sidebar'>
			<NavLink to='profile' replace>
				<img className='user-sidebar-icon' src={UserIcon} />
				<span className='dot'>·</span>
				<span className='title'>Profile</span>
			</NavLink>
			<NavLink to='settings' replace>
				<img className='user-sidebar-icon' src={SettingsIcon} />
				<span className='dot'>·</span>
				<span className='title'>Settings</span>
			</NavLink>
		</section>
	);
}

export default function UserLayout() {
	const location = useLocation();
	const profileId = location.pathname.startsWith("/user/profile/") ? useParams() : "";

	return (
		<div className='user-container'>
			{!profileId && 
				<>
					<Sidebar />
					<div className='vertical-line'></div>
				</>
			}
			<Outlet />
		</div>
	);
}
