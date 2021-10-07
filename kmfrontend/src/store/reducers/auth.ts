import { AuthAction, AuthStore, LoginFailure, LoginSuccess, LogoutUser } from '../types/auth';

export const initialStateAuth: AuthStore = {
	data: {
		token: '',
		onlineToken: '',
		role: '',
		username: ''
	},
	isAuthenticated: false,
	error: ''
};

export default function (state, action: LoginSuccess | LoginFailure | LogoutUser) {
	switch (action.type) {
		case AuthAction.LOGIN_SUCCESS:
			return {
				...state,
				isAuthenticated: true,
				data: {
					...action.payload
				},
				error: ''
			};
		case AuthAction.LOGIN_FAILURE:
			return {
				...state,
				isAuthenticated: false,
				data: {
					token: '',
					onlineToken: '',
					role: '',
					username: ''
				},
				error: action.payload.error
			};
		case AuthAction.LOGOUT_USER:
			return {
				...state,
				isAuthenticated: false,
				data: {
					token: '',
					onlineToken: '',
					role: '',
					username: ''
				},
				error: ''
			};
		default:
			return state;
	}
}
