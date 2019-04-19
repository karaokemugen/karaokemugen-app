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
	token?: string
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
	onlineToken?: string
}