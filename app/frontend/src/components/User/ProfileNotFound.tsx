import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import "../NotFound/NotFound.css"
import './UserPage.css';


export default function ProfileNotFound() {
	useEffect(() => {
		document.title = "Profile not found - Pong";
	}, []);

	return (
		<>
			<div className='not-found-container profile-not-found-container'>
				<h1>
					Sorry, the profile you are looking for could not be found.
				</h1>
				<Link to="/user/profile" className='not-found-link'>
					Return to my profile
				</Link>
			</div>
		</>
	);
}
