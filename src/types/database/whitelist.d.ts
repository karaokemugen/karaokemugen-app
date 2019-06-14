import { DBKara } from "./kara";

export interface DBWhitelist extends DBKara {
	reason: string,
	whitelisted_at: Date
}