import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header2 from '../Header/Header2';
import "./NotFound.css"


export default function NotFound() {
	useEffect(() => {
		document.title = "Page not found - Pong";
	}, []);

    return (
		<>
			<Header2 />
			<div className='not-found-container'>
				<h1>
					Sorry, the page you are looking for could not be found.
				</h1>
				<Link to="/" className='not-found-link'>
					Return to Home
				</Link>
        	</div>
		</>
    );
}
