import React, { useContext, useEffect, useRef, useState } from 'react';
import { allVar } from "./allVar";
import {AuthContext} from "../../contexts/AuthContext";
import {IUser} from "../../interfaces/User";
import gameStatus from "./gameStatus";
import socket from "../../Socket";
import { useNavigate, useParams } from "react-router-dom";
import "./GamePage.css";

import gamePageLose from "./StatusPage/gamePageLose";
import gamePageWin from "./StatusPage/gamePageWin";
import gamePageLeaverCanvas from "./StatusPage/gamePageLeaverCanvas";
import GamePageNotFound from "./StatusPage/gamePageNotFound";
import GamePageLeaverWithoutCanvas from "./StatusPage/gamePageLeaverWithoutCanvas";

import desertMap from "./Maps/DESERT.jpg"
import spaceMap from "./Maps/SPACE.jpg"

import ClassicPongImg from "../../assets/pong-images/pong.png";
import DesertPongImg from "../../assets/pong-images/desert-pong.png";
import SpacePongImg from "../../assets/pong-images/space-pong.png";

import getPlayers from './Utils/getPlayers';
import GameStatus from "./gameStatus";


interface Players {
	leftPlayer: IUser | null;
	rightPlayer: IUser | null;
}

type MapSource = {
    [key: string]: string;
}

const mapSources: MapSource = {
    DESERT: desertMap,
    SPACE: spaceMap,
};

