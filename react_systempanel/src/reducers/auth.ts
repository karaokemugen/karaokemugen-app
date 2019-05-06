import { AUTH_USER, UNAUTH_USER, AUTH_ERROR } from '../actions/auth';

export default function(state = {}, action) {
	switch (action.type) {
	case AUTH_USER:
		return {
			...state,
			error: '',
			authenticated: true,
			username: action.username,
			role: action.role
		};
	case UNAUTH_USER:
		return { ...state, authenticated: false, username: '', role: '' };
	case AUTH_ERROR:
		return {
			...state,
			authenticated: false,
			username: '',
			role: '',
			error: action.payload
		};
	default:
		return state;
	}
}
