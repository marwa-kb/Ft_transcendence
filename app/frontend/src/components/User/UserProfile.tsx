import React, { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { backendPort, appHostUrl } from '../../config';
import { useParams } from 'react-router';
import { IUser } from '../../interfaces/User';
import axios from 'axios';
import Cookies from 'js-cookie';
import Stats from "./ProfileUtils/Stats"
import GameHistory from "./ProfileUtils/GameHistory"
import Friends from "./ProfileUtils/Friends"
import './UserPage.css';


export default function UserProfile() {
	const { user } = useContext(AuthContext);
	const { id } = useParams();
	const [dataOk, setDataOk] = useState(true);
	const [gameHistory, setGameHistory] = useState([]);
	const [requestedUser, setRequestedUser] = useState<IUser | null>(null);
	const [showMutualFriends, setShowMutualFriends] = useState([]);
	const [showOnewayFriends, setShowOnewayFriends] = useState([]);
	const [gameStat, setGameStat] = useState({
		wins: 0,
		losses: 0,
		score: 0,
	});

	useEffect(() => {
		document.title = "Profile - Pong";
	}, []);

	useEffect(() => {
		async function fetchProfile() {
			try {
				const response = await axios.get(
					`http://${appHostUrl}:${backendPort}/users/${id ? id : user?.id}/profile`,
					{
						headers: {
							Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
						},
					}
				);
				if (!response.data)
					throw new Error("Error while fetching profile data.");

				setDataOk(true);

				//User data-profile information
				const userData = response.data.user;
				setRequestedUser(userData);

				//Match history
				const matchHistory = response.data.games;
				setGameHistory(matchHistory);

				//Game statistics
				const gameStatistic = response.data.stats;
				setGameStat(gameStatistic);

				//Mutual friends information
				const mutualFriendsData = await response.data.mutualFriends;
				setShowMutualFriends(mutualFriendsData);

				//Oneway friends information
				const onewayFriendsData = await response.data.onewayFriends;
				setShowOnewayFriends(onewayFriendsData);

			} catch (error) {
				setDataOk(false);
			}
		}
		if (Cookies.get('tokenJwt')) {
			fetchProfile();
		}
	}, []);

	if (!dataOk)
		return <Navigate to={'/user/profile/not-found'} replace />;

	return (
		<section className='user-profile'>
			<div className='user-profile-container'>
				<div className='profile-first-container'>
					<div className='user-info'>
						<h1>{requestedUser?.username}</h1>
						<h4>{requestedUser?.email}</h4>
					</div>
					<img src={requestedUser?.avatar} />
				</div>

				<div className='profile-text stats'>
					<h2>Stats</h2>
					<Stats gameStat={gameStat} requestedUser={id ? id : user?.id}/>
				</div>

				<div className='profile-text history'>
					<h2>Game history</h2>
					<GameHistory gameHistory={gameHistory} />
				</div>

				<div className='profile-text friends'>
					<h2>Friends</h2>
					<Friends mutual={showMutualFriends} oneway={showOnewayFriends} />
				</div>
			</div>
		</section>
	);
}