const Pong = (
    props: JSX.IntrinsicAttributes &
        React.ClassAttributes<HTMLCanvasElement> &
        React.CanvasHTMLAttributes<HTMLCanvasElement>) => {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { user } = useContext(AuthContext);
    const game  = useParams();
    const navigate = useNavigate();
	// store players data
	const [players, setPlayers] = useState<Players>({
		leftPlayer: null,
		rightPlayer: null
	});
	const [playersReady, setPlayersReady] = useState(false);

    const [displayGame, setDisplayGame] = useState(false);

    let prev = "";
    let curr = "";
    const [isMount, setIsMount] = useState<boolean>(false);
    let fps: any, fpsInterval: number, startTime, now, then: any, elapsed: number;

    const [readyMap, setReadyMap] = useState(false);
    const [readyMode, setReadyMode] = useState(false);

    const [selectedMap, setSelectedMap] = useState<string>('');

    const [gameMode, setGameMode] = useState<string>('');

    useEffect(() => {

        if (user) {
            socket.emit('initGame', {userAuthId: user?.authId, gameId: game.id});

            socket.on('initGame', (newData: any) => {
                allVar.gameId = newData.gameId;
                allVar.scoreLeftPlayer = newData.scoreLeftPlayer;
                allVar.scoreRightPlayer = newData.scoreRightPlayer;
                allVar.leftPlayerId = newData.leftPlayerId;
                allVar.rightPlayerId = newData.rightPlayerId;
                allVar.nameLeftPlayer = newData.nameLeftPlayer;
                allVar.nameRightPlayer = newData.nameRightPlayer;
                allVar.winnerId = newData.winnerId;
                allVar.loserId = newData.loserId;
                allVar.isFinished = newData.isFinished;

                if (newData.payload === -1) {
                    setDisplayGame(false);
                } else {
                    allVar.gameStatus = gameStatus.INIT;
                    setIsMount(true);
                    setDisplayGame(true);
                }
            });
        }


        return () => {
            // console.log('Unmount');
            socket.emit('leaveGame', { userAuthId: user?.authId, gameId: game.id, gameStatus: allVar.gameStatus });
            socket.off('initGame');
        };
    }, []);

	// set players
	useEffect(() => {
		if (isMount)
		{
			setPlayers(getPlayers(allVar));
			setPlayersReady(true);
		}
	}, [isMount]);

    // Events when key pressed and "unpressed"
    const paddleMove = (event: KeyboardEvent) => {
		if (event.key === "W" ||
            event.key === "w" ||
            event.key === "S" ||
            event.key === "s" ||
            event.key === "z" ||
            event.key === "Z" ||
            event.key === "ArrowUp" ||
            event.key === "ArrowDown"
        ) {
            event.preventDefault();
            if (curr !== event.key) prev = curr;
            allVar.key = event.key;
            curr = allVar.key;
        }
    };

    const paddleStop = (event: KeyboardEvent) => {
        if (event.code === "W" ||
            event.key === "w" ||
            event.key === "S" ||
            event.key === "s" ||
            event.key === "z" ||
            event.key === "Z" ||
            event.key === "ArrowUp" ||
            event.key === "ArrowDown"
        ) {
            event.preventDefault();
            if (event.key !== prev) curr = prev;
            allVar.key = curr;
            prev = "";
        }
    };

    function handleMapSelect(map: any) {
        setSelectedMap(map);
        allVar.gameMap = new Image();
        allVar.gameMap.src = mapSources[map];
        socket.emit('mapSelect', { userAuthId: user?.authId, gameId: game.id });
    }

    function handleGameMode(mode: any) {
        setGameMode(mode);
        socket.emit('gameMode', { userAuthId: user?.authId, gameId: game.id, gameMode: mode });
    }

	// display "match found" or "select map"
	const matchFound: any = <div className='match-found'>
								<h2 className='match-found-txt'>Match found !</h2>
							</div>;

	const mapSelection: any = <div className='map-selection'>
								<h2 className='select-map-txt'>Select a map</h2>
								<button onClick={() => handleMapSelect('CLASSIC')}>
									CLASSIC
									<img className='img-map' src={ClassicPongImg}/>
								</button>
								<button onClick={() => handleMapSelect('DESERT')}>
									DESERT
									<img className='img-map' src={DesertPongImg}/>
								</button>
								<button onClick={() => handleMapSelect('SPACE')}>
									SPACE
									<img className='img-map' src={SpacePongImg}/>
								</button>
							</div>;

	const [mapContent, setMapContent] = useState<any>(matchFound);
	setTimeout(() => setMapContent(mapSelection), 1000);


    useEffect(() => {

        if (!isMount || !user)
            return;

        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        socket.emit('checkGame', {userAuthId: user.authId, gameId: game.id});


        // set up canvas dimensions
        allVar.width = canvas.width;
        allVar.height = canvas.height;

        // set up paddle dimensions and positions
        if (allVar.gameMode === 'hard') {
            allVar.paddleW = 9;
            allVar.paddleH = 55;
        } else {
            allVar.paddleW = 18;
            allVar.paddleH = 110;
        }

        allVar.leftPaddleX = 7;
        allVar.rightPaddleX = allVar.width - allVar.paddleW - 7;
        allVar.leftPaddleY = allVar.height / 2 - allVar.paddleH / 2;
        allVar.rightPaddleY = allVar.height / 2 - allVar.paddleH / 2

        // set up ball dimensions / position / speed
        allVar.ballX = allVar.width / 2;
        allVar.ballY = allVar.height / 2;
        if (allVar.gameMode === 'hard') {
            allVar.ballSize = 10;
            allVar.ballSpeed = 50;

        } else {
            allVar.ballSize = 20;
            allVar.ballSpeed = 40;
        }
        allVar.ballRadius = allVar.ballSize / 2;

        // Boucle
        let animationFrameId: number;

        // Game
        allVar.scoreLimit = 5;
        allVar.scoreLeftPlayer = 0;
        allVar.scoreRightPlayer = 0;

        // set up event listener
        document.addEventListener("keydown", paddleMove);
        document.addEventListener("keyup", paddleStop);

        // set up communication with backend
        socket.on('checkGame', (newData: any) => {
            allVar.isFinished = newData.isFinished;
            allVar.hasLeft = newData.hasLeft;
            allVar.gameMode = newData.gameMode;
        })

        socket.on('connect', () => {
            console.log('Connected to our magnificent Pong');
        });

        socket.on("paddleUpdate", (newData: any) => {
            allVar.leftPaddleY = newData.leftPaddleY;
            allVar.rightPaddleY = newData.rightPaddleY;
        });

        socket.on("ballUpdate", (newData: any) => {
            allVar.ballX = newData.ballX;
            allVar.ballY = newData.ballY;
            allVar.ballDirection.x = newData.ballDirection.x;
            allVar.ballDirection.y = newData.ballDirection.y;
            allVar.ballSpeed = newData.ballSpeed;
        });

        socket.on("scoreUpdate", (newData: any) => {
            allVar.scoreRightPlayer = newData.scoreRightPlayer;
            allVar.scoreLeftPlayer = newData.scoreLeftPlayer;
            allVar.ballSpeed = newData.ballSpeed;
        });

        socket.on("gameStart", (newData: any) => {
            allVar.ballDirection.x = newData.ballDirection.x;
            allVar.ballDirection.y = newData.ballDirection.y;
        })

        socket.on('gameStatus', (data: number) => {
            allVar.gameStatus = data;
        })

        function handleGameEnd(status: number) {
            if (status === gameStatus.LOSE) {
                gamePageLose(ctx, selectedMap);
            } else if (status === gameStatus.WIN) {
                gamePageWin(ctx, selectedMap);
            } else if (status === gameStatus.LEAVE) {
                gamePageLeaverCanvas(ctx, selectedMap);
            }
        }


        // fps rendering
        function startRendering(fps: number) {
            fpsInterval = 1000 / fps;
            then = Date.now();
            startTime = then;

            countdown(3, () => {
                render();
            });
        }

        function countdown(seconds: number, onComplete: () => void) {
            let count = seconds;
            const drawCountdown = () => {
                ctx!.clearRect(0, 0, allVar.width, allVar.height);
                ctx!.beginPath();
                ctx!.font = "bold 5rem Rajdhani";
                ctx!.fillStyle = "white";
                ctx!.textAlign = 'center';
                ctx!.fillText(count.toString(), allVar.width / 2, allVar.height / 2);
                ctx!.closePath();
            }

            const intervalId = setInterval(() => {
                count--;
                drawCountdown();
                if (count === 0) {
                    clearInterval(intervalId);
                    onComplete();
                }
            }, 1000);

            drawCountdown();
        }

        function render() {
            if (!ctx) {
                return;
            }
            animationFrameId = window.requestAnimationFrame(render);
            now = Date.now();
            elapsed = now - then;

            if (elapsed > fpsInterval) {
                then = now - (elapsed % fpsInterval)

                ctx.clearRect(0, 0, allVar.width, allVar.height);

                // Draw image
                if (selectedMap === 'DESERT')
                    ctx.drawImage(allVar.gameMap, 0, 0, allVar.width, allVar.height);
                else if (selectedMap === 'SPACE')
                    ctx.drawImage(allVar.gameMap, 0, 0, allVar.width, allVar.height);

                // Draw score
                ctx.beginPath();
                ctx.font = "bold 2.5rem Rajdhani";
                if (selectedMap === 'DESERT')
                    ctx.fillStyle = "#063842";
                else
                    ctx.fillStyle = "white";
                ctx.textAlign = 'center';
                ctx.fillText(allVar.scoreLeftPlayer + "    ║    " + allVar.scoreRightPlayer, allVar.width / 2, 40);
                ctx.closePath();

                // Draw left paddle
                ctx.beginPath();
                ctx.rect(allVar.leftPaddleX, allVar.leftPaddleY, allVar.paddleW, allVar.paddleH);
                if (selectedMap === 'DESERT')
                    ctx.fillStyle = "#063842";
                else
                    ctx.fillStyle = "white";
                ctx.fill();
                ctx.strokeStyle = 'black'; // Set the stroke color
                ctx.lineWidth = 2; // Set the stroke width
                ctx.stroke(); // Draw the stroke
                ctx.closePath();

                // Draw right paddle
                ctx.beginPath();
                ctx.rect(allVar.rightPaddleX, allVar.rightPaddleY, allVar.paddleW, allVar.paddleH);
                if (selectedMap === 'DESERT')
                    ctx.fillStyle = "#063842";
                else
                    ctx.fillStyle = "white";
                ctx.fill();
                ctx.strokeStyle = 'black'; // Set the stroke color
                ctx.lineWidth = 2; // Set the stroke width
                ctx.stroke(); // Draw the stroke
                ctx.closePath();

                // Draw ball
                ctx.beginPath();
                ctx.arc(allVar.ballX, allVar.ballY, allVar.ballRadius, 0, 2 * Math.PI);
                ctx.fillStyle = 'red';
                ctx.fill();
                ctx.strokeStyle = 'black'; // Set the stroke color
                ctx.lineWidth = 2; // Set the stroke width
                ctx.stroke(); // Draw the stroke
                ctx.closePath();


                if (readyMap && readyMode) {
                    if (allVar.key === "ArrowUp" ||
                        allVar.key === "ArrowDown" ||
                        allVar.key === "z" ||
                        allVar.key === "Z" ||
                        allVar.key === "w" ||
                        allVar.key === "W" ||
                        allVar.key === "s" ||
                        allVar.key === "S"
                    ) {
                        socket.emit("paddleMove", allVar, user!.authId);
                    }
                    if (allVar.gameStatus === gameStatus.INIT) {
                        socket.emit('gameStart', allVar, user!.authId);
                    } else if (allVar.gameStatus === gameStatus.WIN || allVar.gameStatus === gameStatus.LOSE ||
                        allVar.gameStatus === gameStatus.LEAVE) {
                        window.cancelAnimationFrame(animationFrameId)
                        socket.emit('updateUser', {userAuthId: user?.authId, gameId: game.id, gameStatus: allVar.gameStatus });
                        socket.emit('gameFinished', { gameId: allVar.gameId })
                        handleGameEnd(allVar.gameStatus);
                        // return;
                    } else if (allVar.gameStatus === gameStatus.PLAY) {
                        socket.emit("ballMove", allVar, user!.authId);
                    }
                }
            }
        }
        startRendering(60);

        return () => {
            socket.off("connect");
            socket.off("checkGame");
            socket.off("paddleUpdate");
            socket.off("ballUpdate");
            socket.off("ballDirection");
            socket.off("gameStatus");
            socket.off("scoreUpdate");
            window.cancelAnimationFrame(animationFrameId);
            document.removeEventListener("keydown", paddleMove);
            document.removeEventListener("keydown", paddleStop);
        };
    }, [isMount, selectedMap, canvasRef.current]);

	useEffect(() => {
		socket.on('mapSelected', (readyCheck: boolean) => {
            setReadyMap(readyCheck);
        });

        socket.on('modeSelected', (newData: any) => {
            setReadyMode(newData.readyCheck);
            allVar.gameMode = newData.gameMode;
        });

        socket.on('gameStatusSelect', (gameStatus: number) => {
            allVar.gameStatus = gameStatus;
            // console.log('gameStatusMapSelect ' + allVar.gameStatus);
        });

        return () => {
            socket.off("modeSelected");
            socket.off("mapSelected");
            socket.off('gameStatusMapSelect');
        };
	}, [readyMap, readyMode]);
    // render

	// disable animations when resizing window
	const [resizing, setResizing] = useState(false);
	useEffect(() => {
		function changeState() {
			setResizing(true);
		}
		window.addEventListener('resize', changeState);
		return (() => window.removeEventListener('resize', changeState));
	}, []);

	return (
        <>
			{!displayGame ? (
                <GamePageNotFound/>
			) : (
				!selectedMap && !allVar.isFinished ? (
					<div className="map-select-container">
						{mapContent}
						<div className='wait-pong-container'></div>
					</div>
				) : (
					!gameMode && !allVar.isFinished ? (
						<div className='map-select-container'>
							<div className='map-selection'>
								<h2 className='select-map-txt'>Select a mode</h2>
								<button className='mode-btn' onClick={() => handleGameMode('normal')}>
									NORMAL
									<div className='mode-details'>
										<span>normal speed</span>
										<div className='mode-separator'></div>
										<span>normal size</span>
									</div>
								</button>
								<button className='mode-btn' onClick={() => handleGameMode('hard')}>
									HARD
									<div className='mode-details'>
										<span>high speed</span>
										<div className='mode-separator'></div>
										<span>small size</span>
									</div>
								</button>
							</div>
							<div className='wait-pong-container'></div>
						</div>
					) : !readyMode && !allVar.isFinished ? (
                        allVar.gameStatus === 5 ? (
                            <GamePageLeaverWithoutCanvas />
                        ) : (
                       		<div className="map-select-container">
								<div className='wait-anim-container'>
                                    <h3>Waiting for opponent</h3>
                                    <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
                                </div>
								<div className='wait-pong-container'></div>
							</div>
                        )
					) : (
						<div className='play-main'>
							<div className='pong-main'>
								<div className='two-players-container'>
									<div className='player-container player-two' style={{animation: resizing ? 'none' : ''}}>
										<h3 style={{animation: resizing ? 'none' : ''}}>{players.leftPlayer?.username}</h3>
										<img src={players.leftPlayer?.avatar} style={{animation: resizing ? 'none' : ''}} />
									</div>
									<div className='player-container player-one' style={{animation: resizing ? 'none' : ''}}>
										<h3 style={{animation: resizing ? 'none' : ''}}>{players.rightPlayer?.username}</h3>
										<img src={players.rightPlayer?.avatar} style={{animation: resizing ? 'none' : ''}} />
									</div>
								</div>
								<div className='pong-container'>
									<canvas ref={canvasRef} height={600} width={800} className='canvas-container' {...props}/>
								</div>
							</div>
						</div>
					)
				)
            )}
        </>
    );
}

export default Pong;