import "./HomePage.css";


interface PodiumProps {
	topUsers: any[];
}

interface RankingProps {
	rankingData: any[];
}

function Podium({ topUsers }: PodiumProps) {
	const usersEl = topUsers.map((user:any, index) => {
		return (
			<div key={user.id} className={`podium-item podium-${index + 1}`}>
				<div className='podium-info'>
					<h4 className='podium-name'>{user.username}</h4>
					<img src={user.avatar} className='podium-avatar'/>
					<h4 className='podium-score'><span>+{user.wins}</span><span>-{user.loses}</span></h4>
				</div>
				<div className='podium-color'>
					<h4 className='podium-number'>{index + 1}</h4>
				</div>
			</div>
		);
	});

	return (
		<section className='podium-container'>
			{usersEl}
		</section>
	);
}

export default function Ranking({ rankingData }: RankingProps) {
	const ranking = rankingData.filter(user => (user.wins || user.loses));
	if (ranking.length <= 1)
		return (<h3 className='empty-ranking'>No ranking found</h3>);

	const podiumEl = <Podium topUsers={ranking.slice(0, 3)} />;
	const remainingUsers = ranking.slice(3, 7);

	const remainingEl = remainingUsers?.map((user: any, index) => {
		return (
			<div key={user.id} className='rank-card'>
				<h4 className='rank-number'>{index + 4}</h4>
				<div className='rank-info'>
					<img className='rank-avatar' src={user.avatar}/>
					<h4 className='rank-name'>{user.username}</h4>
				</div>
				<h4 className='rank-score'><span>+{user.wins}</span><span>-{user.loses}</span></h4>
			</div>
		)
	});

	return (
		<section className='ranking-container'>
			{podiumEl}
			{remainingUsers && 
				(<div className='rank-cards-container'>
					{remainingEl}
				</div>)
			}
		</section>
	);
}
