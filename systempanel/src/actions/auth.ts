import axios from 'axios';
import { Dispatch } from 'react';
import { AuthentifactionApi } from '../api/authentication.api';
import { AuthAction, LoginFailure, LoginSuccess, LogoutUser } from '../types/auth';

const adminMessage = 'Please use an admin account';

export async function login(username: string, password: string, dispatch: Dispatch<LoginSuccess | LoginFailure>): Promise<void>  {
    try {
      const info = await AuthentifactionApi.login(username, password)

	  if (info.role !== 'admin') {
		  throw adminMessage;
	  }

      // Store data, should be managed in a service and item should be enum and not string
      localStorage.setItem('kmToken', info.token);
      localStorage.setItem('kmOnlineToken', info.onlineToken);
      axios.defaults.headers.common['authorization'] = info.token;
      axios.defaults.headers.common['onlineAuthorization'] = info.onlineToken;

      dispatch({
        type: AuthAction.LOGIN_SUCCESS,
        payload: info
      });
    } catch (error) {
      dispatch({
        type: AuthAction.LOGIN_FAILURE,
        payload: {
          error: error === adminMessage ? error : 'Bad login info: ' + error
        }
      });

      throw error;
    }
}

export function logout(dispatch: Dispatch<LogoutUser>): void{
  localStorage.removeItem('kmToken');
  localStorage.removeItem('kmOnlineToken');
  delete axios.defaults.headers.common['authorization'];
  delete axios.defaults.headers.common['onlineAuthorization'];

  dispatch({
    type: AuthAction.LOGOUT_USER
  });
}

export async function isAlreadyLogged(dispatch: Dispatch<LoginSuccess | LoginFailure>) {
  const kmToken = localStorage.getItem('kmToken');
  const kmOnlineToken = localStorage.getItem('kmOnlineToken');

  axios.defaults.headers.common['authorization'] = kmToken;
  axios.defaults.headers.common['onlineAuthorization'] = kmOnlineToken;

  try {
    const verification = await AuthentifactionApi.isAuthenticated();
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
