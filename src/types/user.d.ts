export interface UserOpts {
	admin?: boolean;
	createRemote?: boolean;
	editRemote?: false | string; // Supply online token
	renameUser?: boolean;
	noPasswordCheck?: boolean;
}

export interface Tokens {
	token: string;
	onlineToken: string;
}

export interface SingleToken {
	token: string;
}
