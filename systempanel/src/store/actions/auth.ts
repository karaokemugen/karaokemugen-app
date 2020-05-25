import Axios from 'axios';
import { Dispatch } from 'react';
import { AuthAction, LoginFailure, LoginSuccess, LogoutUser, IAuthentifactionInformation, IAuthenticationVerification } from '../../types/auth';
import i18next from 'i18next';

export async function login(username: string, password: string, dispatch: Dispatch<LoginSuccess | LoginFailure>): Promise<void>  {
    try {
	const info:IAuthentifactionInformation = await Axios.post('/auth/login', {
			username,
			password
		  });

	  if (info.role !== 'admin') {
		  throw i18next.t('USERS.ADMIN_PLEASE');
	  }

      // Store data, should be managed in a service and item should be enum and not string
      localStorage.setItem('kmToken', info.token);
      localStorage.setItem('kmOnlineToken', info.onlineToken);
      Axios.defaults.headers.common['authorization'] = info.token;
	  Axios.defaults.headers.common['onlineAuthorization'] = info.onlineToken;

      dispatch({
        type: AuthAction.LOGIN_SUCCESS,
        payload: info
      });
    } catch (error) {
      dispatch({
        type: AuthAction.LOGIN_FAILURE,
        payload: {
          error: error
        }
      });
      throw error;
    }
}

export function logout(dispatch: Dispatch<LogoutUser>): void{
  localStorage.removeItem('kmToken');
  localStorage.removeItem('kmOnlineToken');
  delete Axios.defaults.headers.common['authorization'];
  delete Axios.defaults.headers.common['onlineAuthorization'];

  dispatch({
    type: AuthAction.LOGOUT_USER
  });
}

export async function isAlreadyLogged(dispatch: Dispatch<LoginSuccess | LoginFailure>) {
  const kmToken = localStorage.getItem('kmToken');
  const kmOnlineToken = localStorage.getItem('kmOnlineToken');

  Axios.defaults.headers.common['authorization'] = kmToken;
  Axios.defaults.headers.common['onlineAuthorization'] = kmOnlineToken;

  try {
    const verification:IAuthenticationVerification = (await Axios.get('/auth/checkauth')).data;
    dispatch({
      type: AuthAction.LOGIN_SUCCESS,
      payload: {
        username: verification.username,
        role: verification.role,
        token: kmToken,
        onlineToken: kmOnlineToken
      }
    })
  } catch (error) {
    dispatch({
      type: AuthAction.LOGIN_FAILURE,
      payload: {
        error: ''
      }
    });

    throw error;
  }
}
