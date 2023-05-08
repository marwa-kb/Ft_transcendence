import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { backendPort, appHostUrl } from "../../config";
import axios from "axios";
import Cookies from "js-cookie";
import { Link } from "react-router-dom";
import Ranking from "./Ranking";
import RecentGames from "./RecentGames";
import "./HomePage.css";

export default function HomePage() {
	const { user } = useContext(AuthContext);
	const [ranking, setRanking] = useState([]);
	const [games, setGames] = useState([]);
	const [usersStatus, setUsersStatus] = useState([]);
	const [showFriends, setShowFriends] = useState([]);
	const [friendId, setFriendId] = useState('');
	const [showDropdown, setShowDropdown] = useState(false);
	const [selectedUser, setSelectedUser] = useState(null);
	const [showMenu, setShowMenu] = useState(false);

	useEffect(() => {
		document.title = "Home - Pong";
	}, []);

	useEffect(() => {
		async function fetchGeneralInformation() {
			try {
				const response = await axios.get(
					`http://${appHostUrl}:${backendPort}/users/general-information?user=${user}`,
					{
						headers: {
							Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
						},
					}
				);
				//Top 3 users information
				const rankingData = await response.data.ranking;

				setRanking(rankingData);

				//Recent games information
				const recentGamesData = await response.data.games;

				setGames(recentGamesData);

				//Online users information
				const usersStatusData = await response.data.usersStatus;
				setUsersStatus(usersStatusData);

				//My friends information
				const FriendsData = await response.data.friends;
				setShowFriends(FriendsData);
			} catch (error) {
				console.error(error);
			}
		}
		if (Cookies.get('tokenJwt')) {
			fetchGeneralInformation();
		}
	}, []);

	const handleUsernameClick = () => {
		setShowDropdown(!showDropdown);
	};


	const handleOpenMenu = (userId: any) => {
		setSelectedUser(userId);
		setShowMenu(true);
	};

	const handleCloseMenu = () => {
		setShowMenu(false);
		setSelectedUser(null);
	};

	const handleAddFriend = async (friendId: string) => {
		try {
			const response = await axios.post(
				`http://${appHostUrl}:${backendPort}/users/${user?.id}/add-friend`,
				{ friendId: friendId }
			);
			alert('Friend added successfully');
			window.location.reload();
		} catch (error) {
			console.error(error);
		}
	};

	return (
		<main className='home-main'>
			<div className='welcome-msg'>
				<div className='horizontal-line'></div>
				<h1>· welcome{user?.isKnown && " back"} ·</h1>
				<span>{user?.username}</span>
				<div className='horizontal-line green-hl'></div>
			</div>

			<section className='main-boxes-container'>
				<div className='main-box podium'>
					<h2>· User ranking ·</h2>
					<Ranking rankingData={ranking} />
				</div>

				<span className='ball-span'></span>

				<div className='main-box recent-games'>
					<h2>· Recent games ·</h2>
					<RecentGames recentGames={games} />
				</div>

{/* For Pascal front-end in chat page ----> 
				<h1>Users</h1>
				{usersStatus
					.filter((anyUser: any) => anyUser.id !== user?.id)
					.map((anyUser: any) => (
						<div key={anyUser.id}>
							{anyUser.status === 'ONLINE' ? (
								<span
									style={{
										backgroundColor: 'green',
										borderRadius: '50%',
										display: 'inline-block',
										width: '10px',
										height: '10px',
										marginRight: '4px',
									}}
								></span>
							) : anyUser.status === 'OFFLINE' ? (
								<span
									style={{
										backgroundColor: 'grey',
										borderRadius: '50%',
										display: 'inline-block',
										width: '10px',
										height: '10px',
										marginRight: '4px',
									}}
								></span>
							) : anyUser.status === 'INGAME' ? (
								<span
									style={{
										backgroundColor: 'red',
										borderRadius: '50%',
										display: 'inline-block',
										width: '10px',
										height: '10px',
										marginRight: '4px',
									}}
								></span>
							) : (
								<span
									style={{
										backgroundColor: 'yellow',
										borderRadius: '50%',
										display: 'inline-block',
										width: '10px',
										height: '10px',
										marginRight: '4px',
									}}
								></span>
							)}
							<span onClick={() => handleOpenMenu(anyUser.id)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>
								{anyUser.username}
							</span>
							{showMenu && selectedUser === anyUser.id && (
								<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
									<Link to={`/user/profile/${anyUser.id}`} className="btn">Profile</Link>
									<button onClick={() => handleAddFriend(anyUser.id)} className="btn">Add Friend</button>
								</div>
							)}
						</div>
					))}
				<h1>Friends</h1>
				{showFriends
					.filter((anyUser: any) => anyUser.id !== user?.id)
					.map((anyUser: any) => (
						<div key={anyUser.id}>
							{anyUser.status === 'ONLINE' ? (
								<span
									style={{
										backgroundColor: 'green',
										borderRadius: '50%',
										display: 'inline-block',
										width: '10px',
										height: '10px',
										marginRight: '4px',
									}}
								></span>
							) : anyUser.status === 'OFFLINE' ? (
								<span
									style={{
										backgroundColor: 'grey',
										borderRadius: '50%',
										display: 'inline-block',
										width: '10px',
										height: '10px',
										marginRight: '4px',
									}}
								></span>
							) : anyUser.status === 'INGAME' ? (
								<span
									style={{
										backgroundColor: 'red',
										borderRadius: '50%',
										display: 'inline-block',
										width: '10px',
										height: '10px',
										marginRight: '4px',
									}}
								></span>
							) : (
								<span
									style={{
										backgroundColor: 'yellow',
										borderRadius: '50%',
										display: 'inline-block',
										width: '10px',
										height: '10px',
										marginRight: '4px',
									}}
								></span>
							)}
							<span onClick={() => handleOpenMenu(anyUser.id)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>
								{anyUser.username}
							</span>
							{showMenu && selectedUser === anyUser.id && (
								<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
									<Link to={`/user/profile/${anyUser.id}`} className="btn">Profile</Link>
								</div>
							)}
						</div>
					))}
				 <-----For Pascal front-end in chat page */}
			</section >
		</main >
	);
}