import { Navigate, Outlet } from 'react-router';
import { IUser } from '../../interfaces/User';
import socket from '../../Socket';
import {useEffect} from 'react';

interface ProtectedRouteProps {
  user: IUser;
  redirectPath: string;
}
export default function ProtectedRoute({
  user,
  redirectPath,
}: ProtectedRouteProps) {
  useEffect(() => {
    if (user) {
      socket.auth = { authId: user.authId };
      socket.connect();

      return () => {
        socket.disconnect();
      };
    }
  }, []);

  if (!user) {
    return <Navigate to={redirectPath} replace />;
  }
  return <Outlet />;
}
