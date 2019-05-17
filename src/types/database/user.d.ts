interface DBUserBase {
	login: string,
	nickname: string,
	avatar_file: string
}

export interface DBUser extends DBUserBase {
	type: number,
	password: string,
	bio: string,
	url: string,
	email: string,
	fingerprint: string,
	last_login_at: Date,
	flag_online: boolean
}

export interface DBGuest extends DBUserBase {
	available: boolean
}

export interface RemoteToken {
	token: string,
	username: string
}