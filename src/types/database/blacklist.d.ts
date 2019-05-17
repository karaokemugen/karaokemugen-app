import { DBKara } from "./kara";

export interface DBBLC {
	blcriteria_id: number,
	type: number,
	value: string
}

export interface DBBlacklist extends DBKara {
	blacklisted_at: Date,
	reason: string
}