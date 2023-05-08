import './App.css';

import { useContext } from 'react';
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom';
import Cookies from 'js-cookie';

// context
import { AuthContext } from './contexts/AuthContext';

// layouts
import Layout from './layouts/Layout';
import UserLayout from './layouts/UserLayout';

// pages
import LoginPage from './components/Login/LoginPage';
import HomePage from './components/Home/HomePage';
import UserPage from './components/User/UserPage';
import UserProfile from './components/User/UserProfile';
import UserSettings from './components/User/UserSettings';
import Verify2FA from './components/User/2FA/Verify2FA';
import Pong from './components/Game/Pong';
import ChatPage from './components/Chat/ChatPage';
import ProtectedRoute from './components/Routes/ProtectedRoute';
import NotFound from './components/NotFound/NotFound';
import Matchmaking from './components/Game/MatchMaking';
import ProfileNotFound from './components/User/ProfileNotFound';

function App() {
	const { user, loading } = useContext(AuthContext);

	return loading ? (
		<></>
	) : (
		<BrowserRouter>
			<Routes>
				<Route path='/login' element={<LoginPage />} />
				<Route path='/2fa/ver' element={<Verify2FA />} />

				<Route element={<ProtectedRoute user={user!} redirectPath='/login' />}>
					<Route path='/' element={<Layout />}>
						<Route index element={<HomePage />} />
						<Route path='/game' element={<Matchmaking />} />
						<Route path='/game/:id' element={<Pong />} />
						<Route path='/chat' element={<ChatPage />} />
						<Route path='user' element={<UserPage />} />

						<Route path='user' element={<UserLayout />}>
							<Route path='profile' element={<UserProfile />} />
							<Route path='profile/:id' element={<UserProfile />}/>
							<Route path='profile/not-found' element={<ProfileNotFound />}/>
							<Route path='settings' element={<UserSettings />} />
						</Route>
					</Route>
				</Route>
				
				<Route path='*' element={<NotFound />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
