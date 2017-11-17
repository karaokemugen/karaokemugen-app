import axios from 'axios';
import {stringify} from 'qs';

export const AUTH_USER = 'auth_user';
export const UNAUTH_USER = 'unauth_user';
export const AUTH_ERROR = 'auth_error';

export function login(username, password) {
	return function(dispatch) {
		axios.post('/api/login',
			stringify({username: username, password: password}),
			{
				headers: { 'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8' }
			}
		)
			.then(response => {
				localStorage.setItem('kmToken', response.data.token);
				dispatch({
					type: AUTH_USER,
					username: username
				});
			})
			.catch(err => dispatch(authError('Bad login info: ' + err)));
	};
}

export function authError(error) {
	return {
		type: AUTH_ERROR,
		payload: error
	};
}

export function logout() {
	return function (dispatch) {
		localStorage.removeItem('kmToken');
		dispatch({ type: UNAUTH_USER });
	};
}
