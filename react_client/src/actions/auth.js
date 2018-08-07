import axios from 'axios';
import {stringify} from 'qs';
import {goBack} from 'react-router-redux';

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
				localStorage.setItem('username', response.data.username);
				axios.defaults.headers.common['authorization'] = response.data.token;
				dispatch({
					type: AUTH_USER,
					username: response.data.username,
					role: response.data.role
				});
				dispatch(goBack()); // Retour à la page précédente.
			})
			.catch(err => dispatch(authError('Bad login info: ' + err)));
	};
}

export function checkAuth() {
	return function(dispatch) {
		axios.get('/api/checkauth')
			.then(response => {
				localStorage.setItem('username', response.data.username);
				dispatch({
					type: AUTH_USER,
					username: response.data.username,
					role: response.data.role
				});
			})
			.catch(err => dispatch({ type: UNAUTH_USER }));
	};
}

export function authError(error) {
	return {
		type: AUTH_ERROR,
		payload: error
	};
}

export function logout() {
	localStorage.removeItem('kmToken');
	delete axios.defaults.headers.common['authorization'];
	return { type: UNAUTH_USER };
}
