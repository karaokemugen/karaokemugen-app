import { DBKara } from "../../lib/types/database/kara";

export interface DBBLC {
	blcriteria_id: number,
	type: number,
	value: string,
	blc_set_id: number
}
export interface DBBlacklist extends DBKara {
	blacklisted_at: Date,
	reason: string,
	blc_id: number,
	blc_type: number
}