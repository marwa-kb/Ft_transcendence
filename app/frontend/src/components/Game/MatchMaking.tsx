import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import './GamePage.css';
import { AuthContext } from '../../contexts/AuthContext';
import socket from "../../Socket";


interface WaitingProps {
	handleClick: (() => void);
}

function Waiting({ handleClick }: WaitingProps) {
	return (
		<div className='wait-container first-wait'>
			<div className='wait-anim-container'>
				<h3>Waiting for a match</h3>
				<div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
				<button className='leave-queue-btn' onClick={() => handleClick()}>Leave Queue</button>
			</div>
			<div className='wait-pong-container'></div>
		</div>
	);
}

const MatchMaking = () => {
	const { user } = useContext(AuthContext);
	const [isInRoom, setIsInRoom] = useState(false);
	const navigate = useNavigate();
	// socket.auth = { authId: user?.authId }
	// socket.connect();

	useEffect(() => {
		socket.on("error", () => {
			setIsInRoom(false);
			window.alert("You're already in queue / in game");
		});

		socket.on("match-found", (data) => {
			setIsInRoom(false);
			navigate(`/game/${data.gameId}`); // redirect to GamePage with id from Prisma.create() in server
		});
		return () => {
			socket.off('match-found');
			socket.off("error");
			socket.emit('leaveQueue', { userAuthId: user?.authId })
		};
	}, [navigate]);


	const handleJoinGame = () => {
		socket.emit("join-room", {userId: user?.id, userAuthId: user?.authId});
		setIsInRoom(true);
	};

	const handleLeaveQueue = () => {
		socket.emit('leaveQueue', { userAuthId: user?.authId });
		setIsInRoom(false);
	}

	return (
		<div>
			{!isInRoom ? (
				<div className='join-queue-container'>
					<div className='join-queue-anim-container'>
						<div className="arrow">
							<span></span>
							<span></span>
							<span></span>
						</div>
						<button className='join-queue-btn' onClick={handleJoinGame}>Join Queue</button>
						<div className="arrow arrow2">
							<span></span>
							<span></span>
							<span></span>
						</div>
					</div>
					<p className='join-queue-container-txt'>
						You will be matched with a random player.<br/>
						If you want to play with a friend, invite them through the chat.
					</p>
				</div>
			) : (
				<Waiting handleClick={handleLeaveQueue} />
			)}
		</div>
	);
};

export default function Matchmaking() {
	useEffect(() => {
		document.title = "Play - Pong";
	}, []);
	
    return (
		<main className='game-main'>
			<MatchMaking />
		</main>
    );
}
