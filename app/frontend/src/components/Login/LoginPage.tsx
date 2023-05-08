import LoginHeader from './LoginHeader';
import LoginBtn, { TmpLoginBtn } from './LoginBtn';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { Navigate } from 'react-router';
import './LoginPage.css';


export default function LoginPage() {
	const [movePaddles, setMovePaddles] = useState(false);
	const { user } = useContext(AuthContext);

	useEffect(() => {
		document.title = "Login - Pong";
	}, []);

	if (user)
		return <Navigate to={'/'} replace />;

	return (
		<div className={`login-page ${movePaddles ? "fade-anim" : ""}`}>
			<div className={`paddle left ${movePaddles ? "reverse-paddle-anim" : ""}`}></div>
			<div className={`paddle right ${movePaddles ? "reverse-paddle-anim" : ""}`}></div>
			<div className={`center ${movePaddles ? "reverse-ball-anim" : ""}`}></div>
			<LoginHeader />
			<LoginBtn setMove={setMovePaddles}/>
			{/* <TmpLoginBtn /> */}
		</div>
	);
}
