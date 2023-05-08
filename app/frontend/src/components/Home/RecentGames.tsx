import { useEffect, useState } from 'react';
import axios, { AxiosError, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { backendPort, appHostUrl } from '../../config';
import './HomePage.css';


interface RecentGamesProps {
	recentGames: any[];
}

interface Avatars {
	left: string;
	right: string;
}

function RecentGameCard({ data }: any) {
	let leftWinner = "";
	let rightWinner = "";
	if (data.leftPlayerId === data.winnerId)
		leftWinner = "winner";
	else if (data.rightPlayerId === data.winnerId)
		rightWinner = "winner";

	const [avatars, setAvatars] = useState<Avatars>({
		left: "",
		right: ""
	});

	useEffect(() => {
		if (Cookies.get('tokenJwt')) {
			axios
				.get(`http://${appHostUrl}:${backendPort}/users/authid/${data.leftPlayerId}`,
				{
					headers: {
						Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
					},
				})
				.then((res: AxiosResponse) => {
					if (res.data)
					{
						setAvatars(prevData => {
							return {
								...prevData,
								left: res.data.avatar
							};
						});
					}
				})
				.catch((error: AxiosError) => {
					console.log(error);
				});
		}

		if (Cookies.get('tokenJwt')) {
			axios
				.get(`http://${appHostUrl}:${backendPort}/users/authid/${data.rightPlayerId}`,
				{
					headers: {
						Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
					},
				})
				.then((res: AxiosResponse) => {
					if (res.data)
					{
						setAvatars(prevData => {
							return {
								...prevData,
								right: res.data.avatar
							};
						});
					}
				})
				.catch((error: AxiosError) => {
					console.log(error);
				});
			}
	}, []);

	return (
		<div className='recent-game-card'>
			<div className='player-info'>
				<img className={`player-avatar ${leftWinner}`} src={avatars.left}/>
				<h5 className={`player-name ${leftWinner}`}>{data.leftPlayerName}</h5>
			</div>
			<h5 className={`player-score ${leftWinner}`}>{data.scoreLeftPlayer}</h5>
			<h5 className='hyphen'>—</h5>
			<h5 className={`player-score ${rightWinner}`}>{data.scoreRightPlayer}</h5>
			<div className='player-info'>
				<h5 className={`player-name ${rightWinner}`}>{data.rightPlayerName}</h5>
				<img className={`player-avatar ${rightWinner}`} src={avatars.right}/>
			</div>
		</div>
	);
}

export default function RecentGames({ recentGames }: RecentGamesProps) {
	if (!recentGames.length)
		return (<h3 className='empty-games'>No game found</h3>);

	const shortGamesEl = recentGames.slice(0, 4).map(game => {
		return (<RecentGameCard key={game.id} data={game} />);
	});
	
	const allGamesEl = recentGames.map(game => {
		return (<RecentGameCard key={game.id} data={game} />);
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
		<section className='recent-games-container'>
			{display.gamesEl}
			{allGamesEl?.length > 4 &&
				<button className='show-more-btn' onClick={handleClick}>{display.btn}</button>
			}
		</section>
	);
}
