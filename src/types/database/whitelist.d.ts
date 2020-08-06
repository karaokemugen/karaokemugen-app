import { DBKara } from '../../lib/types/database/kara';

export interface DBWhitelist extends DBKara {
	reason: string,
	whitelisted_at: Date
}