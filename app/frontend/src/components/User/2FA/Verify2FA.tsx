import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { backendPort, appHostUrl } from '../../../config';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import './TwoFA.css';

import Header2 from '../../Header/Header2';

export default function Verify2FA() {
	const location = useLocation();
	const [code, setCode] = useState("");
	const [isCodeOk, setCodeOk] = useState("");

	useEffect(() => {
		setCodeOk("");
		if (code.length == 6) {
			if (Cookies.get('tokenJwt')) {
				axios
					.post(`http://${appHostUrl}:${backendPort}/auth/2fa/authenticate`, {
						twoFactorAuthenticationCode: code
					}, {
						headers: {
							Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
						},
					})
					.then((res) => {
						setCodeOk("input-true")
						Cookies.set('tokenJwt', res.data, {
							httpOnly: false,
							expires: new Date(Date.now() + 2 * 3600000),
						});
						setTimeout(() => {
							if (location.pathname === "/user/settings")
								window.location.reload();
							else
								window.location.replace("/");
						}, 400);
					})
					.catch(err => {
						console.log(err);
						setCodeOk("shake-input");
						setTimeout(() => setCode(""), 400);
					})
			}
		}
	}, [code]);

	return (
		<>
			{
				location.pathname !== "/user/settings" ?
				(
					<div className='verify-2fa-main'>
						<Header2 />
						<Link to="/login">Go back</Link>
						<div className='verify-2fa-login-container'>
							<h3>Two-factor authentication</h3>
							<div className='verify-2fa-container verify-2fa-login'>
								<h4>Enter your code here:</h4>
								<input
									className={isCodeOk}
									type="text"
									value={code}
									placeholder="123456"
									onChange={(e) => setCode(e.target.value)}
									ref={input => input && input.focus()} />
							</div>
						</div>
					</div>
				)
				:
				(
					<div className='verify-2fa-container'>
						<h4>Enter your code here:</h4>
						<input
							className={isCodeOk}
							type="text"
							value={code}
							placeholder="123456"
							onChange={(e) => setCode(e.target.value)}
							ref={input => input && input.focus()} />
					</div>
				)
			}
		</>
	);
}
