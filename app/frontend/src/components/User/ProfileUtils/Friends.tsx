import './ProfileUtils.css';
import '../UserPage.css';


interface FriendsProps {
	mutual: any[];
	oneway: any[];
}

export default function Friends({ mutual, oneway }: FriendsProps) {
	const mutualEl = mutual && mutual.length > 0 &&
					mutual.map((anyUser: any) => {
						return (
							<a href={`/user/profile/${anyUser.id}`} className='friend-card mutual' title='Mutual friend' key={anyUser.id}>
								<img src={anyUser.avatar}/>
								<span>{anyUser.username}</span>
							</a>);
					});

	const onewayEl = oneway && oneway.length > 0 &&
					oneway.map((anyUser: any) => {
						return (
							<a href={`/user/profile/${anyUser.id}`} className='friend-card oneway' title='This user did not add you back as a friend' key={anyUser.id}>
								<img src={anyUser.avatar}/>
								<span>{anyUser.username}</span>
							</a>);
					});

	if ((!mutualEl || mutualEl.length < 1) && (!onewayEl || onewayEl.length < 1))
		return (<h3 className='empty-friends'>No friend added</h3>);

	return (
		<div className='friends-container'>
			{mutualEl}
			{onewayEl}
		</div>
	);
}
