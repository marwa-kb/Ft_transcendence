import Cookies from 'js-cookie';
import { IUser } from "../../../interfaces/User";
import axios, { AxiosError, AxiosResponse } from 'axios';
import { backendPort, appHostUrl } from '../../../config';


interface Players {
	leftPlayer: IUser | null;
	rightPlayer: IUser | null;
}

export default function getPlayers(allVar: any) {
	let players: Players = {
		leftPlayer: null,
		rightPlayer: null
	};

	if (Cookies.get('tokenJwt')) {
		axios
			.get(`http://${appHostUrl}:${backendPort}/users/authid/${allVar.leftPlayerId}`,
			{
				headers: {
					Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
				},
			})
			.then((res: AxiosResponse) => {
				if (res.data)
					players.leftPlayer = res.data;
			})
			.catch((error: AxiosError) => {
				console.log(error);
			});
	}

	if (Cookies.get('tokenJwt')) {
		axios
			.get(`http://${appHostUrl}:${backendPort}/users/authid/${allVar.rightPlayerId}`,
			{
				headers: {
					Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
				},
			})
			.then((res: AxiosResponse) => {
				if (res.data)
					players.rightPlayer = res.data;
			})
			.catch((error: AxiosError) => {
				console.log(error);
			});
	}
	return (players);
}
