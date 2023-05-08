import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { backendPort, appHostUrl } from '../../../config';
import './TwoFA.css';

export default function TurnOff2FA() {
	const [isClicked, setClicked] = useState(false);
	
	useEffect(() => {
		if (!isClicked)
			return ;
		if (Cookies.get('tokenJwt')) {
			axios
				.post(`http://${appHostUrl}:${backendPort}/auth/2fa/turnoff`, {
				}, {
				headers: {
					Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
					},
				})
				.then((res) => {
					window.location.reload();
				})
			}
	}, [isClicked]);

	return (
		<div className='turnoff-2fa-container'>
			<h4>
				Are you sure you want to deactivate
				the two-factor authentication ?
			</h4>
			<div className='btn-container'>
				<button onClick={() => setClicked(true)}>Yes</button>
				<button onClick={() => window.location.reload()}>No</button>
			</div>
		</div>
	);
}
