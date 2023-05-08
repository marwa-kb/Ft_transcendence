import axios from 'axios';
import Cookies from 'js-cookie';
import { ChangeEvent, useContext, useEffect, useRef, useState } from 'react';
import { backendPort, appHostUrl } from '../../config';
import { AuthContext } from '../../contexts/AuthContext';
import Register2FA from './2FA/Register2FA';
import TurnOff2FA from './2FA/TurnOff2FA';
import './UserPage.css';
import { isAlphanumeric } from '../../functions/isAlphanumeric';

interface UserData {
	name: string;
	avatarStr: string;
	avatarUrl: any;
	is2faEnabled: boolean;
}

interface TwoFAData {
	active: boolean;
	content: JSX.Element;
}

const imageMimeType = /image\/(png|jpg|jpeg)/i;

export default function UserSettings() {
	const { user } = useContext(AuthContext);
	const inputEl = useRef<HTMLInputElement>(null);
	const [data, setData] = useState<UserData>({
		name: '',
		avatarStr: '',
		avatarUrl: null,
		is2faEnabled: user!.isTwoFactorEnabled,
	});
	const [show2fa, setShow2fa] = useState<TwoFAData>({
		active: false,
		content: <></>,
	});
	const [usernameExists, setUsernameExists] = useState(false);
	const [usernameSpecialChar, setusernameSpecialChar] = useState(true);
	const [avatarFileOk, setAvatarFileOk] = useState(true);

	useEffect(() => {
		document.title = "Settings - Pong";
	}, []);

	// update data with user input
	async function handleChange(event: ChangeEvent<HTMLInputElement>) {
		const { name, value, type, checked } = event.target;
		setData((prevData) => {
			return {
				...prevData,
				[name]: type === 'checkbox' ? checked : value,
			};
		});

		if (name === 'name') {
			//Check if username has any special characters or not
			if (value.length > 0 && !isAlphanumeric(value)) {
				setusernameSpecialChar(false);
				return;
			}
			else
				setusernameSpecialChar(true);

			//Check if username exists
			if (Cookies.get('tokenJwt')) {
				const response = await axios.get(
					`http://${appHostUrl}:${backendPort}/users/check-username/${value}`,
					{
						headers: {
							Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
						},
					}
				);
				if (response.data.usernameExists)
					setUsernameExists(true);
				else
					setUsernameExists(false);
			}
		}
		else if (name === 'avatarStr') {
			const objectURL = URL.createObjectURL(inputEl!.current!.files![0]);
			setData((prevData) => {
				return {
					...prevData,
					avatarUrl: objectURL,
				};
			});

			const avatar = inputEl!.current!.files![0];
			if (!avatar.type.match(imageMimeType))
				setAvatarFileOk(false);
			else
				setAvatarFileOk(true);
		}
	}

	// handle changes of username, avatar or 2FA
	async function handleUsername() {
		try {
			// If username doesn't exist, update the username with new username
			if (Cookies.get('tokenJwt')) {
				await axios.put(
					`http://${appHostUrl}:${backendPort}/users/${user!.id}`,
					{
						username: data.name,
					},
					{
						headers: {
							Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
						},
					}
				);
				user!.username = data.name;
				setData((prevData) => {
					return {
						...prevData,
						name: '',
					};
				});
			}
			alert('Username updated successfully!');
			window.location.reload();
		}
		catch (error) {
			console.error(error);
			alert('An error occurred while updating your username. Please try again later.');
		}
	}

	async function handleAvatar() {
		const avatar = inputEl!.current!.files![0];
		const formData = new FormData();
		formData.append('file', avatar || '{}');
		if (Cookies.get('tokenJwt')) {
			const response = await axios
				.post(`http://${appHostUrl}:${backendPort}/users/upload-avatar`, formData,
					{
						headers: {
							Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
						}
					});
			user!.avatar = response.data.url;
			alert('Avatar updated successfully!');
			window.location.reload();
		}
	};

	function handle2FA() {
		setShow2fa({
			active: true,
			content: data.is2faEnabled ? <Register2FA /> : <TurnOff2FA />
		});
	}

	function removeElement(toRemove: string) {
		if (toRemove === "avatar") {
			setData(prevData => {
				return {
					...prevData,
					avatarStr: "",
					avatarUrl: null
				};
			});
		}
		else if (toRemove === "2fa") {
			setShow2fa({
				active: false,
				content: <></>
			});
			setData((prevData) => {
				return {
					...prevData,
					is2faEnabled: !data.is2faEnabled
				};
			});
		}

	}

	return (
		<section className='user-settings'>
			<div className='card name'>
				<label htmlFor='change-username'>Change username</label>
				<div className='card-container'>
					<input
						id='change-username'
						className={usernameExists || !usernameSpecialChar ? "shake-input" : ""}
						name='name'
						value={data.name}
						onChange={handleChange}
						style={usernameExists || !usernameSpecialChar ? { color: '#FD4040' } : {}}
						type='text'
					/>
					<button
						className='save-btn'
						disabled={data.name.length < 1 || usernameExists || !usernameSpecialChar}
						onClick={handleUsername}
					>
						save
					</button>
				</div>
				{
					!usernameSpecialChar ? (
						<div className='username-error username-error-char'>
							Sorry, the username must:
							<ul>
								<li>only contain letters, numbers, and hyphens.</li>
								<li>be less than 12 characters in length.</li>
							</ul>
						</div>
					) : usernameExists &&
					(
						<p className='username-error'>
							Sorry, that username is already taken.<br/>
							Please choose a different username.
						</p>
					) 
				}
			</div>

			<span className='ball-span'></span>

			<div className='card'>
				<label htmlFor='change-avatar'>Change avatar</label>
				<div className='card-container avatar-container'>
					<input
						id='change-avatar'
						name='avatarStr'
						ref={inputEl}
						value={data.avatarStr}
						onChange={handleChange}
						type='file'
						accept='jpeg, .jpg, .png'
					/>
					<button
						className='save-btn'
						onClick={handleAvatar}
						disabled={data.avatarStr.length === 0 || !avatarFileOk}
					>
						save
					</button>
				</div>
				{
					!avatarFileOk ? (
						<p className='username-error'>
							Uploaded file is not a valid image. <br/>
							Only JPEG, JPG and PNG files are allowed.
						</p>
					) : data.avatarUrl && (
						<div className='preview-container'>
							<h6 className='x-quit' onClick={() => removeElement("avatar")}>x</h6>
							<h5 className='preview-text'>Preview:</h5>
							<img src={data.avatarUrl} />
						</div>
					)
				}
			</div>

			<span className='ball-span'></span>

			<div className='card special-card'>
				<div className='card-container'>
					<label htmlFor='change-2fa'>Manage two-factor authentication</label>
					<input
						id='change-2fa'
						name='is2faEnabled'
						checked={data.is2faEnabled}
						onChange={handleChange}
						type='checkbox'
					/>
					<button
						className='save-btn save-2fa-btn'
						onClick={handle2FA}
						disabled={data.is2faEnabled === user!.isTwoFactorEnabled}
					>
						save
					</button>
				</div>
				{
					show2fa.active &&
					<div className='twofa-container'>
						<h6 className='x-quit' onClick={() => removeElement("2fa")}>x</h6>
						{show2fa.content}
					</div>
				}
			</div>
		</section>
	);
}
