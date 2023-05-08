import { Link } from 'react-router-dom';

const GamePageLeaverWithoutCanvas = () => {
    return (
        <div className='game-page-not-found game-page-leave not-found-container'>
            <h1>You win !</h1>
			<h2>Your opponent left the game during map or mode selection.</h2>
            
			<img src={"https://media.giphy.com/media/9Y1wF3wx1Dex8w9wxL/giphy.gif"}/>
			
			<Link to="/game" className='not-found-link'>
				Return to Game page
			</Link>
		</div>
    );
};

export default GamePageLeaverWithoutCanvas;