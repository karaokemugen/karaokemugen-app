export type Role = 'user' | 'guest' | 'admin';

export interface UserOpts {
	admin?: boolean,
	createRemote?: boolean,
	editRemote?: boolean,
	renameUser?: boolean
}

export interface Token {
	username: string,
	role: Role,
	token?: string,
	onlineToken?: string
}

export interface Tokens {
	token: string,
	onlineToken: string
}

export interface SingleToken {
	token: string
}

export interface User {
	login?: string,
	old_login?: string,
	type?: number,
	avatar_file?: string,
	bio?: string,
	url?: string,
	email?: string,
	nickname?: string,
	password?: string,
	last_login_at?: Date,
	flag_online?: boolean,
	onlineToken?: string,
	series_lang_mode?: number,
	main_series_lang?: string,
	fallback_series_lang?: string
}