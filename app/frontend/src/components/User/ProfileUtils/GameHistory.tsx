import { useContext, useState } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import './ProfileUtils.css';
import '../UserPage.css';


interface GameHistoryProps {
	gameHistory: any[];
}
	
function GameHistoryCard({ data }: any) {
	const { user } = useContext(AuthContext);
	let myScore, opScore;
	if (data.leftPlayerId === user?.authId)
	{
		myScore = data.scoreLeftPlayer;
		opScore = data.scoreRightPlayer;
	}
	else
	{
		myScore = data.scoreRightPlayer;
		opScore = data.scoreLeftPlayer;
	}
	const result = user?.authId === data.winnerId ? "win" : "lose";

	return (
		<div className={`recent-game-card game-history-card ${result}`}>
			<div className='player-info'>
				<img className='player-avatar' src={data.leftPlayer.avatar}/>
				<h5 className='player-name'>{data.leftPlayerName}</h5>
			</div>
			<h5 className='player-score'>{data.scoreLeftPlayer}</h5>
			<h5 className='hyphen'>—</h5>
			<h5 className='player-score'>{data.scoreRightPlayer}</h5>
			<div className='player-info'>
				<h5 className='player-name'>{data.rightPlayerName}</h5>
				<img className='player-avatar' src={data.rightPlayer.avatar}/>
			</div>
		</div>
	);
}
	
export default function GameHistory({ gameHistory }: GameHistoryProps) {
	if (!gameHistory.length)
		return (<h3 className='empty-games'>No game found</h3>);

	const shortGamesEl = gameHistory.slice(0, 3).map(game => {
		return (<GameHistoryCard key={game.id} data={game} />);
	});
	const allGamesEl = gameHistory.map(game => {
		return (<GameHistoryCard key={game.id} data={game} />);
	});
	const [display, setDisplay] = useState({
		gamesEl: shortGamesEl,
		btn: "Show more"		
	});

	function handleClick() {
		setDisplay(prevData => {
			return {
				gamesEl: prevData.btn === "Show more" ? allGamesEl : shortGamesEl,
				btn: prevData.btn === "Show more" ? "Show less" : "Show more"
			}
		});
	}

	return (
		<div className='game-history-container'>
			{display.gamesEl}
			{allGamesEl?.length > 3 &&
				<button className='show-more-btn' onClick={handleClick}>{display.btn}</button>
			}
		</div>
	);
}
