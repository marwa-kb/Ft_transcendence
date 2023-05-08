import React, { ChangeEvent, useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Routes, Route, useNavigate } from 'react-router-dom';

import UserIcon from "../../assets/icons/icon_user.svg";
import SettingsIcon from "../../assets/icons/icon_config.svg";
import "./UserPage.css";


export default function UserPage() {
	useEffect(() => {
		document.title = "User menu - Pong";
	}, []);

	return (
		<main className='user-main'>
			<NavLink to="/user/profile" className='user-main-link' replace>
				<img className='user-main-icon' src={UserIcon} />
				· Profile ·
				<p>
					Here, you can consult your profile,
					check your rank, your latests games and your friendlist.
				</p>
			</NavLink>
			<NavLink to="/user/settings" className='user-main-link' replace>
				<img className='user-main-icon' src={SettingsIcon} />
				· Settings ·
				<p>
					Here, you can change you username, your avatar
					and you can activate or deactivate
					the two-factor authentication.
				</p>
			</NavLink>
		</main>
	);
}
