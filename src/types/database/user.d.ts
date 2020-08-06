import { DBUserBase } from '../../lib/types/database/user';

export interface DBGuest extends DBUserBase {
	available: boolean
}

export interface RemoteToken {
	token: string,
	username: string
}