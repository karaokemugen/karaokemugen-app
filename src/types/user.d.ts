export interface UserOpts {
	admin?: boolean,
	createRemote?: boolean,
	editRemote?: boolean,
	renameUser?: boolean,
	noPasswordCheck?: boolean,
}

export interface Tokens {
	token: string,
	onlineToken: string
}

export interface SingleToken {
	token: string
}