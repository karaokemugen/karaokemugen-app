// Action name
export enum AuthAction {
	LOGIN_SUCCESS = 'login_success',
	LOGIN_FAILURE = 'login_failure',
	LOGOUT_USER = 'logout_user',
}

// Dispatch action
export interface LoginSuccess {
	type: AuthAction.LOGIN_SUCCESS;
	payload: IAuthentifactionInformation;
}

export interface LoginFailure {
	type: AuthAction.LOGIN_FAILURE;
	payload: {
		error: string;
	};
}

export interface LogoutUser {
	type: AuthAction.LOGOUT_USER;
}

// Store

export interface AuthStore {
	data: IAuthentifactionInformation;
	isAuthenticated: boolean;
	error: string;
}

export interface IAuthentifactionInformation {
	token: string;
	onlineToken?: string;
	username: string;
	role: string;
	onlineAvailable?: boolean;
}
