import io from 'socket.io-client';
import { backendPort, appHostUrl } from './config';

const socket = io(`http://${appHostUrl}:${backendPort}`, { autoConnect: false });

export default socket;
