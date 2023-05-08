import { createContext, useEffect, useMemo, useState } from 'react';
import axios, { AxiosError, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { backendPort, appHostUrl } from '../config';
import { IAuthContext } from '../interfaces/AuthContext.interface';
import { IUser } from '../interfaces/User';

let isAuth = false;

export const AuthContext = createContext({} as IAuthContext);
export default function AuthContextProvider(props: any) {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);

  const data = useMemo(() => ({ user, setUser, loading, setLoading }), [user, loading]);

  useEffect(() => {
    if (!isAuth && Cookies.get('tokenJwt')) {
      isAuth = true;
      setLoading(true);
      axios
        .get(`http://${appHostUrl}:${backendPort}/users/me`, {
          headers: {
            Authorization: 'Bearer ' + Cookies.get('tokenJwt'),
          },
        })
        .then((res: AxiosResponse) => {
          if (res.data) {
            setUser({
              id: res.data.id,
              authId: res.data.authId,
              username: res.data.username,
              email: res.data.email,
              avatar: res.data.avatar,
              twoFactorSecret: res.data.twoFactorSecret,
              isTwoFactorEnabled: res.data.isTwoFactorEnabled,
              status: res.data.status,
              isKnown: res.data.isKnown,
              createdAt: res.data.createdAt,
              updatedAt: res.data.updatedAt,
              wins: res.data.wins,
              loses: res.data.loses,
              usersBlocked: res.data.usersBlocked,
            });
          }
        })
        .catch((err: AxiosError) => {
          console.log(err);
        })
        .finally(() => setLoading(false));
    } else if (!isAuth) {
      setLoading(false);
    }
  }, []);

  return <AuthContext.Provider value={data}>{props.children}</AuthContext.Provider>;
}
