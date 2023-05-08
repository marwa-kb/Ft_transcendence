import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { backendPort, appHostUrl } from '../../../config';
import loadingImg from '/src/assets/loader.svg';
import Verify2FA from './Verify2FA';
import './TwoFA.css';

export default function Register2FA() {
	const [image, setImage] = useState(null);
	const scrollToRef1 = useRef<HTMLDivElement>(null);
	const scrollToRef2 = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (Cookies.get('tokenJwt')) {
			axios
			.post(`http://${appHostUrl}:${backendPort}/auth/2fa/generate`, {
				}, {
					headers: {
						Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
					},
				})
				.then((res) => {
					scrollToRef1?.current?.scrollIntoView({ behavior:"smooth" });
					setImage(res.data);
				})
		}
	}, []);

	useEffect(() => {
		scrollToRef2?.current?.scrollIntoView({ behavior:"smooth" });
	}, [image]);

	return (
		<div className='register-2fa-container'>
			{
				image === null ?
				<>
					<img src={loadingImg} style={{ marginBottom: "0" }} />
					<div ref={scrollToRef1}></div>
				</>
				:
				<>
					<h4>
						Open Google Authenticator and 
						scan the following QR Code:
					</h4>
					<img src={image} />
					<Verify2FA />
					<div ref={scrollToRef2}></div>
				</>
			}
		</div>
	);
}
