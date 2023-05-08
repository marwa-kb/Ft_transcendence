import LoginBtn from './LoginBtn';
import './LoginPage.css';

export default function Header()
{
	return (
		<header className="login-header">
			<h1 className="login-header-title">· pong ·</h1>
			<hr style={{border:"1px solid rgba(255,255,255,0.2)"}}/>
		</header>
	);
}
