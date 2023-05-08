import { Link } from 'react-router-dom';
import * as https from "https";


const GamePageNotFound = () => {
    return (
        <div className='game-page-not-found not-found-container'>
			<h1>
				Sorry, the game you requested does not exist.
			</h1>
			
            <img src={"https://media.giphy.com/media/ISOckXUybVfQ4/giphy.gif"}/>

			<Link to="/game" className='not-found-link'>
				Return to Game page
			</Link>
        </div>
    );
};

export default GamePageNotFound;