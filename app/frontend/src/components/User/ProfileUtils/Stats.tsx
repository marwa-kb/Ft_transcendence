import { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { appHostUrl, backendPort } from '../../../config';
import { AuthContext } from '../../../contexts/AuthContext';
import Gold from '../../../assets/medals/gold.png';
import Silver from '../../../assets/medals/silver.png';
import Bronze from '../../../assets/medals/bronze.png';
import './ProfileUtils.css';
import '../UserPage.css';


interface StatsProps {
	gameStat: any;
	requestedUser: string;
}

export default function Stats({ gameStat, requestedUser }: StatsProps) {
	const { user } = useContext(AuthContext);
	const [rank, setRank] = useState<number>(0);

	useEffect(() => {
		async function fetchGameHistory() {
			try {
				const response = await axios.get(
					`http://${appHostUrl}:${backendPort}/users/general-information?user=${user}`,
					{
						headers: {
							Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
						},
					}
				);
				const rankData: any[] = await response.data.ranking;
				const filteredData = rankData.filter(ranked => (ranked.wins || ranked.loses));
				const index = filteredData.findIndex(ranked => (ranked?.id === requestedUser));
				setRank(index === -1 ? 0 : index + 1);
			}
			catch (error) {
				console.error(error);
			}
		}
		if (Cookies.get('tokenJwt')) {
			fetchGameHistory();
		}
	}, []);

	return (
		<div className='stats-container'>
			<div className='stats-other-container'>
				<h3 className='score-line'>{gameStat.score} <span>{gameStat.score === 1 ? "point" : "points"}</span></h3>
				<div className='separator'></div>
				<h3 className='wins-line'>{gameStat.wins} <span>wins</span></h3>
				<div className='separator'></div>
				<h3 className='loss-line'>{gameStat.losses} <span>losses</span></h3>
			</div>

			{
				requestedUser === user?.id &&
				(
					<div className='stats-rank-container'>
						<h5 className='rank-title'><span>Rank</span></h5>
						<div className='medal'>
							{
								rank === 0 ? <h4>none</h4>
								: rank === 1 ? <img src={Gold} />
								: rank === 2 ? <img src={Silver} />
								: rank === 3 ? <img src={Bronze} />
								: <h3>{rank}</h3>
							}
						</div>
					</div>
				)
			}
		</div>
	);
}
